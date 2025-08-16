const axios = require('axios');
const cheerio = require('cheerio');
const { imageProcessor } = require('./imageProcessor');
const { crawlerDB, oracledb } = require('./database');
const CRAWLER_CONFIG = require('./config');

class DCInsideCrawlerSimple {
  constructor() {
    this.config = {
      baseUrl: 'https://gall.dcinside.com',
      galleryId: CRAWLER_CONFIG.GALLERY_ID,
      userAgent: CRAWLER_CONFIG.USER_AGENT,
      timeout: CRAWLER_CONFIG.TIMEOUT,
      delay: CRAWLER_CONFIG.DELAY,
      maxRetries: CRAWLER_CONFIG.MAX_RETRIES,
      timeWindow: CRAWLER_CONFIG.TIME_WINDOW,
      maxPages: CRAWLER_CONFIG.MAX_PAGES,
      checkDuplicate: CRAWLER_CONFIG.CHECK_DUPLICATE,
      useTimeFilter: CRAWLER_CONFIG.USE_TIME_FILTER
    };
  }

  // 실시간베스트 게시글 목록 크롤링 (시간 기준)
  async crawlBestPosts(page = 1) {
    try {
      console.log(`실시간베스트 크롤링 시작... (페이지: ${page})`);
      
      const url = `${this.config.baseUrl}/board/lists/?id=${this.config.galleryId}&page=${page}`;
      const response = await axios.get(url, {
        headers: { 'User-Agent': this.config.userAgent },
        timeout: this.config.timeout
      });

      const $ = cheerio.load(response.data);
      const posts = [];
      
      // 시간 기준 계산 (최근 N분) - 선택적 사용
      let timeThreshold = null;
      if (this.config.useTimeFilter) {
        timeThreshold = new Date();
        timeThreshold.setMinutes(timeThreshold.getMinutes() - this.config.timeWindow);
        console.log(`시간 기준: ${timeThreshold.toLocaleString('ko-KR')} 이후 게시글만 수집`);
      } else {
        console.log('시간 필터 비활성화: 페이지 순서로 최신 게시글 판단');
      }

      // 게시글 목록 파싱
      $('.ub-content').each((index, element) => {
        try {
          const $post = $(element);
          
          // 게시글 ID 추출
          const postLink = $post.find('.ub-word a').attr('href');
          const postId = this.extractPostId(postLink);
          
                     // 제목 추출 (댓글 수 제거)
           let title = $post.find('.ub-word a').text().trim();
                       // 댓글 수 [숫자] 또는 [숫자/숫자] 제거
            title = title.replace(/\[\d+(?:\/\d+)?\]$/, '').trim();
          
          // 작성자 추출
          const author = $post.find('.ub-writer').text().trim();
          
          // 조회수만 추출 (추천수 제거)
          const viewCount = this.extractNumber($post.find('.ub-view').text());
          
          // 작성일 추출
          const dateText = $post.find('.ub-date').text().trim();
          const postDate = this.parseDate(dateText);

          // 시간 기준 필터링 (선택적)
          if (this.config.useTimeFilter && timeThreshold && dateText && dateText.trim() && postDate < timeThreshold) {
            console.log(`시간 기준 제외: ${title} (${postDate.toLocaleString('ko-KR')})`);
            return; // 이 게시글은 건너뛰기
          }

          if (postId && title) {
            posts.push({
              postId,
              title,
              author,
              viewCount,
              postDate,
              postUrl: `${this.config.baseUrl}${postLink}`,
              crawledAt: new Date()
            });
          }
        } catch (error) {
          console.error('게시글 파싱 오류:', error);
        }
      });

      console.log(`${posts.length}개의 게시글을 크롤링했습니다.`);
      return posts;
    } catch (error) {
      console.error('실시간베스트 크롤링 실패:', error);
      throw error;
    }
  }

