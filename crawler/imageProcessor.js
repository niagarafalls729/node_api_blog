const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { crawlerDB } = require('./database');

class ImageProcessor {
  constructor() {
    this.config = {
      // 이미지 저장 전략: 'url_only', 'local', 'cloud', 'hybrid'
      strategy: 'hybrid',
      
      // 로컬 저장 설정 (절대 경로 사용)
      localPath: path.join(__dirname, '..', 'public', 'crawled_images'),
      
      // 이미지 품질 설정
      maxWidth: 800,
      maxHeight: 600,
      
      // 허용 이미지 형식
      allowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      
      // 최대 파일 크기 (MB)
      maxFileSize: 20,
      
      // 중복 체크 여부
      checkDuplicate: true
    };
  }

  // 이미지 URL에서 파일명 생성
  generateFileName(imageUrl) {
    const hash = crypto.createHash('md5').update(imageUrl).digest('hex');
    const ext = this.getFileExtension(imageUrl);
    return `${hash}.${ext}`;
  }

  // 파일 확장자 추출
  getFileExtension(url) {
    // 디시인사이드 이미지는 기본적으로 jpg로 처리
    if (url.includes('dcimg') || url.includes('dcinside.co.kr') || url.includes('image.dcinside.com')) {
      return 'jpg';
    }
    
    const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
    return match ? match[1].toLowerCase() : 'jpg';
  }

  // 이미지 URL 유효성 검사
  isValidImageUrl(url) {
    if (!url || typeof url !== 'string') return false;
    
    // 디시인사이드 이미지 URL 체크
    if (url.includes('dcimg') || url.includes('dcinside.co.kr') || url.includes('image.dcinside.com')) {
      return url.startsWith('http://') || url.startsWith('https://');
    }
    
    const allowedFormats = this.config.allowedFormats;
    const ext = this.getFileExtension(url);
    
    return allowedFormats.includes(ext) && 
           (url.startsWith('http://') || url.startsWith('https://'));
  }

