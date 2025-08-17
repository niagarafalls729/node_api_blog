const { dcInsideCrawler } = require('./dcinsideCrawlerSimple');

async function testImageOnlyCrawling() {
  try {
    console.log('이미지만 있는 게시글 크롤링 테스트 시작...');
    
    // 1페이지만 테스트
    const posts = await dcInsideCrawler.crawlBestPosts(1);
    console.log(`총 ${posts.length}개 게시글 발견`);
    
    // 처음 3개 게시글만 상세 크롤링 테스트
    for (let i = 0; i < Math.min(3, posts.length); i++) {
      const post = posts[i];
      console.log(`\n--- 게시글 ${i + 1} 테스트 ---`);
      console.log(`ID: ${post.id}`);
      console.log(`제목: ${post.title}`);
      console.log(`작성자: ${post.writer}`);
      
      const detail = await dcInsideCrawler.crawlPostDetail(post.id);
      console.log(`이미지 개수: ${detail.imageUrls.length}`);
      console.log(`콘텐츠 길이: ${detail.content.length}`);
      
      if (detail.imageUrls.length > 0) {
        console.log('발견된 이미지들:');
        detail.imageUrls.forEach((url, index) => {
          console.log(`  ${index + 1}. ${url}`);
        });
      }
      
      // 이미지 처리 테스트
      const processedContent = await dcInsideCrawler.processImagesInContent(detail.content, post.id);
      console.log(`처리된 콘텐츠 길이: ${processedContent.length}`);
      
      // 1초 대기
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n테스트 완료!');
    
  } catch (error) {
    console.error('테스트 중 오류 발생:', error);
  } finally {
    // 데이터베이스 연결 종료
    const { crawlerDB } = require('./database');
    if (crawlerDB.connection) {
      await crawlerDB.close();
      console.log('데이터베이스 연결 종료');
    }
  }
}

// 테스트 실행
testImageOnlyCrawling();
