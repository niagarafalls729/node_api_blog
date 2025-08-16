const { DCInsideCrawlerSimple } = require('./dcinsideCrawlerSimple');

// 간소화된 크롤러 사용 예제
async function runCrawler() {
  try {
    const crawler = new DCInsideCrawlerSimple();
    
    // 시간 기준 크롤링 (최근 10분 내 게시글)
    await crawler.crawl();
    
    console.log('크롤링이 성공적으로 완료되었습니다!');
  } catch (error) {
    console.error('크롤링 실패:', error);
  }
}

// 실행
if (require.main === module) {
  runCrawler();
}

module.exports = { runCrawler };
