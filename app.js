const express = require('express');
const app = express();
const { dbConnection } = require('./dbConnection');





app.get('/login', (req, res) => {
  res.send('Hello, World!');
  dbConnection();
  console.log("접속");
});

app.listen(3000, () => {
  console.log('서버가 실행되었습니다.');
});