  // 개별 게시글 상세 내용 크롤링
  async crawlPostDetail(postId) {
    try {
      console.log(`게시글 상세 크롤링: ${postId}`);
      
      const url = `${this.config.baseUrl}/board/view/?id=${this.config.galleryId}&no=${postId}`;
      const response = await axios.get(url, {
        headers: { 'User-Agent': this.config.userAgent },
        timeout: this.config.timeout
      });

      const $ = cheerio.load(response.data);
      
      // 게시글 내용 추출
      const content = $('.write_div').html();
      console.log(`게시글 내용 길이: ${content ? content.length : 0}`);
      console.log(`게시글 내용 미리보기: ${content ? content.substring(0, 200) : 'null'}`);
      
      // 이미지 URL 추출
      const imageUrls = [];
      $('.write_div img').each((index, element) => {
        const src = $(element).attr('src');
        if (src && this.isValidImageUrl(src)) {
          const normalizedUrl = this.normalizeImageUrl(src);
          imageUrls.push(normalizedUrl);
        }
      });

      return {
        postId,
        content,
        imageUrls,
        crawledAt: new Date()
      };
    } catch (error) {
      console.error('게시글 상세 크롤링 실패:', error);
      throw error;
    }
  }

  // 이미지 URL 정규화
  normalizeImageUrl(url) {
    if (url.startsWith('//')) {
      return `https:${url}`;
    } else if (url.startsWith('/')) {
      return `${this.config.baseUrl}${url}`;
    }
    return url;
  }

  // 이미지 URL 유효성 검사
  isValidImageUrl(url) {
    if (!url) return false;
    
    // 로딩 이미지 제외
    if (url.includes('loading') || url.includes('gallview_loading')) {
      return false;
    }
    
    // 디시인사이드 이미지 URL 체크
    if (url.includes('dcimg') || url.includes('dcinside.co.kr') || url.includes('image.dcinside.com')) {
      return true;
    }
    
    // 일반 이미지 확장자 체크
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    return imageExtensions.some(ext => url.toLowerCase().includes(ext));
  }

  // 이미지 처리 및 로컬 저장
  async processAndReplaceImage(imageUrl, postId, index) {
    try {
      console.log(`이미지 처리 중: ${imageUrl}`);
      
      // 이미지 다운로드 및 로컬 저장
      const imageInfo = await imageProcessor.processImageHybrid(imageUrl, postId, false);
      
      if (imageInfo.processed && imageInfo.localPath) {
        console.log(`이미지 로컬 저장 완료: ${imageInfo.fileName}`);
        return imageInfo;
      } else {
        console.log(`이미지 로컬 저장 실패: ${imageUrl}`);
        return null;
      }
    } catch (error) {
      console.error(`이미지 처리 실패 (${imageUrl}):`, error);
      return null;
    }
  }

  // HTML 내용에서 이미지 처리
  async processImagesInContent(content, postId) {
    try {
      if (!content) return content;
      
      const $ = cheerio.load(content);
      let processedContent = content;
      
      // 모든 이미지 태그 찾기
      const imgElements = $('img');
      console.log(`이미지 태그 ${imgElements.length}개 발견`);
      
      for (let i = 0; i < imgElements.length; i++) {
        const img = $(imgElements[i]);
        const src = img.attr('src');
        
        if (src && this.isValidImageUrl(src)) {
          const normalizedUrl = this.normalizeImageUrl(src);
          console.log(`이미지 처리 중 (${i + 1}/${imgElements.length}): ${normalizedUrl}`);
          
          try {
            // 이미지 다운로드 및 로컬 저장
            const imageInfo = await imageProcessor.processImageHybrid(normalizedUrl, postId, false);
            
                         if (imageInfo && imageInfo.processed && imageInfo.localPath) {
               // HTML에서 이미지 경로 교체
               const originalImgTag = img.prop('outerHTML');
               const newImgTag = `<img src="/crawled_images/${imageInfo.fileName}" alt="크롤링된 이미지" />`;
               processedContent = processedContent.replace(originalImgTag, newImgTag);
               
               console.log(`✅ 이미지 경로 교체 완료: ${imageInfo.fileName}`);
             } else {
               console.log(`❌ 이미지 로컬 저장 실패: ${normalizedUrl}`);
               // 로컬 저장 실패 시 원본 URL 유지 (이미지가 보이도록)
               console.log(`원본 URL 유지: ${normalizedUrl}`);
             }
          } catch (error) {
            console.error(`이미지 처리 실패 (${normalizedUrl}):`, error.message);
          }
        } else {
          console.log(`유효하지 않은 이미지 URL 건너뛰기: ${src}`);
        }
      }
      
      return processedContent;
    } catch (error) {
      console.error('이미지 처리 중 오류:', error);
      return content; // 오류 시 원본 내용 반환
    }
  }

