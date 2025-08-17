const oracledb = require('oracledb');
const { crawlerDB } = require('../crawler/database');

// 실시간베스트 게시글 목록 조회
const getDCBestPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    await crawlerDB.connect();

    // 검색 조건에 따른 WHERE 절 생성
    let whereClause = '';
    let bindParams = {};
    
    if (search.trim()) {
      whereClause = 'WHERE TITLE LIKE :search';
      bindParams.search = `%${search}%`;
    }

    // 전체 게시글 수 조회 (검색 조건 적용)
    const countSql = `SELECT COUNT(*) as total FROM DC_BEST_POSTS ${whereClause} `;
    const countResult = await crawlerDB.connection.execute(
      countSql,
      bindParams
    );

    const total = countResult.rows[0][0];

    // 게시글 목록 조회 (검색 조건 적용)
    const result = await crawlerDB.connection.execute(
      `SELECT 
        POST_ID,
        TITLE,
        AUTHOR,
        VIEW_COUNT,
        POST_DATE,
        POST_URL
      FROM DC_BEST_POSTS 
      ${whereClause}
      ORDER BY POST_ID DESC
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`,
      { ...bindParams, offset, limit },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const totalPages = Math.ceil(total / limit);

    // 객체 형태의 결과 처리
    const posts = result.rows.map(row => ({
      POST_ID: String(row.POST_ID || ''),
      TITLE: String(row.TITLE || ''),
      AUTHOR: String(row.AUTHOR || ''),
      VIEW_COUNT: Number(row.VIEW_COUNT || 0),
      POST_DATE: row.POST_DATE ? new Date(row.POST_DATE).toISOString() : null,
      POST_URL: String(row.POST_URL || '')
    }));

    // 순환 참조 문제를 피하기 위해 명시적으로 객체 생성
    const responseData = {
      data: posts,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };

    res.json(responseData);

  } catch (error) {
    console.error('실시간베스트 게시글 목록 조회 실패:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  } finally {
    await crawlerDB.close();
  }
};

// 실시간베스트 게시글 상세 조회
const getDCBestPostDetail = async (req, res) => {
  try {
    const { postId } = req.params;

    await crawlerDB.connect();

    // 게시글 상세 정보 조회
    const result = await crawlerDB.connection.execute(
      `SELECT 
        p.POST_ID,
        p.TITLE,
        p.AUTHOR,
        p.CONTENT,
        p.VIEW_COUNT,
        p.POST_DATE,
        p.POST_URL,
        p.CRAWLED_AT
      FROM DC_BEST_POSTS p
      WHERE p.POST_ID = :postId`,
      { postId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    }

    // 객체 형태의 결과 처리
    const row = result.rows[0];
    
    // Lob 객체 처리
    let content = '';
    if (row.CONTENT) {
      if (typeof row.CONTENT === 'string') {
        content = row.CONTENT;
      } else if (row.CONTENT.getData) {
        // Lob 객체인 경우
        try {
          content = await row.CONTENT.getData();
        } catch (error) {
          console.error('Lob 데이터 읽기 실패:', error);
          content = '게시글 내용을 불러올 수 없습니다.';
        }
      } else {
        content = String(row.CONTENT);
      }
    }
    
    // 이미지 오류 핸들러 정리
    if (content) {
      // onerror 이벤트 핸들러 통일
      content = content.replace(/onerror="[^"]*"/g, 'onerror="this.style.display=\'none\';"');
    }
    
    const post = {
      POST_ID: String(row.POST_ID || ''),
      TITLE: String(row.TITLE || ''),
      AUTHOR: String(row.AUTHOR || ''),
      CONTENT: content,
      VIEW_COUNT: Number(row.VIEW_COUNT || 0),
      POST_DATE: row.POST_DATE ? new Date(row.POST_DATE).toISOString() : null,
      POST_URL: String(row.POST_URL || ''),
      CRAWLED_AT: row.CRAWLED_AT ? new Date(row.CRAWLED_AT).toISOString() : null
    };

    // 이미지 정보 조회
    const imageResult = await crawlerDB.connection.execute(
      `SELECT 
        IMAGE_ID,
        IMAGE_URL,
        LOCAL_PATH,
        FILE_NAME,
        FILE_SIZE
      FROM DC_POST_IMAGES 
      WHERE POST_ID = :postId
      ORDER BY IMAGE_ID`,
      { postId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    // 이미지 데이터 처리
    const images = imageResult.rows.map(imgRow => ({
      IMAGE_ID: Number(imgRow.IMAGE_ID || 0),
      IMAGE_URL: String(imgRow.IMAGE_URL || ''),
      LOCAL_PATH: String(imgRow.LOCAL_PATH || ''),
      FILE_NAME: String(imgRow.FILE_NAME || ''),
      FILE_SIZE: Number(imgRow.FILE_SIZE || 0)
    }));

    // 순환 참조 문제를 피하기 위해 명시적으로 객체 생성
    const responseData = {
      POST_ID: post.POST_ID,
      TITLE: post.TITLE,
      AUTHOR: post.AUTHOR,
      CONTENT: post.CONTENT,
      VIEW_COUNT: post.VIEW_COUNT,
      POST_DATE: post.POST_DATE,
      POST_URL: post.POST_URL,
      CRAWLED_AT: post.CRAWLED_AT,
      images: images
    };

    res.json(responseData);

  } catch (error) {
    console.error('실시간베스트 게시글 상세 조회 실패:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  } finally {
    await crawlerDB.close();
  }
};

module.exports = {
  getDCBestPosts,
  getDCBestPostDetail
};
