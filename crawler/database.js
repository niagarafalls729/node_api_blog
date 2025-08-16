const oracledb = require('oracledb');
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
}

// 싱글톤 인스턴스 생성
const crawlerDB = new CrawlerDatabase();

module.exports = {
  CrawlerDatabase,
  crawlerDB,
  oracledb
};