  // 게시글 ID 추출
  extractPostId(url) {
    if (!url) return null;
    const match = url.match(/no=(\d+)/);
    return match ? match[1] : null;
  }

  // 숫자 추출
  extractNumber(text) {
    if (!text) return 0;
    const match = text.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  }

  // 날짜 파싱
  parseDate(dateText) {
    if (!dateText) return new Date();
    
    try {
      console.log(`날짜 파싱: "${dateText}"`);
      
      // "2024-01-15" 형식
      if (dateText.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return new Date(dateText);
      }
      
      // "01-15" 형식 (올해)
      if (dateText.match(/^\d{2}-\d{2}$/)) {
        const year = new Date().getFullYear();
        return new Date(`${year}-${dateText}`);
      }
      
      // "12:34" 형식 (오늘)
      if (dateText.match(/^\d{2}:\d{2}$/)) {
        const today = new Date();
        const [hours, minutes] = dateText.split(':');
        today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        return today;
      }
      
      // 시간 정보가 없는 경우 현재 시간으로 설정
      console.log(`시간 정보 없음, 현재 시간으로 설정: ${dateText}`);
      return new Date();
    } catch (error) {
      console.error('날짜 파싱 오류:', error);
      return new Date();
    }
  }

  // 데이터베이스에 저장
  async saveToDatabase(posts) {
    try {
      console.log('데이터베이스 저장 시작...');
      
      let savedCount = 0;
      let skippedCount = 0;
      
      for (const post of posts) {
        try {
          // 중복 체크
          if (this.config.checkDuplicate) {
            const isDuplicate = await this.checkDuplicate(post.postId);
            if (isDuplicate) {
              console.log(`중복 게시글 건너뛰기: ${post.title} (ID: ${post.postId})`);
              skippedCount++;
              continue;
            }
          }
          
          // 상세 내용 크롤링
          const detail = await this.crawlPostDetail(post.postId);
          
          // 이미지 처리 및 HTML 수정
          const processedContent = await this.processImagesInContent(detail.content, post.postId);
          
          // 게시글과 내용을 한 번에 저장
          await this.savePostWithContent(post, processedContent);
          
          savedCount++;
          console.log(`새 게시글 저장 완료: ${post.title}`);
          
        } catch (error) {
          console.error(`게시글 저장 실패 (${post.postId}):`, error);
        }
        
        // 요청 간격 조절
        await this.delay(this.config.delay);
      }
      
      console.log(`저장 완료: ${savedCount}개 새 게시글, ${skippedCount}개 중복 건너뛰기`);
    } catch (error) {
      console.error('데이터베이스 저장 실패:', error);
      throw error;
    }
  }

  // 중복 체크
  async checkDuplicate(postId) {
    try {
      if (!crawlerDB.connection) {
        await crawlerDB.connect();
      }

      const checkQuery = `
        SELECT COUNT(*) as count FROM DC_BEST_POSTS WHERE POST_ID = :postId
      `;
      
      const checkResult = await crawlerDB.connection.execute(checkQuery, {
        postId: postId
      });
      
      return checkResult.rows[0][0] > 0;
    } catch (error) {
      console.error('중복 체크 실패:', error);
      return false;
    }
  }

  // 게시글과 내용을 한 번에 저장
  async savePostWithContent(post, content) {
    try {
      if (!crawlerDB.connection) {
        await crawlerDB.connect();
      }

      const query = `
        INSERT INTO DC_BEST_POSTS (POST_ID, TITLE, AUTHOR, CONTENT, POST_URL, POST_DATE, VIEW_COUNT, CRAWLED_AT)
        VALUES (:postId, :title, :author, :content, :postUrl, :postDate, :viewCount, :crawledAt)
      `;
      
      await crawlerDB.connection.execute(query, {
        postId: post.postId,
        title: post.title,
        author: post.author,
        content: { val: content || '', type: oracledb.CLOB },
        postUrl: post.postUrl,
        postDate: post.postDate,
        viewCount: post.viewCount,
        crawledAt: post.crawledAt
      });
      
      await crawlerDB.connection.commit();
    } catch (error) {
      console.error('게시글 저장 실패:', error);
      throw error;
    }
  }





