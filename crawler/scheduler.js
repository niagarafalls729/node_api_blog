const cron = require('node-cron');
const { DCInsideCrawlerSimple } = require('./dcinsideCrawlerSimple');

class CrawlerScheduler {
  constructor() {
    this.crawler = new DCInsideCrawlerSimple();
    this.isRunning = false;
  }

  // 스케줄러 시작
  start() {
    console.log('=== 크롤링 스케줄러 시작 ===');
    console.log('매 10분마다 실시간베스트 크롤링을 실행합니다.');
    
    // 매 10분마다 실행 (0, 10, 20, 30, 40, 50분)
    cron.schedule('*/10 * * * *', async () => {
      await this.runCrawling();
    }, {
      scheduled: true,
      timezone: "Asia/Seoul"
    });

    // 즉시 첫 번째 크롤링 실행
    this.runCrawling();
  }

  // 크롤링 실행
  async runCrawling() {
    if (this.isRunning) {
      console.log('이전 크롤링이 아직 실행 중입니다. 건너뜁니다.');
      return;
    }

    try {
      this.isRunning = true;
      const startTime = new Date();
      
      console.log(`\n🕐 크롤링 시작: ${startTime.toLocaleString('ko-KR')}`);
      
      await this.crawler.crawl();
      
      const endTime = new Date();
      const duration = Math.round((endTime - startTime) / 1000);
      
      console.log(`✅ 크롤링 완료: ${endTime.toLocaleString('ko-KR')} (소요시간: ${duration}초)`);
      
    } catch (error) {
      console.error('❌ 크롤링 실패:', error);
    } finally {
      this.isRunning = false;
    }
  }

  // 스케줄러 중지
  stop() {
    console.log('크롤링 스케줄러를 중지합니다.');
    process.exit(0);
  }
}

// 스케줄러 인스턴스 생성 및 시작
const scheduler = new CrawlerScheduler();

// Ctrl+C로 종료 처리
process.on('SIGINT', () => {
  console.log('\n스케줄러를 종료합니다...');
  scheduler.stop();
});

// 스케줄러 시작
scheduler.start();

module.exports = { CrawlerScheduler };