  // 이미지 다운로드
  async downloadImage(imageUrl) {
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://gall.dcinside.com/',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Sec-Fetch-Dest': 'image',
          'Sec-Fetch-Mode': 'no-cors',
          'Sec-Fetch-Site': 'cross-site',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        maxRedirects: 5,
        validateStatus: function (status) {
          return status >= 200 && status < 300; // 2xx 상태 코드만 성공으로 처리
        }
      });

      const buffer = Buffer.from(response.data);
      
      console.log(`이미지 다운로드 성공: ${buffer.length} bytes, Content-Type: ${response.headers['content-type']}`);
      
      // 파일 크기 체크
      const fileSizeMB = buffer.length / (1024 * 1024);
      if (fileSizeMB > this.config.maxFileSize) {
        throw new Error(`파일 크기가 너무 큽니다: ${fileSizeMB.toFixed(2)}MB`);
      }

      return {
        buffer,
        contentType: response.headers['content-type'],
        size: buffer.length
      };
    } catch (error) {
      console.error(`이미지 다운로드 실패: ${imageUrl}`, error.message);
      throw error;
    }
  }

  // 로컬에 이미지 저장
  async saveImageLocally(imageUrl, customFileName = null) {
    const maxRetries = 3;
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const fileName = customFileName || this.generateFileName(imageUrl);
        const filePath = path.join(this.config.localPath, fileName);
        
        // 디렉토리 생성
        await fs.mkdir(this.config.localPath, { recursive: true });
        
        // 이미지 다운로드 (재시도 포함)
        const { buffer } = await this.downloadImage(imageUrl);
        
        // 파일 저장
        await fs.writeFile(filePath, buffer);
        
        // 파일이 실제로 저장되었는지 확인
        const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
        if (!fileExists) {
          throw new Error('파일 저장 후 확인 실패');
        }
        
        // 파일 크기 확인
        const stats = await fs.stat(filePath);
        if (stats.size === 0) {
          throw new Error('저장된 파일 크기가 0입니다');
        }
        
        console.log(`파일 저장 확인: ${filePath} (${stats.size} bytes)`);
        
        return {
          success: true,
          localPath: filePath,
          fileName: fileName,
          size: buffer.length
        };
      } catch (error) {
        lastError = error;
        console.error(`로컬 저장 실패 (시도 ${attempt}/${maxRetries}):`, error.message);
        
        if (attempt < maxRetries) {
          // 재시도 전 잠시 대기
          await this.delay(1000 * attempt); // 1초, 2초, 3초 대기
        }
      }
    }
    
    return {
      success: false,
      error: lastError ? lastError.message : '알 수 없는 오류'
    };
  }

  // 이미지 정보를 데이터베이스에 저장
  async saveImageInfo(postId, imageUrl, localPath = null) {
    try {
      const imageInfo = {
        postId: postId,
        originalUrl: imageUrl,
        localPath: localPath,
        fileName: localPath ? path.basename(localPath) : null,
        strategy: this.config.strategy,
        processedAt: new Date()
      };

      // TODO: 이미지 정보를 데이터베이스에 저장하는 로직 구현
      console.log('이미지 정보 저장:', imageInfo);
      
      return imageInfo;
    } catch (error) {
      console.error('이미지 정보 저장 실패:', error);
      throw error;
    }
  }

  // 하이브리드 이미지 처리 (URL + 로컬 저장)
  async processImageHybrid(imageUrl, postId, isImportant = false) {
    try {
      const result = {
        originalUrl: imageUrl,
        strategy: 'hybrid',
        processed: false
      };

      // 항상 로컬 저장 시도 (디시인사이드 크롤링용)
      console.log(`이미지 로컬 저장 시도: ${imageUrl}`);
      const localResult = await this.saveImageLocally(imageUrl);
      
      if (localResult.success) {
        result.localPath = localResult.localPath;
        result.fileName = localResult.fileName;
        result.size = localResult.size;
        result.processed = true;
        console.log(`이미지 로컬 저장 성공: ${localResult.fileName}`);
      } else {
        console.log(`이미지 로컬 저장 실패: ${imageUrl} - ${localResult.error}`);
        result.processed = false;
        result.error = localResult.error;
      }

      // 이미지 정보 저장
      await this.saveImageInfo(postId, imageUrl, result.localPath);
      
      return result;
    } catch (error) {
      console.error('하이브리드 이미지 처리 실패:', error);
      return {
        originalUrl: imageUrl,
        strategy: 'hybrid',
        processed: false,
        error: error.message
      };
    }
  }

  // 로컬 저장 여부 결정 로직
  shouldSaveLocally(imageUrl) {
    // 디시인사이드 이미지는 항상 로컬 저장
    const conditions = [
      // 특정 도메인의 이미지는 로컬 저장
      imageUrl.includes('dcinside.com'),
      imageUrl.includes('img.dcinside.com'),
      imageUrl.includes('dcimg'),
      imageUrl.includes('image.dcinside.com'),
      
      // 특정 확장자는 로컬 저장
      this.getFileExtension(imageUrl) === 'gif',
      
      // 모든 이미지를 로컬 저장 (디시인사이드 크롤링용)
      true
    ];

    return conditions.some(condition => condition);
  }

  // 게시글의 모든 이미지 처리
  async processPostImages(postId, imageUrls, importantImageUrls = []) {
    const results = [];
    
    for (const imageUrl of imageUrls) {
      try {
        const isImportant = importantImageUrls.includes(imageUrl);
        const result = await this.processImageHybrid(imageUrl, postId, isImportant);
        results.push(result);
        
        // 요청 간격 조절 (서버 부하 방지)
        await this.delay(100);
      } catch (error) {
        console.error(`이미지 처리 실패: ${imageUrl}`, error);
        results.push({
          originalUrl: imageUrl,
          processed: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  // 지연 함수
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 이미지 정리 (오래된 이미지 삭제)
  async cleanupOldImages(daysOld = 30) {
    try {
      const files = await fs.readdir(this.config.localPath);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      let deletedCount = 0;
      
      for (const file of files) {
        const filePath = path.join(this.config.localPath, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }
      
      console.log(`${deletedCount}개의 오래된 이미지가 삭제되었습니다.`);
      return deletedCount;
    } catch (error) {
      console.error('이미지 정리 실패:', error);
      throw error;
    }
  }

  // 이미지 통계 조회
  async getImageStats() {
    try {
      const files = await fs.readdir(this.config.localPath);
      const stats = {
        totalImages: files.length,
        totalSize: 0,
        byExtension: {}
      };
      
      for (const file of files) {
        const filePath = path.join(this.config.localPath, file);
        const fileStats = await fs.stat(filePath);
        const ext = path.extname(file).toLowerCase();
        
        stats.totalSize += fileStats.size;
        stats.byExtension[ext] = (stats.byExtension[ext] || 0) + 1;
      }
      
      stats.totalSizeMB = (stats.totalSize / (1024 * 1024)).toFixed(2);
      return stats;
    } catch (error) {
      console.error('이미지 통계 조회 실패:', error);
      throw error;
    }
  }
}

// 싱글톤 인스턴스
const imageProcessor = new ImageProcessor();

module.exports = {
  ImageProcessor,
  imageProcessor
};

