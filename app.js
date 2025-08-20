//test
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const axios = require("axios");
const app = express();
const cron = require("node-cron");

// 미들웨어 사용
app.use(express.json({ limit: "50mb" })); // json 데이터 파서
app.use(express.urlencoded({ extended: false, limit: "50mb" })); // 내부 url 파서 사용
app.use(express.static(path.join(__dirname, "public"))); // 정적 파일 위치 설정
app.use(bodyParser.json({ limit: "50mb" }));
app.set("trust proxy", true);

const {
  main,
  saveUser,
  loginUser,
  guestBookCreate,
  guestBookDelete,
  guestBookList,
  guestBookCount,
  guestBookReplyList,
  guestBookReplyCreate,
  visitLog,
  visitCnt,
  oneDaySql,
  guestBookDetail,
  updatePassword,
  updateEmail,
} = require("./sqlExecute/index");

const { getDCBestPosts, getDCBestPostDetail } = require("./controller/dcbest");
const { baseDbConnection } = require("./dbConnection/baseDbConnection");
const keys = require("./apiKey/keys");
const CRAWLER_CONFIG = require("./config");

const { upload } = require("./multer/index");
const { router: crawlerRouter, setupScheduledCrawling } = require("./crawler/index");

const cors = require("cors");

app.use(cors());
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");

  next();
});

// 크롤링 라우터 추가
app.use("/crawler", crawlerRouter);

cron.schedule("0 9 * * *", async () => {
  console.log("매일 오전 9시에 실행되는 작업");
  try {
    const connection = await baseDbConnection(); // 데이터베이스 연결
    await oneDaySql(connection); // 쿼리 실행
    await connection.close(); // 연결 종료
  } catch (err) {
    console.error("작업 실패:", err);
  }
});

// 매일 10분마다 디시인사이드 크롤링 실행
cron.schedule("*/10 * * * *", async () => {
  console.log("매일 10분마다 디시인사이드 크롤링 실행");
  try {
    // 실시간베스트 크롤링 (1페이지)
    const axios = require('axios');
    const response = await axios.post('http://localhost:4000/crawler/dcinside/best', {
      galleryId: CRAWLER_CONFIG.GALLERY_ID,
      maxPages: CRAWLER_CONFIG.MAX_PAGES
    });
    console.log('크롤링 완료:', response.data);
  } catch (err) {
    console.error("크롤링 실패:", err);
  }
});

