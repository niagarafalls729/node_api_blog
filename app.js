const express = require('express');
const app = express();
const { dbConnection } = require('./dbConnection');
//cors 에러
const cors = require("cors");

app.use(cors());

app.get('/login', async (req, res) => {
  try {
    const response = await Promise.all([dbConnection()]);
    console.log("접속" + response);
    res.send(response);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});
app.listen(4000, () => {
  console.log('서버가 실행되었습니다.');
});
