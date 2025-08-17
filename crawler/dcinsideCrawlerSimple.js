const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const { crawlerDB, oracledb } = require('./database');
const { imageProcessor } = require('./imageProcessor');
const CRAWLER_CONFIG = require('../config');

class DCInsideCrawler {
  constructor() {
    this.config = {
      baseUrl: 'https://gall.dcinside.com',
      galleryId: CRAWLER_CONFIG.GALLERY_ID,
      userAgent: CRAWLER_CONFIG.USER_AGENT,
      timeout: CRAWLER_CONFIG.TIMEOUT,
      delay: CRAWLER_CONFIG.DELAY,
      maxRetries: CRAWLER_CONFIG.MAX_RETRIES,
      checkDuplicate: CRAWLER_CONFIG.CHECK_DUPLICATE,
      maxPages: CRAWLER_CONFIG.MAX_PAGES
    };
    this.browser = null;
    this.page = null;
  }

  // Puppeteer 브라우저 초기화 및 로그인
  async initBrowser() {
    try {
      console.log('🚀 Puppeteer 브라우저 시작...');
      this.browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      this.page = await this.browser.newPage();
      
      // 브라우저 설정
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
      await this.page.setViewport({ width: 1920, height: 1080 });
      
      // 로그인 수행
      console.log('🔐 디시인사이드 로그인 중...');
      await this.page.goto('https://www.dcinside.com/member/login', { waitUntil: 'networkidle2' });
      
      // 로그인 정보 입력 (실제 계정 정보로 변경 필요)
      await this.page.type('#user_id', 'your_username'); // 실제 아이디로 변경
      await this.page.type('#user_pw', 'your_password'); // 실제 비밀번호로 변경
      await this.page.click('#loginAction');
      await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      
      console.log('✅ 로그인 완료');
      return true;
    } catch (error) {
      console.error('❌ 브라우저 초기화 실패:', error.message);
      return false;
    }
  }

  // 리스트 페이지 크롤링 (Puppeteer 사용)
  async crawlBestPosts(page = 1) {
    try {
      if (!this.page) {
        console.log('⚠️ 브라우저가 초기화되지 않았습니다. axios로 대체합니다.');
        return await this.crawlBestPostsWithAxios(page);
      }

      const url = `${this.config.baseUrl}/board/lists?id=${this.config.galleryId}&page=${page}&_dcbest=6`;
      console.log(`📄 페이지 ${page} 크롤링 중: ${url}`);
      
      await this.page.goto(url, { waitUntil: 'networkidle2' });
      const html = await this.page.content();
      
      const $ = cheerio.load(html);
      const posts = [];

      console.log('🔍 게시글 파싱 중...');
      $('tr.ub-content').each((i, el) => {
        const $el = $(el);
        if ($el.hasClass('icon_notice')) return;
      
        const id = $el.attr('data-no');
        if (!id) return;
      
        // 제목 추출
        const titleEl = $el.find('td.gall_tit a').first();
        titleEl.find('em').remove(); // 댓글 수 제거
        let title = titleEl.text().trim();
      
        if (!title) {
          const thumbAlt = $el.find('td.gall_tit img').attr('alt');
          title = thumbAlt ? `[이미지] ${thumbAlt}` : '[제목없음]';
        }
      
        const writer = $el.find('td.gall_writer span.nickname em').text().trim();
        const dateStr = $el.find('td.gall_date').attr('title') || $el.find('td.gall_date').text().trim();
        const date = this.parseDate(dateStr);
        const views = this.extractNumber($el.find('td.gall_count').text());
        const recommends = this.extractNumber($el.find('td.gall_recommend').text());
      
        const post = {
          postId: id,
          title,
          author: writer || '[익명]',
          postUrl: `${this.config.baseUrl}/board/view/?id=${this.config.galleryId}&no=${id}`,
          postDate: date,
          viewCount: views,
          recommendCount: recommends
        };
        
        posts.push(post);
        console.log(`[${i+1}] ${id} - "${title}" (${writer})`);
        
        // 성인인증 게시글 확인
        if (title.includes('[ㅇㅎ]') || title.includes('[성인]')) {
          console.log(`🎯 성인인증 게시글 발견: ${title}`);
        }
      });
      
      console.log(`✅ 페이지 ${page} 완료: ${posts.length}개 게시글`);
      return posts;
      
    } catch (error) {
      console.error(`❌ 페이지 ${page} 크롤링 실패:`, error.message);
      return [];
    }
  }

