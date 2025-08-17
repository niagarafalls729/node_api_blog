const { dcInsideCrawler } = require('./dcinsideCrawlerSimple');

async function testSpecificPost() {
  try {
    console.log('특정 게시글 테스트 시작...');
    
    // HTML 파일에서 확인한 이미지 게시글 ID들
    const testPostIds = [356225, 356233, 356232, 356230, 356228, 356227];
    
    for (const postId of testPostIds) {
      console.log(`\n--- 게시글 ${postId} 테스트 ---`);
      
      try {
        const detail = await dcInsideCrawler.crawlPostDetail(postId);
        console.log(`이미지 개수: ${detail.imageUrls.length}`);
        console.log(`콘텐츠 길이: ${detail.content.length}`);
        
        if (detail.imageUrls.length > 0) {
          console.log('발견된 이미지들:');
          detail.imageUrls.forEach((url, index) => {
            console.log(`  ${index + 1}. ${url}`);
          });
        }
        
        // 이미지 처리 테스트
        const processedContent = await dcInsideCrawler.processImagesInContent(detail.content, postId);
        console.log(`처리된 콘텐츠 길이: ${processedContent.length}`);
        
        // 콘텐츠 미리보기 (처음 200자)
        const preview = processedContent.substring(0, 200);
        console.log(`콘텐츠 미리보기: ${preview}...`);
        
      } catch (error) {
        console.error(`게시글 ${postId} 처리 실패:`, error.message);
      }
      
      // 2초 대기
      await new Promise(resolve => setTimeout(resolve, 2000));
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
testSpecificPost();