app.get("/main", async (req, res) => {
  try {
    // 디비 연결!
    console.log("디비연결 시도");
    const connection = await baseDbConnection();
    const response = await main(connection);
    res.send(response);
    await connection.close();
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/saveUser", async (req, res) => {
  try {
    // 디비 연결!
    const connection = await baseDbConnection();
    const response = await saveUser(connection, req);
    res.send(response);
    await connection.close();
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/login", async (req, res) => {
  console.log("login");
  try {
    // 디비 연결!
    const connection = await baseDbConnection();
    const response = await loginUser(connection, req);
    res.send(response);
    await connection.close();
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});
////////////////////////////////////////////////////////////////////////////
/* 실시간베스트 */
/////////////////////////////////////////////////////////////////////////////

app.get("/dcbest", getDCBestPosts);

app.get("/dcbest/:postId", getDCBestPostDetail);

/* 방명록 */
/////////////////////////////////////////////////////////////////////////////

app.get("/guestBook", async (req, res) => {
  const index = req.query.index;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  console.log("guestBook:", index, page, limit);
  try {
    // 디비 연결!
    const connection = await baseDbConnection();

    // 페이지네이션된 데이터와 총 개수를 동시에 조회
    const [response, total] = await Promise.all([
      guestBookList(connection, { index, page, limit }),
      guestBookCount(connection),
    ]);

    res.send({
      data: response,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
    await connection.close();
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// 단일 게시글 조회 API 추가
app.get("/guestBook/detail/:index", async (req, res) => {
  const index = req.params.index;
  console.log("guestBook/detail:", index);
  try {
    const connection = await baseDbConnection();
    const response = await guestBookDetail(connection, { index });
    res.send(response);
    await connection.close();
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// studyHistoryback 단일 게시글 조회 API 추가
app.get("/studyHistoryback/detail/:index", async (req, res) => {
  const index = req.params.index;
  console.log("studyHistoryback/detail:", index);
  try {
    const connection = await baseDbConnection();
    const response = await guestBookDetail(connection, { index });
    res.send(response);
    await connection.close();
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/studyHistoryback", async (req, res) => {
  const index = req.query.index;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  console.log("studyHistoryback:", index, page, limit);
  try {
    // 디비 연결!
    const connection = await baseDbConnection();

    // 페이지네이션된 데이터와 총 개수를 동시에 조회
    const [response, total] = await Promise.all([
      guestBookList(connection, { index, page, limit }),
      guestBookCount(connection),
    ]);

    res.send({
      data: response,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
    await connection.close();
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// POST 요청을 받아 이미지를 BLOB 열에 저장
app.post("/guestBook/create/:dynamicPath", async (req, res) => {
  console.log("/guestBook/create");
  const dynamicPath = req.params.dynamicPath;
  try {
    // 디비 연결!
    const connection = await baseDbConnection();
    const response = await guestBookCreate(connection, req);
    res.send(response);
    await connection.close();
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});
app.post("/guestBook/delete/:dynamicPath", async (req, res) => {
  console.log("dddd");
  try {
    // 디비 연결!
    const connection = await baseDbConnection();
    const response = await guestBookDelete(connection, req);
    res.send(response);
    await connection.close();
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});
app.get("/guestBook/reply", async (req, res) => {
  const index = req.query.index;
  console.log("guestBook/reply:", index);
  try {
    // 디비 연결!
    const connection = await baseDbConnection();
    const response = await guestBookReplyList(connection, { index });
    res.send(response);
    await connection.close();
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// POST 요청을 받아 이미지를 BLOB 열에 저장
app.post("/guestBook/reply", async (req, res) => {
  try {
    // 디비 연결!
    const connection = await baseDbConnection();
    const response = await guestBookReplyCreate(connection, req);
    res.send(response);
    await connection.close();
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

////////////////////////////////////////////////////////////////////////////
/* 에디터 이미지 처리 */
/////////////////////////////////////////////////////////////////////////////
app.post("/img", upload.single("img"), (req, res) => {
  // 해당 라우터가 정상적으로 작동하면 public/uploads에 이미지가 업로드된다.
  // 업로드된 이미지의 URL 경로를 프론트엔드로 반환한다.
  // console.log('전달받은 파일', req.file);
  // console.log('저장된 파일의 이름', req.file.filename);

  // 파일이 저장된 경로를 클라이언트에게 반환해준다.
  const IMG_URL = `http://138.2.119.188:4000/uploads/${req.file.filename}`;
  // const IMG_URL = `http://localhost:4000/uploads/${req.file.filename}`; 
  res.json({ url: IMG_URL });
});
////////////////////////////////////////////////////////////////////////////
/* 에디터 이미지 처리 */
/////////////////////////////////////////////////////////////////////////////
app.post("/weather", async (req, res) => {
  console.log("weather");
  if (req.body.key == null) {
    return res.send("Internal Server Error");
  }
  try {
    let ip =
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.connection.socket ? req.connection.socket.remoteAddress : null);

    // 실제 IP 주소 가져오기 (프록시나 로컬에서 실행할 때 도움이 됩니다)
    // 로컬 호스트 처리: 필요 시 하드코딩된 IP 사용
    if (ip === "::1" || ip === "127.0.0.1") {
      ip = "210.89.164.90"; // 테스트를 위한 공용 IP
    }

    //ip로 주소 가져오기 (도시 정보는 방문 로그에 사용)
    const responseIP = await axios.get(`http://ip-api.com/json/${ip}`);
    const data = responseIP.data;

    // 방문자 체크용 DB (날씨 API 성공 여부와 무관하게 기록)
    let responseDB = { code: "0000", message: "등록 성공" };
    try {
      const insertV = { ip: ip, city: data.city };
      const connection = await baseDbConnection();
      responseDB = await visitLog(connection, insertV);
      await connection.close();
    } catch (dbErr) {
      console.error("visitLog DB error:", dbErr);
    }

    // 가져온 위경도로 날씨 조회 (실패해도 응답은 정상 반환)
    let weatherArray = [];
    try {
      const apikey = keys.weatherKey;
      console.log("aa", apikey);
      const lang = "kr";
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${data.lat}&lon=${data.lon}&lang=${lang}&appid=${apikey}`;
      const responseWeather = await axios.get(url);
      weatherArray = responseWeather.data.weather || [];
    } catch (wErr) {
      console.error(
        "weather fetch error:",
        wErr?.response?.status || wErr?.message || wErr
      );
    }

    res.json({
      city: data.city,
      weather: weatherArray,
      rtn: responseDB,
    });

    // res.send(`접속한 IP: ${ip}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});
app.post("/visitCnt", async (req, res) => {
  try {
    // 디비 연결!
    const connection = await baseDbConnection();
    const response = await visitCnt(connection);
    await connection.close();
    res.send(response[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

////////////////////////////////////////////////////////////////////////////
/* 사용자 정보 수정 */
/////////////////////////////////////////////////////////////////////////////
app.post("/updatePassword", async (req, res) => {
  try {
    // 디비 연결!
    const connection = await baseDbConnection();
    const response = await updatePassword(connection, req);
    res.send(response);
    await connection.close();
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/updateEmail", async (req, res) => {
  try {
    // 디비 연결!
    const connection = await baseDbConnection();
    const response = await updateEmail(connection, req);
    res.send(response);
    await connection.close();
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(4000, () => {
  console.log("서버가 실행되었습니다.");
  
  // 크롤링 스케줄러 시작
  setupScheduledCrawling();
  console.log("크롤링 스케줄러가 시작되었습니다.");
});
