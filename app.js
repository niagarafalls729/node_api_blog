const express = require("express");
const bodyParser = require("body-parser");
const app = express();
app.use(bodyParser.json());

const { main, saveUser,loginUser,guestBookCreate ,guestBookList} = require("./sqlExecute/index");
const { baseDbConnection } = require("./dbConnection/baseDbConnection");
const cors = require("cors");

app.use(cors());

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


app.get("/guestBook", async (req, res) => {
  try {
    // 디비 연결!
    const connection = await baseDbConnection();
    const response = await guestBookList(connection);
    res.send(response);
    await connection.close();
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// POST 요청을 받아 이미지를 BLOB 열에 저장
app.post("/guestBook/Create", async (req, res) => {
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

app.listen(4000, () => {
  console.log("서버가 실행되었습니다.");
});
