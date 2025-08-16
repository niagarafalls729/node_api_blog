const axios = require('axios');
const cheerio = require('cheerio');
const { imageProcessor } = require('./imageProcessor');
const { crawlerDB } = require('./database');

class DCInsideCrawler {
  constructor() {
    this.config = {
      baseUrl: 'https://gall.dcinside.com',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      timeout: 15000,
      delay: 1000, // 요청 간격 (ms)
      maxRetries: 3
    };
  }

  // 실시간베스트 게시글 목록 크롤링
  async crawlBestPosts(galleryId = 'hit', page = 1) {
    try {
      console.log(`${galleryId} 갤러리 실시간베스트 크롤링 시작...`);
      
      const url = `${this.config.baseUrl}/board/lists/?id=${galleryId}&page=${page}`;
      const response = await axios.get(url, {
        headers: { 'User-Agent': this.config.userAgent },
        timeout: this.config.timeout
      });

      const $ = cheerio.load(response.data);
      const posts = [];

      // 게시글 목록 파싱
      $('.ub-content').each((index, element) => {
        try {
          const $post = $(element);
          
          // 게시글 ID 추출
          const postLink = $post.find('.ub-word a').attr('href');
          const postId = this.extractPostId(postLink);
          
          // 제목 추출
          const title = $post.find('.ub-word a').text().trim();
          
          // 작성자 추출
          const author = $post.find('.ub-writer').text().trim();
          
          // 조회수, 추천수, 댓글수 추출
          const viewCount = this.extractNumber($post.find('.ub-view').text());
          const recommendCount = this.extractNumber($post.find('.ub-recomd').text());
          const commentCount = this.extractNumber($post.find('.ub-reply').text());
          
          // 작성일 추출
          const dateText = $post.find('.ub-date').text().trim();
          const postDate = this.parseDate(dateText);

          if (postId && title) {
            posts.push({
              postId,
              galleryId,
              title,
              author,
              viewCount,
              recommendCount,
              commentCount,
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
  async crawlPostDetail(postId, galleryId) {
    try {
      console.log(`게시글 상세 크롤링: ${postId}`);
      
      const url = `${this.config.baseUrl}/board/view/?id=${galleryId}&no=${postId}`;
      const response = await axios.get(url, {
        headers: { 'User-Agent': this.config.userAgent },
        timeout: this.config.timeout
      });

      const $ = cheerio.load(response.data);
      
      // 게시글 내용 추출
      const content = $('.write_div').html();
      
      // 이미지 URL 추출
      const imageUrls = [];
      $('.write_div img').each((index, element) => {
        const src = $(element).attr('src');
        if (src && this.isValidImageUrl(src)) {
          imageUrls.push(this.normalizeImageUrl(src));
        }
      });

      // 댓글 추출
      const comments = await this.crawlComments(postId, galleryId);

      return {
        postId,
        galleryId,
        content,
        imageUrls,
        comments,
        crawledAt: new Date()
      };
    } catch (error) {
      console.error('게시글 상세 크롤링 실패:', error);
      throw error;
    }
  }

  // 댓글 크롤링
  async crawlComments(postId, galleryId) {
    try {
      const url = `${this.config.baseUrl}/board/view/?id=${galleryId}&no=${postId}`;
      const response = await axios.get(url, {
        headers: { 'User-Agent': this.config.userAgent },
        timeout: this.config.timeout
      });

      const $ = cheerio.load(response.data);
      const comments = [];

      $('.comment_list .comment_item').each((index, element) => {
        try {
          const $comment = $(element);
          
          const commentId = $comment.attr('data-comment-id');
          const author = $comment.find('.comment_nick').text().trim();
          const content = $comment.find('.comment_text').text().trim();
          const dateText = $comment.find('.comment_date').text().trim();
          const recommendCount = this.extractNumber($comment.find('.comment_reply').text());
          
          // 대댓글 여부 확인
          const isReply = $comment.hasClass('comment_reply_item');
          const parentCommentId = isReply ? $comment.closest('.comment_item').attr('data-comment-id') : null;

          if (commentId && content) {
            comments.push({
              commentId,
              postId,
              parentCommentId,
              author,
              content,
              recommendCount,
              commentDate: this.parseDate(dateText),
              crawledAt: new Date()
            });
          }
        } catch (error) {
          console.error('댓글 파싱 오류:', error);
        }
      });

      return comments;
    } catch (error) {
      console.error('댓글 크롤링 실패:', error);
      return [];
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
    
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    return imageExtensions.some(ext => url.toLowerCase().includes(ext));
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
    try {
      // 디시인사이드 날짜 형식: "2024.01.15 14:30" 또는 "01-15 14:30"
      if (dateText.includes('.')) {
        return new Date(dateText.replace(/\./g, '-'));
      } else if (dateText.includes('-')) {
        const currentYear = new Date().getFullYear();
        return new Date(`${currentYear}-${dateText}`);
      }
      return new Date();
    } catch (error) {
      console.error('날짜 파싱 오류:', error);
      return new Date();
    }
  }

  // 데이터베이스에 게시글 저장
  async savePostToDatabase(postData) {
    try {
      const connection = await crawlerDB.connect();
      
      // 게시글 저장
      const postSql = `
        INSERT INTO DC_POSTS (
          POST_ID, GALLERY_ID, TITLE, AUTHOR, CONTENT, 
          VIEW_COUNT, RECOMMEND_COUNT, COMMENT_COUNT, 
          POST_URL, POST_DATE, CRAWLED_AT
        ) VALUES (
          :postId, :galleryId, :title, :author, :content,
          :viewCount, :recommendCount, :commentCount,
          :postUrl, :postDate, :crawledAt
        )
      `;

      const postBinds = {
        postId: postData.postId,
        galleryId: postData.galleryId,
        title: postData.title,
        author: postData.author,
        content: postData.content,
        viewCount: postData.viewCount,
        recommendCount: postData.recommendCount,
        commentCount: postData.commentCount,
        postUrl: postData.postUrl,
        postDate: postData.postDate,
        crawledAt: postData.crawledAt
      };

      await connection.execute(postSql, postBinds);
      await connection.commit();

      // 이미지 처리
      if (postData.imageUrls && postData.imageUrls.length > 0) {
        await this.processPostImages(postData.postId, postData.imageUrls);
      }

      // 댓글 저장
      if (postData.comments && postData.comments.length > 0) {
        await this.saveCommentsToDatabase(postData.comments);
      }

      await connection.close();
      console.log(`게시글 ${postData.postId} 저장 완료`);
    } catch (error) {
      console.error('게시글 저장 실패:', error);
      throw error;
    }
  }

  // 이미지 처리
  async processPostImages(postId, imageUrls) {
    try {
      console.log(`게시글 ${postId}의 ${imageUrls.length}개 이미지 처리 시작`);
      
      // 중요 이미지 판별 (첫 번째 이미지나 특정 조건)
      const importantImageUrls = imageUrls.slice(0, 1); // 첫 번째 이미지만 중요 이미지로 설정
      
      const results = await imageProcessor.processPostImages(
        postId, 
        imageUrls, 
        importantImageUrls
      );

      console.log(`이미지 처리 완료: ${results.filter(r => r.processed).length}/${results.length}`);
      return results;
    } catch (error) {
      console.error('이미지 처리 실패:', error);
      throw error;
    }
  }

  // 댓글을 데이터베이스에 저장
  async saveCommentsToDatabase(comments) {
    try {
      const connection = await crawlerDB.connect();
      
      for (const comment of comments) {
        const commentSql = `
          INSERT INTO DC_COMMENTS (
            COMMENT_ID, POST_ID, PARENT_COMMENT_ID, AUTHOR, 
            CONTENT, RECOMMEND_COUNT, COMMENT_DATE, CRAWLED_AT
          ) VALUES (
            :commentId, :postId, :parentCommentId, :author,
            :content, :recommendCount, :commentDate, :crawledAt
          )
        `;

        const commentBinds = {
          commentId: comment.commentId,
          postId: comment.postId,
          parentCommentId: comment.parentCommentId,
          author: comment.author,
          content: comment.content,
          recommendCount: comment.recommendCount,
          commentDate: comment.commentDate,
          crawledAt: comment.crawledAt
        };

        await connection.execute(commentSql, commentBinds);
      }

      await connection.commit();
      await connection.close();
      console.log(`${comments.length}개의 댓글 저장 완료`);
    } catch (error) {
      console.error('댓글 저장 실패:', error);
      throw error;
    }
  }

  // 전체 크롤링 프로세스
  async crawlGallery(galleryId, maxPages = 1) {
    try {
      console.log(`${galleryId} 갤러리 크롤링 시작 (최대 ${maxPages}페이지)`);
      
      const allPosts = [];
      
      for (let page = 1; page <= maxPages; page++) {
        console.log(`${page}페이지 크롤링 중...`);
        
        // 게시글 목록 크롤링
        const posts = await this.crawlBestPosts(galleryId, page);
        
        // 각 게시글의 상세 내용 크롤링
        for (const post of posts) {
          try {
            const postDetail = await this.crawlPostDetail(post.postId, galleryId);
            
            // 데이터 병합
            const fullPostData = {
              ...post,
              ...postDetail
            };
            
            // 데이터베이스에 저장
            await this.savePostToDatabase(fullPostData);
            allPosts.push(fullPostData);
            
            // 요청 간격 조절
            await this.delay(this.config.delay);
          } catch (error) {
            console.error(`게시글 ${post.postId} 처리 실패:`, error);
          }
        }
        
        // 페이지 간 간격
        if (page < maxPages) {
          await this.delay(this.config.delay * 2);
        }
      }
      
      console.log(`${galleryId} 갤러리 크롤링 완료: ${allPosts.length}개 게시글`);
      return allPosts;
    } catch (error) {
      console.error('갤러리 크롤링 실패:', error);
      throw error;
    }
  }

  // 지연 함수
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 싱글톤 인스턴스
const dcInsideCrawler = new DCInsideCrawler();

module.exports = {
  DCInsideCrawler,
  dcInsideCrawler
};

