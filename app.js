const express = require("express");
const bodyParser = require("body-parser");
const path = require('path');
const app = express();

// 미들웨어 사용
app.use(express.json()); // json 데이터 파서
app.use(express.urlencoded({ extended: false })); // 내부 url 파서 사용
app.use(express.static(path.join(__dirname + '/public'))); // 정적 파일 위치 설정
app.use(bodyParser.json());

const { main, saveUser,loginUser,guestBookCreate ,guestBookDelete,guestBookList,guestBookReplyList,guestBookReplyCreate,
        studyHistoryList,studyHistoryCreate,studyHistoryDelete,studyHistoryReplyList, studyHistoryReplyCreate     } = require("./sqlExecute/index");
const { baseDbConnection } = require("./dbConnection/baseDbConnection");
const { upload } = require("./multer/index");


const cors = require("cors");

app.use(cors());
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');

  next();
});
app.get("/main", async (req, res) => {
  try {
    // 디비 연결!
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
  console.log("login")
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
/* 방명록 */
/////////////////////////////////////////////////////////////////////////////


app.get("/guestBook", async (req, res) => {
  const index = req.query.index;
  console.log('guestBook:', index);
  try {
    // 디비 연결!
    const connection = await baseDbConnection(); 
    const response = await guestBookList(connection,{index});
    res.send(response);
    await connection.close();
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// POST 요청을 받아 이미지를 BLOB 열에 저장
app.post("/guestBook/create/:dynamicPath", async (req, res) => {
  console.log("/guestBook/create")
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
  console.log("dddd")
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
  console.log('guestBook/reply:', index); 
  try {
    // 디비 연결!
    const connection = await baseDbConnection(); 
    const response = await guestBookReplyList(connection,{index});
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
/* 공부일지 */
/////////////////////////////////////////////////////////////////////////////
app.get("/studyHistory", async (req, res) => {
  console.log("studyHistory")
  const index = req.query.index;
  try {
    // 디비 연결!
    const connection = await baseDbConnection(); 
    const response = await studyHistoryList(connection,{index});
    res.send(response);
    await connection.close();
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// POST 요청을 받아 이미지를 BLOB 열에 저장
app.post("/studyHistory/create/:dynamicPath", async (req, res) => {
  console.log("/studyHistory/create")
   const dynamicPath = req.params.dynamicPath;
  try {
    // 디비 연결!
    const connection = await baseDbConnection(); 
    const response = await studyHistoryCreate(connection, req);
    res.send(response);
    await connection.close();
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
}); 
app.post("/studyHistory/delete/:dynamicPath", async (req, res) => {
  console.log("dddd")
  try {
    // 디비 연결!
    const connection = await baseDbConnection(); 
    const response = await studyHistoryDelete(connection, req);
    res.send(response);
    await connection.close();
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});
app.get("/studyHistory/reply", async (req, res) => {
  const index = req.query.index; 
  try {
    // 디비 연결!
    const connection = await baseDbConnection(); 
    const response = await studyHistoryReplyList(connection,{index});
    res.send(response);
    await connection.close();
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// POST 요청을 받아 이미지를 BLOB 열에 저장
app.post("/studyHistory/reply", async (req, res) => {
  try {
    // 디비 연결!
    const connection = await baseDbConnection(); 
    const response = await studyHistoryReplyCreate(connection, req);
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
app.post('/img', upload.single('img'), (req, res) => {
  
  // 해당 라우터가 정상적으로 작동하면 public/uploads에 이미지가 업로드된다.
  // 업로드된 이미지의 URL 경로를 프론트엔드로 반환한다.
  console.log('전달받은 파일', req.file);
  console.log('저장된 파일의 이름', req.file.filename);

  // 파일이 저장된 경로를 클라이언트에게 반환해준다.
  const IMG_URL = `http://138.2.119.188:4000/uploads/${req.file.filename}`;
  // const IMG_URL = `http://127.0.0.1:4000/uploads/${req.file.filename}`;
  console.log(IMG_URL);
  res.json({ url: IMG_URL });
});


app.listen(4000, () => {
  console.log("서버가 실행되었습니다.");
});
