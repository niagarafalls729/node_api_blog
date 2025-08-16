const { imageProcessor } = require('./imageProcessor');
const fs = require('fs').promises;
const path = require('path');

// 이미지 다운로드 테스트
async function testImageDownload() {
  try {
    console.log('=== 이미지 다운로드 테스트 시작 ===');
    
    // 테스트 이미지 URL (실제 접근 가능한 이미지)
    const testImageUrl = 'https://httpbin.org/image/jpeg';
    
    console.log(`테스트 이미지 URL: ${testImageUrl}`);
    
    // 이미지 처리 실행
    const result = await imageProcessor.processImageHybrid(testImageUrl, 'test_post_123', false);
    
    console.log('처리 결과:', result);
    
    if (result.processed && result.localPath) {
      console.log('✅ 이미지 처리 성공!');
      console.log(`- 로컬 경로: ${result.localPath}`);
      console.log(`- 파일명: ${result.fileName}`);
      console.log(`- 파일 크기: ${result.size} bytes`);
      
      // 실제 파일 존재 확인
      try {
        const stats = await fs.stat(result.localPath);
        console.log(`✅ 파일 존재 확인: ${result.localPath} (${stats.size} bytes)`);
      } catch (error) {
        console.log(`❌ 파일 존재 확인 실패: ${error.message}`);
      }
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
  testImageDownload();
}

module.exports = { testImageDownload };
