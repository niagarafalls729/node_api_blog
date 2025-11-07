const oracledb = require('oracledb');
const fs = require('fs').promises;
const path = require('path');
const { baseDbConnection } = require('../dbConnection/baseDbConnection');

// 크롤링 데이터를 데이터베이스에 저장하는 클래스
class CrawlerDatabase {
  constructor() {
    this.connection = null;
  }

  // 데이터베이스 연결
  async connect() {
    try {
      this.connection = await baseDbConnection();
      console.log('크롤링 데이터베이스 연결 성공');
    } catch (error) {
      console.error('크롤링 데이터베이스 연결 실패:', error);
      throw error;
    }
  }

  // 연결 종료
  async close() {
    if (this.connection) {
      try {
        await this.connection.close();
      } catch (error) {
        // 연결이 이미 닫혀있거나 유효하지 않은 경우 무시
        console.log('데이터베이스 연결 종료 중 오류 (무시됨):', error.message);
      }
      this.connection = null;
    }
  }

  // 크롤링 결과 테이블 생성 (필요시)
  async createCrawlerTable() {
    try {
      const sql = `
        CREATE TABLE CRAWLER_RESULTS (
          ID NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          URL VARCHAR2(500) NOT NULL,
          SELECTOR VARCHAR2(200),
          DATA_TYPE VARCHAR2(50),
          CRAWLED_DATA CLOB,
          CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      await this.connection.execute(sql);
      await this.connection.commit();
      console.log('크롤링 결과 테이블 생성 완료');
    } catch (error) {
      console.error('테이블 생성 실패:', error);
      // 테이블이 이미 존재하는 경우 무시
    }
  }

  // 크롤링 결과 저장
  async saveCrawledData(url, selector, dataType, data) {
    try {
      if (!this.connection) {
        await this.connect();
      }

      const sql = `
        INSERT INTO CRAWLER_RESULTS (URL, SELECTOR, DATA_TYPE, CRAWLED_DATA)
        VALUES (:url, :selector, :dataType, :data)
      `;

      const binds = {
        url: url,
        selector: selector || null,
        dataType: dataType,
        data: JSON.stringify(data)
      };

      await this.connection.execute(sql, binds);
      await this.connection.commit();
      
      console.log('크롤링 데이터 저장 완료');
      return { success: true, message: '데이터 저장 완료' };
    } catch (error) {
      console.error('크롤링 데이터 저장 실패:', error);
      throw error;
    }
  }

  // 크롤링 결과 조회
  async getCrawledData(limit = 10, offset = 0) {
    try {
      if (!this.connection) {
        await this.connect();
      }

      const sql = `
        SELECT ID, URL, SELECTOR, DATA_TYPE, CRAWLED_DATA, CREATED_AT
        FROM CRAWLER_RESULTS
        ORDER BY CREATED_AT DESC
        OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
      `;

      const binds = { limit, offset };
      const result = await this.connection.execute(sql, binds);
      
      return result.rows.map(row => ({
        id: row[0],
        url: row[1],
        selector: row[2],
        dataType: row[3],
        crawledData: JSON.parse(row[4]),
        createdAt: row[5]
      }));
    } catch (error) {
      console.error('크롤링 데이터 조회 실패:', error);
      throw error;
    }
  }

  // 특정 URL의 크롤링 결과 조회
  async getCrawledDataByUrl(url) {
    try {
      if (!this.connection) {
        await this.connect();
      }

      const sql = `
        SELECT ID, URL, SELECTOR, DATA_TYPE, CRAWLED_DATA, CREATED_AT
        FROM CRAWLER_RESULTS
        WHERE URL = :url
        ORDER BY CREATED_AT DESC
      `;

      const binds = { url };
      const result = await this.connection.execute(sql, binds);
      
      return result.rows.map(row => ({
        id: row[0],
        url: row[1],
        selector: row[2],
        dataType: row[3],
        crawledData: JSON.parse(row[4]),
        createdAt: row[5]
      }));
    } catch (error) {
      console.error('URL별 크롤링 데이터 조회 실패:', error);
      throw error;
    }
  }

  // 오래된 크롤링 데이터 삭제 (30일 이상)
  async deleteOldCrawledData(days = 30) {
    try {
      if (!this.connection) {
        await this.connect();
      }

      const sql = `
        DELETE FROM CRAWLER_RESULTS
        WHERE CREATED_AT < SYSDATE - :days
      `;

      const binds = { days };
      const result = await this.connection.execute(sql, binds);
      await this.connection.commit();
      
      console.log(`${result.rowsAffected}개의 오래된 크롤링 데이터 삭제 완료`);
      return { success: true, deletedCount: result.rowsAffected };
    } catch (error) {
      console.error('오래된 크롤링 데이터 삭제 실패:', error);
      throw error;
    }
  }

  // 오래된 크롤링 데이터 전체 삭제 (DB + 파일)
  async cleanupOldCrawlerData(days = 60) {
    let deletedPosts = 0;
    let deletedImages = 0;
    let deletedFiles = 0;
    let deletedCrawlerResults = 0;

    try {
      if (!this.connection) {
        await this.connect();
      }

      // 1. 삭제할 이미지의 LOCAL_PATH 가져오기 (파일 삭제용)
      // 19세 게시글의 이미지는 제외
      const getImagesToDeleteSql = `
        SELECT i.LOCAL_PATH, i.FILE_NAME
        FROM DC_POST_IMAGES i
        WHERE i.CRAWLED_AT < SYSDATE - :days
        AND i.LOCAL_PATH IS NOT NULL
        AND i.POST_ID NOT IN (
          SELECT POST_ID FROM DC_BEST_POSTS 
          WHERE (TITLE LIKE '%[ㅇㅎ]%' OR TITLE LIKE '%[성인]%')
        )
      `;
      const imageResult = await this.connection.execute(getImagesToDeleteSql, { days });
      const imagesToDelete = imageResult.rows || [];

      // 2. 파일 삭제
      const imageDir = path.join(__dirname, '..', 'public', 'crawled_images');
      for (const row of imagesToDelete) {
        const localPath = row[0];
        const fileName = row[1];
        
        if (localPath) {
          try {
            // 절대 경로인 경우 그대로 사용, 상대 경로인 경우 imageDir과 결합
            const filePath = path.isAbsolute(localPath) 
              ? localPath 
              : path.join(imageDir, fileName || path.basename(localPath));
            
            await fs.unlink(filePath);
            deletedFiles++;
          } catch (fileError) {
            // 파일이 이미 없거나 삭제 실패해도 계속 진행
            console.log(`파일 삭제 실패 (무시): ${localPath} - ${fileError.message}`);
          }
        }
      }

      // 3. DC_POST_IMAGES 삭제 (외래키 제약 때문에 먼저 삭제)
      // 19세 게시글의 이미지는 제외
      const deleteImagesSql = `
        DELETE FROM DC_POST_IMAGES
        WHERE CRAWLED_AT < SYSDATE - :days
        AND POST_ID NOT IN (
          SELECT POST_ID FROM DC_BEST_POSTS 
          WHERE (TITLE LIKE '%[ㅇㅎ]%' OR TITLE LIKE '%[성인]%')
        )
      `;
      const imageDeleteResult = await this.connection.execute(deleteImagesSql, { days });
      await this.connection.commit();
      // Oracle에서 rowsAffected는 제대로 반환되지 않을 수 있으므로 쿼리로 확인
      deletedImages = imageDeleteResult.rowsAffected || 0;
      console.log(`${deletedImages}개의 이미지 레코드 삭제 완료 (19세 게시글 제외)`);

      // 4. DC_BEST_POSTS 삭제 (19세 게시글 제외)
      const deletePostsSql = `
        DELETE FROM DC_BEST_POSTS
        WHERE CRAWLED_AT < SYSDATE - :days
        AND NOT (TITLE LIKE '%[ㅇㅎ]%' OR TITLE LIKE '%[성인]%')
      `;
      const postDeleteResult = await this.connection.execute(deletePostsSql, { days });
      await this.connection.commit();
      deletedPosts = postDeleteResult.rowsAffected || 0;
      console.log(`${deletedPosts}개의 게시글 레코드 삭제 완료 (19세 게시글 제외)`);

      // 5. CRAWLER_RESULTS 삭제
      const deleteCrawlerResultsSql = `
        DELETE FROM CRAWLER_RESULTS
        WHERE CREATED_AT < SYSDATE - :days
      `;
      const crawlerResult = await this.connection.execute(deleteCrawlerResultsSql, { days });
      await this.connection.commit();
      deletedCrawlerResults = crawlerResult.rowsAffected || 0;
      console.log(`${deletedCrawlerResults}개의 크롤링 결과 레코드 삭제 완료`);

      // 6. crawled_images 폴더에서 오래된 파일 정리 (DB에 없는 파일들만)
      // 19세 게시글의 이미지 파일은 보호
      try {
        // DB에 있는 모든 이미지 파일명 가져오기 (19세 게시글 포함)
        const getExistingFilesSql = `
          SELECT DISTINCT FILE_NAME, LOCAL_PATH
          FROM DC_POST_IMAGES
          WHERE FILE_NAME IS NOT NULL
        `;
        const existingFilesResult = await this.connection.execute(getExistingFilesSql);
        const existingFiles = new Set();
        existingFilesResult.rows.forEach(row => {
          const fileName = row[0];
          const localPath = row[1];
          if (fileName) existingFiles.add(fileName);
          // LOCAL_PATH에서 파일명 추출
          if (localPath) {
            const pathFileName = path.basename(localPath);
            if (pathFileName) existingFiles.add(pathFileName);
          }
        });

        const files = await fs.readdir(imageDir);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        for (const file of files) {
          // DB에 있는 파일은 삭제하지 않음 (19세 게시글 보호)
          if (existingFiles.has(file)) {
            continue;
          }
          
          const filePath = path.join(imageDir, file);
          try {
            const stats = await fs.stat(filePath);
            // 파일 수정 시간이 오래되었고, DB에 없는 파일만 삭제
            if (stats.mtime < cutoffDate) {
              await fs.unlink(filePath);
              deletedFiles++;
            }
          } catch (err) {
            // 파일 접근 실패 시 무시
            console.log(`파일 정리 중 오류 (무시): ${file} - ${err.message}`);
          }
        }
      } catch (dirError) {
        // 디렉토리가 없거나 접근 불가능한 경우 무시
        console.log(`이미지 디렉토리 정리 중 오류 (무시): ${dirError.message}`);
      }

      const summary = {
        success: true,
        deletedPosts,
        deletedImages,
        deletedFiles,
        deletedCrawlerResults,
        totalDeleted: deletedPosts + deletedImages + deletedFiles + deletedCrawlerResults
      };

      console.log('크롤링 데이터 정리 완료:', summary);
      return summary;
    } catch (error) {
      console.error('크롤링 데이터 정리 실패:', error);
      throw error;
    }
  }
}

// 싱글톤 인스턴스 생성
const crawlerDB = new CrawlerDatabase();

module.exports = {
  CrawlerDatabase,
  crawlerDB,
  oracledb
};

