const express = require('express');
const app = express(); 

const { baseDbConnection } = require('./dbConnection/baseDbConnection');
const { main} =  require('./sqlExecute/index');
//cors 에러
const cors = require("cors");

app.use(cors());
 
app.get('/main', async (req, res) => {
  try {
    // 디비 연결!
    const connection = await baseDbConnection();
    const response = await main(connection);
    res.send(response);
    await connection.close();
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(4000, () => {
  console.log('서버가 실행되었습니다.');
});
