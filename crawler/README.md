# 🕷️ 디시인사이드 크롤링 시스템 가이드

## 📋 목차
- [개요](#개요)
- [시스템 구조](#시스템-구조)
- [설치 및 설정](#설치-및-설정)
- [사용법](#사용법)
- [크롤링 흐름](#크롤링-흐름)
- [API 엔드포인트](#api-엔드포인트)
- [이미지 처리 전략](#이미지-처리-전략)
- [데이터베이스 구조](#데이터베이스-구조)
- [모니터링 및 관리](#모니터링-및-관리)
- [문제 해결](#문제-해결)

## 🎯 개요

이 시스템은 **디시인사이드 실시간베스트**를 자동으로 크롤링하여 데이터베이스에 저장하는 Node.js 기반 크롤링 시스템입니다.

### 🎪 크롤링 대상 사이트
- **메인 사이트**: https://gall.dcinside.com
- **실시간베스트**: https://gall.dcinside.com/board/lists/?id=hit
- **지원 갤러리**: 유머, 뉴스, 게임, 스포츠, 연예, 정치, 경제 등

### ✨ 주요 기능
- 🔄 실시간베스트 자동 크롤링
- 📸 이미지 자동 다운로드 및 저장
- 💬 댓글 수집
- 📊 데이터베이스 자동 저장
- ⏰ 스케줄링 기능
- 📈 실시간 통계 및 모니터링

## 🏗️ 시스템 구조

```
node_api_blog/
├── crawler/
│   ├── index.js              # 메인 크롤링 라우터
│   ├── dcinsideCrawler.js    # 디시인사이드 전용 크롤러
│   ├── imageProcessor.js     # 이미지 처리 모듈
│   ├── database.js           # 데이터베이스 연동
│   ├── examples.js           # 크롤링 예제
│   ├── dcinside_schema.sql   # Oracle DB 스키마
│   └── README.md             # 이 파일
├── app.js                    # 메인 서버 파일
└── package.json
```

## 🚀 설치 및 설정

### 1. 패키지 설치
```bash
cd node_api_blog
npm install cheerio@1.0.0-rc.12 axios node-cron
```

### 2. 데이터베이스 설정
Oracle DB에서 스키마 생성:
```sql
-- dcinside_schema.sql 실행
@dcinside_schema.sql
```

### 3. 서버 실행
```bash
node app.js
```

## 📖 사용법

### 🎯 기본 크롤링 시작

#### 1. 실시간베스트 크롤링
```bash
curl -X POST http://localhost:4000/crawler/dcinside/best \
  -H "Content-Type: application/json" \
  -d '{
    "galleryId": "hit",
    "maxPages": 1
  }'
```

#### 2. 특정 갤러리 크롤링
```bash
curl -X POST http://localhost:4000/crawler/dcinside/best \
  -H "Content-Type: application/json" \
  -d '{
    "galleryId": "humor",
    "maxPages": 2
  }'
```

#### 3. 특정 게시글 크롤링
```bash
curl -X POST http://localhost:4000/crawler/dcinside/post \
  -H "Content-Type: application/json" \
  -d '{
    "postId": "123456",
    "galleryId": "hit"
  }'
```

### 🎪 지원 갤러리 목록
| 갤러리 ID | 갤러리명 | URL |
|-----------|----------|-----|
| `hit` | 실시간베스트 | https://gall.dcinside.com/board/lists/?id=hit |
| `humor` | 유머 | https://gall.dcinside.com/board/lists/?id=humor |
| `news` | 뉴스 | https://gall.dcinside.com/board/lists/?id=news |
| `game` | 게임 | https://gall.dcinside.com/board/lists/?id=game |
| `sports` | 스포츠 | https://gall.dcinside.com/board/lists/?id=sports |
| `entertainment` | 연예 | https://gall.dcinside.com/board/lists/?id=entertainment |
| `politics` | 정치 | https://gall.dcinside.com/board/lists/?id=politics |
| `economy` | 경제 | https://gall.dcinside.com/board/lists/?id=economy |

## 🔄 크롤링 흐름

### 📊 전체 프로세스
```
1. 갤러리 목록 접근
   ↓
2. 게시글 목록 파싱
   ↓
3. 각 게시글 상세 페이지 접근
   ↓
4. 게시글 내용, 이미지, 댓글 추출
   ↓
5. 이미지 처리 (다운로드/URL 저장)
   ↓
6. 데이터베이스 저장
   ↓
7. 다음 게시글 처리
```

### 🔍 상세 크롤링 과정

#### 1단계: 게시글 목록 크롤링
```javascript
// 1. 갤러리 페이지 접근
const url = 'https://gall.dcinside.com/board/lists/?id=hit&page=1';

// 2. HTML 파싱
const $ = cheerio.load(response.data);

// 3. 게시글 정보 추출
$('.ub-content').each((index, element) => {
  const title = $(element).find('.ub-word a').text();
  const author = $(element).find('.ub-writer').text();
  const postId = extractPostId($(element).find('.ub-word a').attr('href'));
  // ...
});
```

#### 2단계: 게시글 상세 크롤링
```javascript
// 1. 게시글 상세 페이지 접근
const url = `https://gall.dcinside.com/board/view/?id=hit&no=${postId}`;

// 2. 내용 추출
const content = $('.write_div').html();

// 3. 이미지 URL 추출
$('.write_div img').each((index, element) => {
  const src = $(element).attr('src');
  imageUrls.push(normalizeImageUrl(src));
});

// 4. 댓글 추출
$('.comment_list .comment_item').each((index, element) => {
  // 댓글 정보 파싱
});
```

#### 3단계: 이미지 처리
```javascript
// 1. 이미지 URL 유효성 검사
if (isValidImageUrl(imageUrl)) {
  // 2. 중요 이미지 판별
  const isImportant = importantImageUrls.includes(imageUrl);
  
  // 3. 하이브리드 저장 전략
  if (isImportant || shouldSaveLocally(imageUrl)) {
    // 로컬 저장
    await saveImageLocally(imageUrl);
  }
  // URL 참조 저장
}
```

#### 4단계: 데이터베이스 저장
```javascript
// 1. 게시글 저장
await savePostToDatabase(postData);

// 2. 이미지 정보 저장
await saveImageInfo(postId, imageUrl, localPath);

// 3. 댓글 저장
await saveCommentsToDatabase(comments);
```

## 🌐 API 엔드포인트

### 📊 크롤링 API

#### `POST /crawler/dcinside/best`
실시간베스트 크롤링 실행
```json
{
  "galleryId": "hit",
  "maxPages": 1
}
```

#### `POST /crawler/dcinside/post`
특정 게시글 크롤링
```json
{
  "postId": "123456",
  "galleryId": "hit"
}
```

### 📈 모니터링 API

#### `GET /crawler/status`
크롤링 시스템 상태 확인
```json
{
  "status": "running",
  "lastCrawl": "2024-01-15T10:30:00.000Z",
  "config": {
    "userAgent": "Mozilla/5.0...",
    "timeout": 10000,
    "retryCount": 3
  }
}
```

#### `GET /crawler/images/stats`
이미지 처리 통계
```json
{
  "totalImages": 150,
  "totalSizeMB": "245.67",
  "byExtension": {
    ".jpg": 80,
    ".png": 45,
    ".gif": 25
  }
}
```

#### `GET /crawler/data`
크롤링 데이터 조회
```bash
GET /crawler/data?limit=10&offset=0
GET /crawler/data?url=https://gall.dcinside.com/...
```

### 🧹 관리 API

#### `DELETE /crawler/cleanup`
오래된 데이터 정리
```bash
DELETE /crawler/cleanup?days=30
```

#### `DELETE /crawler/images/cleanup`
오래된 이미지 정리
```bash
DELETE /crawler/images/cleanup?days=30
```

## 🖼️ 이미지 처리 전략

### 🎯 하이브리드 방식 (기본값)

#### 📥 로컬 저장 대상
- **첫 번째 이미지**: 게시글의 대표 이미지
- **GIF 파일**: 애니메이션 이미지
- **디시인사이드 도메인 이미지**: 안정성 확보
- **5MB 이하 파일**: 빠른 처리

#### 🔗 URL 참조 대상
- **일반 이미지**: 저장 공간 절약
- **대용량 파일**: 비용 효율성
- **외부 도메인 이미지**: 불안정성 고려

### ⚙️ 설정 변경
```javascript
// imageProcessor.js
const config = {
  strategy: 'hybrid',        // 'url_only', 'local', 'cloud', 'hybrid'
  maxFileSize: 5,           // MB
  allowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  localPath: './public/crawled_images'
};
```

## 🗄️ 데이터베이스 구조

### 📊 주요 테이블

#### 1. `DC_GALLERIES` - 갤러리 정보
```sql
CREATE TABLE DC_GALLERIES (
    GALLERY_ID VARCHAR2(50) PRIMARY KEY,
    GALLERY_NAME VARCHAR2(100) NOT NULL,
    GALLERY_URL VARCHAR2(200) NOT NULL,
    IS_ACTIVE NUMBER(1) DEFAULT 1,
    CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. `DC_POSTS` - 게시글 정보
```sql
CREATE TABLE DC_POSTS (
    POST_ID VARCHAR2(50) PRIMARY KEY,
    GALLERY_ID VARCHAR2(50) NOT NULL,
    TITLE VARCHAR2(500) NOT NULL,
    AUTHOR VARCHAR2(100),
    CONTENT CLOB,
    VIEW_COUNT NUMBER DEFAULT 0,
    RECOMMEND_COUNT NUMBER DEFAULT 0,
    COMMENT_COUNT NUMBER DEFAULT 0,
    POST_URL VARCHAR2(500) NOT NULL,
    POST_DATE TIMESTAMP,
    CRAWLED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. `DC_IMAGES` - 이미지 정보
```sql
CREATE TABLE DC_IMAGES (
    IMAGE_ID NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    POST_ID VARCHAR2(50) NOT NULL,
    ORIGINAL_URL VARCHAR2(500) NOT NULL,
    LOCAL_PATH VARCHAR2(500),
    FILE_NAME VARCHAR2(200),
    FILE_SIZE NUMBER,
    STRATEGY VARCHAR2(20) NOT NULL,
    IS_IMPORTANT NUMBER(1) DEFAULT 0,
    PROCESSED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 4. `DC_COMMENTS` - 댓글 정보
```sql
CREATE TABLE DC_COMMENTS (
    COMMENT_ID VARCHAR2(50) PRIMARY KEY,
    POST_ID VARCHAR2(50) NOT NULL,
    AUTHOR VARCHAR2(100),
    CONTENT CLOB NOT NULL,
    RECOMMEND_COUNT NUMBER DEFAULT 0,
    COMMENT_DATE TIMESTAMP,
    CRAWLED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 5. `DC_BEST_RANKINGS` - 실시간베스트 순위
```sql
CREATE TABLE DC_BEST_RANKINGS (
    RANKING_ID NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    GALLERY_ID VARCHAR2(50) NOT NULL,
    POST_ID VARCHAR2(50) NOT NULL,
    RANK_POSITION NUMBER NOT NULL,
    RANK_DATE DATE NOT NULL,
    RANK_TIME VARCHAR2(10) NOT NULL,
    CRAWLED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 📈 유용한 뷰

#### `V_DC_BEST_STATS` - 실시간베스트 통계
```sql
SELECT 
    g.GALLERY_NAME,
    p.TITLE,
    p.AUTHOR,
    br.RANK_POSITION,
    br.RANK_DATE,
    p.POST_URL
FROM DC_BEST_RANKINGS br
JOIN DC_POSTS p ON br.POST_ID = p.POST_ID
JOIN DC_GALLERIES g ON br.GALLERY_ID = g.GALLERY_ID
WHERE br.RANK_DATE = (SELECT MAX(RANK_DATE) FROM DC_BEST_RANKINGS);
```

## 📊 모니터링 및 관리

### 🔍 실시간 모니터링

#### 1. 시스템 상태 확인
```bash
# 크롤링 상태
curl http://localhost:4000/crawler/status

# 이미지 통계
curl http://localhost:4000/crawler/images/stats
```

#### 2. 데이터베이스 모니터링
```sql
-- 최근 크롤링 데이터
SELECT * FROM DC_POSTS 
ORDER BY CRAWLED_AT DESC 
FETCH FIRST 10 ROWS ONLY;

-- 갤러리별 통계
SELECT 
    g.GALLERY_NAME,
    COUNT(p.POST_ID) as TOTAL_POSTS,
    AVG(p.VIEW_COUNT) as AVG_VIEWS
FROM DC_GALLERIES g
LEFT JOIN DC_POSTS p ON g.GALLERY_ID = p.GALLERY_ID
GROUP BY g.GALLERY_ID, g.GALLERY_NAME;
```

#### 3. 저장 공간 모니터링
```bash
# 디스크 사용량
df -h

# 이미지 폴더 크기
du -sh ./public/crawled_images

# 크롤링 로그 확인
tail -f ./logs/crawler.log
```

### 🧹 정기 관리

#### 1. 오래된 데이터 정리
```bash
# 30일 이상 된 데이터 삭제
curl -X DELETE "http://localhost:4000/crawler/cleanup?days=30"

# 오래된 이미지 삭제
curl -X DELETE "http://localhost:4000/crawler/images/cleanup?days=30"
```

#### 2. 데이터베이스 최적화
```sql
-- 인덱스 재구성
ALTER INDEX IDX_DC_POSTS_DATE REBUILD;

-- 통계 정보 갱신
ANALYZE TABLE DC_POSTS COMPUTE STATISTICS;
```

## ⚠️ 문제 해결

### 🔧 일반적인 오류

#### 1. 타임아웃 오류
```javascript
// CRAWLER_CONFIG.timeout 값 증가
const CRAWLER_CONFIG = {
  timeout: 30000,  // 10초 → 30초
  retryCount: 5    // 3회 → 5회
};
```

#### 2. 메모리 부족 오류
```javascript
// 이미지 처리 배치 크기 조정
const BATCH_SIZE = 5;  // 한 번에 처리할 이미지 수
```

#### 3. 데이터베이스 연결 오류
```bash
# Oracle DB 연결 확인
sqlplus username/password@host:port/service

# 연결 문자열 확인
cat dbConnection/baseDbConnection.js
```

### 🐛 디버깅

#### 1. 크롤링 로그 확인
```bash
# 실시간 로그 모니터링
tail -f ./logs/crawler.log

# 오류 로그 필터링
grep "ERROR" ./logs/crawler.log
```

#### 2. 네트워크 연결 테스트
```bash
# 디시인사이드 접근 테스트
curl -I https://gall.dcinside.com

# User-Agent 설정 테스트
curl -H "User-Agent: Mozilla/5.0..." https://gall.dcinside.com
```

#### 3. 이미지 다운로드 테스트
```bash
# 이미지 URL 유효성 테스트
curl -I "https://img.dcinside.com/example.jpg"

# 이미지 다운로드 테스트
wget "https://img.dcinside.com/example.jpg"
```

### 📞 지원

#### 문제 발생 시 확인사항:
1. **네트워크 연결**: 인터넷 연결 상태
2. **데이터베이스**: Oracle DB 연결 상태
3. **저장 공간**: 디스크 용량 확인
4. **권한**: 파일 쓰기 권한 확인
5. **로봇 배제**: robots.txt 확인

#### 로그 파일 위치:
- `./logs/crawler.log`: 크롤링 로그
- `./logs/error.log`: 오류 로그
- `./logs/access.log`: 접근 로그

---

## 🎉 시작하기

이제 디시인사이드 크롤링 시스템을 사용할 준비가 완료되었습니다!

```bash
# 1. 서버 실행
node app.js

# 2. 실시간베스트 크롤링 시작
curl -X POST http://localhost:4000/crawler/dcinside/best \
  -H "Content-Type: application/json" \
  -d '{"galleryId": "hit", "maxPages": 1}'

# 3. 결과 확인
curl http://localhost:4000/crawler/status
```

**즐거운 크롤링 되세요!** 🕷️✨