  // 기존 axios 방식 (백업용)
  async crawlBestPostsWithAxios(page = 1) {
    const url = `${this.config.baseUrl}/board/lists?id=${this.config.galleryId}&page=${page}&_dcbest=6`;
    console.log("url",url)  
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7,zh-TW;q=0.6,zh;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
        'Referer': 'https://gall.dcinside.com/board/lists?id=dcbest',
        'sec-ch-ua': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"'
      },
      timeout: this.config.timeout,
    });

    const $ = cheerio.load(res.data);
    const posts = [];

    $('tr.ub-content').each((i, el) => {
      const $el = $(el);
      if ($el.hasClass('icon_notice')) return;
    
      const id = $el.attr('data-no');
      if (!id) return;
    
      // 제목 추출
      const titleEl = $el.find('td.gall_tit a').first();
      titleEl.find('em').remove(); // 댓글 수 제거
      let title = titleEl.text().trim();
    
      if (!title) {
        const thumbAlt = $el.find('td.gall_tit img').attr('alt');
        title = thumbAlt ? `[이미지] ${thumbAlt}` : '[제목없음]';
      }
    
      const writer = $el.find('td.gall_writer span.nickname em').text().trim();
      const dateStr = $el.find('td.gall_date').attr('title') || $el.find('td.gall_date').text().trim();
      const date = this.parseDate(dateStr);
      const views = this.extractNumber($el.find('td.gall_count').text());
      const recommends = this.extractNumber($el.find('td.gall_recommend').text());
    
      const post = {
        postId: id,
        title,
        author: writer || '[익명]',
        postUrl: `${this.config.baseUrl}/board/view/?id=${this.config.galleryId}&no=${id}`,
        postDate: date,
        viewCount: views,
        recommendCount: recommends
      };
      
      posts.push(post);
      console.log(`[${i+1}] ${id} - "${title}" (${writer})`);
      
      // 성인인증 게시글 확인
      if (title.includes('[ㅇㅎ]') || title.includes('[성인]')) {
        console.log(`🎯 성인인증 게시글 발견: ${title}`);
      }
    });
    
    return posts;
  }

  // 상세 페이지 크롤링
  async crawlPostDetail(postId) {
    try {
      const url = `${this.config.baseUrl}/board/view/?id=${this.config.galleryId}&no=${postId}`;
      const res = await axios.get(url, {
        headers: { 'User-Agent': this.config.userAgent },
        timeout: this.config.timeout
      });
      const $ = cheerio.load(res.data);

      const content = $('.write_div').html() || '';
      const imageUrls = [];

      $('.write_div img').each((i, img) => {
        const src = $(img).attr('src');
        if (this.isValidImageUrl(src)) imageUrls.push(this.normalizeImageUrl(src));
      });

      return { postId, content, imageUrls, crawledAt: new Date() };
    } catch (err) {
      console.error(`게시글 상세 크롤링 실패 (${postId}):`, err.message);
      return { postId, content: '', imageUrls: [], crawledAt: new Date() };
    }
  }

  normalizeImageUrl(url) {
    if (!url) return '';
    if (url.startsWith('//')) return `https:${url}`;
    if (url.startsWith('/')) return `${this.config.baseUrl}${url}`;
    return url;
  }

  isValidImageUrl(url) {
    if (!url) return false;
    const invalid = ['loading', 'gallview_loading'];
    if (invalid.some(i => url.includes(i))) return false;
    
    // dcimg URL도 허용 (실제 이미지 URL)
    if (url.includes('dcimg') || url.includes('dcinside.co.kr')) {
      return true;
    }
    
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  }

  async processImagesInContent(content, postId) {
    if (!content) return content;
    const $ = cheerio.load(content);
    let processedContent = content;

    for (const img of $('img').toArray()) {
      let imageUrl = $(img).attr('src');
      const dataOriginal = $(img).attr('data-original');
      
      // data-original이 있으면 그것을 우선 사용 (실제 이미지 URL)
      if (dataOriginal && this.isValidImageUrl(dataOriginal)) {
        imageUrl = dataOriginal;
      }
      
      // src가 로딩 이미지인 경우 data-original 사용
      if (imageUrl && imageUrl.includes('gallview_loading_ori.gif') && dataOriginal) {
        imageUrl = dataOriginal;
      }
      
      if (!imageUrl || !this.isValidImageUrl(imageUrl)) continue;
      const normalizedUrl = this.normalizeImageUrl(imageUrl);

      try {
        console.log(`이미지 처리 중: ${normalizedUrl}`);
        const imageInfo = await imageProcessor.processImageHybrid(normalizedUrl, postId, false);
        if (imageInfo?.processed && imageInfo.localPath) {
          const originalTag = $.html(img);
          const newTag = `<img src="/crawled_images/${imageInfo.fileName}" alt="크롤링된 이미지" onerror="this.style.display='none';" />`;
          processedContent = processedContent.replace(originalTag, newTag);
          console.log(`이미지 처리 완료: ${imageInfo.fileName}`);
        }
      } catch (err) {
        console.error(`이미지 처리 실패 (${normalizedUrl}):`, err.message);
      }
    }
    return processedContent;
  }

  extractNumber(text) {
    if (!text) return 0;
    const match = text.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  parseDate(dateText) {
    if (!dateText) return new Date();
    if (/^\d{4}-\d{2}-\d{2}/.test(dateText)) return new Date(dateText);
    if (/^\d{2}-\d{2}$/.test(dateText)) {
      const year = new Date().getFullYear();
      return new Date(`${year}-${dateText}`);
    }
    if (/^\d{2}:\d{2}$/.test(dateText)) {
      const today = new Date();
      const [h, m] = dateText.split(':').map(Number);
      today.setHours(h, m, 0, 0);
      return today;
    }
    return new Date();
  }

  async checkDuplicate(postId) {
    try {
      if (!crawlerDB.connection) await crawlerDB.connect();
      const query = `SELECT COUNT(*) as count FROM DC_BEST_POSTS WHERE POST_ID = :postId`;
      const result = await crawlerDB.connection.execute(query, { postId });
      return result.rows[0][0] > 0;
    } catch (err) {
      console.error('중복 체크 실패:', err.message);
      return false;
    }
  }

  async savePostWithContent(post, content) {
    try {
      if (!crawlerDB.connection) await crawlerDB.connect();
      const query = `
        INSERT INTO DC_BEST_POSTS
        (POST_ID, TITLE, AUTHOR, CONTENT, POST_URL, POST_DATE, VIEW_COUNT, CRAWLED_AT)
        VALUES
        (:postId, :title, :author, :content, :postUrl, :postDate, :viewCount, :crawledAt)
      `;
      await crawlerDB.connection.execute(query, {
        postId: post.postId,
        title: post.title,
        author: post.author,
        content: { val: content || '', type: oracledb.CLOB },
        postUrl: post.postUrl,
        postDate: post.postDate,
        viewCount: post.viewCount,
        crawledAt: new Date()
      });
      await crawlerDB.connection.commit();
    } catch (err) {
      console.error(`게시글 저장 실패 (${post.postId}):`, err.message);
    }
  }

  async saveToDatabase(posts) {
    for (const post of posts) {
      try {
        if (this.config.checkDuplicate && await this.checkDuplicate(post.postId)) {
          console.log(`중복 건너뛰기: ${post.postId}`);
          continue;
        }
        const detail = await this.crawlPostDetail(post.postId);
        const content = await this.processImagesInContent(detail.content, post.postId);
        await this.savePostWithContent(post, content);
        await this.delay(this.config.delay);
      } catch (err) {
        console.error(`게시글 처리 실패 (${post.postId}):`, err.message);
      }
    }
  }

  delay(ms) {
    return new Promise(res => setTimeout(res, ms));
  }

  async crawlGallery(maxPages = this.config.maxPages) {
    let allPosts = [];
    try {
      // 브라우저 초기화 시도
      const browserInitialized = await this.initBrowser();
      
      for (let page = 1; page <= maxPages; page++) {
        console.log(`\n--- ${page}페이지 크롤링 ---`);
        const posts = await this.crawlBestPosts(page);
        if (!posts.length) break;
        await this.saveToDatabase(posts);
        allPosts = allPosts.concat(posts);
      }
    } catch (err) {
      console.error('크롤링 실패:', err.message);
    } finally {
      if (this.browser) {
        await this.browser.close();
        console.log('🔌 브라우저 종료');
      }
      if (crawlerDB.connection) await crawlerDB.close();
      console.log('데이터베이스 연결 종료');
    }
    console.log(`총 ${allPosts.length}개 게시글 크롤링 완료`);
    return allPosts;
  }
}

const dcInsideCrawler = new DCInsideCrawler();
module.exports = { DCInsideCrawler, dcInsideCrawler };