  // 지연 함수
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // crawlGallery 메서드 추가 (index.js 호환성)
  async crawlGallery(galleryId = CRAWLER_CONFIG.GALLERY_ID, maxPages = CRAWLER_CONFIG.MAX_PAGES) {
    try {
      console.log(`디시인사이드 ${galleryId} 갤러리 크롤링 시작 (최대 ${maxPages}페이지)`);
      
      // 설정 업데이트
      this.config.galleryId = galleryId;
      this.config.maxPages = maxPages;
      
      let allPosts = [];
      
      for (let page = 1; page <= maxPages; page++) {
        console.log(`\n--- ${page}페이지 크롤링 중 ---`);
        
        // 게시글 목록 크롤링
        const posts = await this.crawlBestPosts(page);
        
        if (posts.length === 0) {
          console.log('더 이상 게시글이 없습니다.');
          break;
        }
        
        // 각 게시글의 상세 내용 크롤링
        for (const post of posts) {
          try {
            console.log(`게시글 상세 크롤링: ${post.postId}`);
            
            // 중복 체크
            if (this.config.checkDuplicate && await this.checkDuplicate(post.postId)) {
              console.log(`중복 게시글 건너뛰기: ${post.postId}`);
              continue;
            }
            
                         // 게시글 상세 내용 크롤링
             const content = await this.crawlPostDetail(post.postId);
             
             // 이미지 처리
             const processedContent = await this.processImagesInContent(content.content, post.postId);
             
             // 데이터베이스에 저장
             await this.savePostWithContent(post, processedContent);
            
            console.log(`게시글 저장 완료: ${post.postId}`);
            
            // 요청 간격 대기
            await this.delay(this.config.delay);
            
          } catch (error) {
            console.error(`게시글 ${post.postId} 처리 실패:`, error);
          }
        }
        
        allPosts = allPosts.concat(posts);
        console.log(`${page}페이지 완료! (${posts.length}개 게시글)`);
      }
      
      console.log(`\n=== ${galleryId} 갤러리 크롤링 완료 (총 ${allPosts.length}개 게시글) ===`);
      return allPosts;
      
    } catch (error) {
      console.error('크롤링 실패:', error);
      throw error;
    } finally {
      // 데이터베이스 연결 종료
      if (crawlerDB.connection) {
        await crawlerDB.close();
        console.log('데이터베이스 연결 종료');
      }
    }
  }

  // 메인 크롤링 함수 (페이지 기준)
  async crawl() {
    try {
      console.log('=== 디시인사이드 실시간베스트 크롤링 시작 ===');
      console.log(`크롤링 기준: 최대 ${this.config.maxPages}페이지 (실시간베스트 최신 게시글)`);
      
      let totalSaved = 0;
      let totalSkipped = 0;
      
      for (let page = 1; page <= this.config.maxPages; page++) {
        console.log(`\n--- ${page}페이지 크롤링 중 ---`);
        
        // 게시글 목록 크롤링
        const posts = await this.crawlBestPosts(page);
        
        if (posts.length === 0) {
          console.log('더 이상 게시글이 없습니다.');
          break;
        }
        
        // 데이터베이스에 저장
        await this.saveToDatabase(posts);
        
        console.log(`${page}페이지 완료! (${posts.length}개 게시글)`);
      }
      
      console.log('\n=== 크롤링 완료 ===');
    } catch (error) {
      console.error('크롤링 실패:', error);
      throw error;
    } finally {
      // 데이터베이스 연결 종료
      if (crawlerDB.connection) {
        await crawlerDB.close();
        console.log('데이터베이스 연결 종료');
      }
    }
  }
}

const dcInsideCrawler = new DCInsideCrawlerSimple();
module.exports = { DCInsideCrawlerSimple, dcInsideCrawler };
