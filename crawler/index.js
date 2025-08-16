const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');
const { crawlerDB } = require('./database');
const { dcInsideCrawler } = require('./dcinsideCrawlerSimple');
const { imageProcessor } = require('./imageProcessor');
const CRAWLER_CONFIG = require('./config');

const router = express.Router();

// 크롤링 기본 설정
const CRAWLER_CONFIG = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  timeout: 10000,
  retryCount: 3
};

// 기본 크롤링 함수
async function crawlWebsite(url, selector = null) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': CRAWLER_CONFIG.userAgent
      },
      timeout: CRAWLER_CONFIG.timeout
    });

    const $ = cheerio.load(response.data);
    
    if (selector) {
      return $(selector);
    }
    
    return $;
  } catch (error) {
    console.error('크롤링 오류:', error.message);
    throw error;
  }
}

// 크롤링 결과를 데이터베이스에 저장하는 함수
async function saveCrawledData(url, selector, dataType, data) {
  try {
    await crawlerDB.saveCrawledData(url, selector, dataType, data);
  } catch (error) {
    console.error('크롤링 데이터 저장 실패:', error);
    throw error;
  }
}

// API 엔드포인트: 수동 크롤링 실행
router.post('/crawl', async (req, res) => {
  try {
    const { url, selector, dataType, saveToDB = false } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL이 필요합니다.' });
    }

    const crawledData = await crawlWebsite(url, selector);
    
    if (saveToDB) {
      await saveCrawledData(url, selector, dataType || 'general', crawledData);
    }

    res.json({
      success: true,
      data: crawledData,
      message: '크롤링이 완료되었습니다.'
    });
  } catch (error) {
    res.status(500).json({
      error: '크롤링 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// 스케줄링된 크롤링 설정
function setupScheduledCrawling() {
  // 매일 오전 9시에 실행
  cron.schedule('0 9 * * *', async () => {
    console.log('스케줄된 크롤링 실행 중...');
    // TODO: 스케줄링된 크롤링 로직 구현
  });
}

// 크롤링 상태 확인
router.get('/status', (req, res) => {
  res.json({
    status: 'running',
    lastCrawl: new Date().toISOString(),
    config: CRAWLER_CONFIG
  });
});

// 크롤링 데이터 조회
router.get('/data', async (req, res) => {
  try {
    const { limit = 10, offset = 0, url } = req.query;
    
    let data;
    if (url) {
      data = await crawlerDB.getCrawledDataByUrl(url);
    } else {
      data = await crawlerDB.getCrawledData(parseInt(limit), parseInt(offset));
    }
    
    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    res.status(500).json({
      error: '데이터 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// 오래된 크롤링 데이터 삭제
router.delete('/cleanup', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const result = await crawlerDB.deleteOldCrawledData(parseInt(days));
    
    res.json({
      success: true,
      message: `${result.deletedCount}개의 오래된 데이터가 삭제되었습니다.`
    });
  } catch (error) {
    res.status(500).json({
      error: '데이터 정리 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// 디시인사이드 실시간베스트 크롤링
router.post('/dcinside/best', async (req, res) => {
  try {
    const { galleryId = CRAWLER_CONFIG.GALLERY_ID, maxPages = CRAWLER_CONFIG.MAX_PAGES } = req.body;
    
    console.log(`디시인사이드 ${galleryId} 갤러리 크롤링 시작`);
    
    const posts = await dcInsideCrawler.crawlGallery(galleryId, maxPages);
    
    res.json({
      success: true,
      message: `${galleryId} 갤러리 크롤링 완료`,
      data: {
        galleryId,
        totalPosts: posts.length,
        posts: posts.slice(0, 10) // 처음 10개만 반환
      }
    });
  } catch (error) {
    res.status(500).json({
      error: '디시인사이드 크롤링 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// 디시인사이드 게시글 상세 크롤링
router.post('/dcinside/post', async (req, res) => {
  try {
    const { postId, galleryId = CRAWLER_CONFIG.GALLERY_ID } = req.body;
    
    if (!postId) {
      return res.status(400).json({ error: '게시글 ID가 필요합니다.' });
    }
    
    const postDetail = await dcInsideCrawler.crawlPostDetail(postId, galleryId);
    await dcInsideCrawler.savePostToDatabase(postDetail);
    
    res.json({
      success: true,
      message: '게시글 크롤링 완료',
      data: postDetail
    });
  } catch (error) {
    res.status(500).json({
      error: '게시글 크롤링 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// 이미지 처리 통계 조회
router.get('/images/stats', async (req, res) => {
  try {
    const stats = await imageProcessor.getImageStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      error: '이미지 통계 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// 오래된 이미지 정리
router.delete('/images/cleanup', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const deletedCount = await imageProcessor.cleanupOldImages(parseInt(days));
    
    res.json({
      success: true,
      message: `${deletedCount}개의 오래된 이미지가 삭제되었습니다.`
    });
  } catch (error) {
    res.status(500).json({
      error: '이미지 정리 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

module.exports = {
  router,
  crawlWebsite,
  setupScheduledCrawling
};
