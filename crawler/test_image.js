const { imageProcessor } = require('./imageProcessor');

// 이미지 처리 테스트
async function testImageProcessing() {
  try {
    console.log('=== 이미지 처리 테스트 시작 ===');
    
    // 테스트 이미지 URL (디시인사이드 이미지)
    const testImageUrl = 'https://dcimg6.dcinside.co.kr/viewimage.php?id=3ea9df25eec72b&no=24b0d769e1d32ca73de880fa1bd6253104bb44157be50e63058663b138f6c3292db43680ff73340776980e394490bf93386443cd42c06e19000fcc2352e422448e9f6e';
    
    console.log(`테스트 이미지 URL: ${testImageUrl}`);
    
    // 이미지 처리 실행
    const result = await imageProcessor.processImageHybrid(testImageUrl, 'test_post_123', false);
    
    console.log('처리 결과:', result);
    
    if (result.processed && result.localPath) {
      console.log('✅ 이미지 처리 성공!');
      console.log(`- 로컬 경로: ${result.localPath}`);
      console.log(`- 파일명: ${result.fileName}`);
      console.log(`- 파일 크기: ${result.size} bytes`);
    } else {
      console.log('❌ 이미지 처리 실패!');
      console.log(`- 오류: ${result.error}`);
    }
    
  } catch (error) {
    console.error('테스트 실패:', error);
  }
}

// 실행
if (require.main === module) {
  testImageProcessing();
}

module.exports = { testImageProcessing };
