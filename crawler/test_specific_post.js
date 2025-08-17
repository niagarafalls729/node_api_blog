const { DCInsideCrawler } = require('./dcinsideCrawlerSimple');
const { crawlerDB } = require('./database');

async function testSpecificPost() {
  const dcInsideCrawler = new DCInsideCrawler();
  const postId = '356375'; // 테스트할 게시글 ID

  try {
    console.log(`게시글 ${postId} 크롤링 시작...`);
    
    // 게시글 상세 정보 크롤링
    const detail = await dcInsideCrawler.crawlPostDetail(postId);
    console.log('원본 내용 길이:', detail.content?.length || 0);
    
    // 이미지 처리 전 내용 출력 (처음 500자)
    console.log('이미지 처리 전 내용 (처음 500자):');
    console.log(detail.content?.substring(0, 500));
    
    // 이미지 처리
    const processedContent = await dcInsideCrawler.processImagesInContent(detail.content, postId);
    console.log('이미지 처리 후 내용 길이:', processedContent?.length || 0);
    
    // 이미지 처리 후 내용 출력 (처음 500자)
    console.log('이미지 처리 후 내용 (처음 500자):');
    console.log(processedContent?.substring(0, 500));
    
    // 데이터베이스에 저장
    const post = {
      postId: postId,
      title: detail.title || '테스트 게시글',
      author: detail.author || '테스트 작성자',
      postUrl: `https://gall.dcinside.com/board/view/?id=dcbest&no=${postId}`,
      postDate: new Date(),
      viewCount: 0
    };
    
    await dcInsideCrawler.savePostWithContent(post, processedContent);
    console.log('데이터베이스 저장 완료');
    
  } catch (error) {
    console.error('테스트 실패:', error);
  } finally {
    await crawlerDB.close();
  }
}

testSpecificPost();
