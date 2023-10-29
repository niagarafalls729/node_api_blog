const { mainSqlQuery, saveUserSqlQuery,loginUserSqlQuery,guestBookListSqlQuery,guestBookInsertSqlQuery,
  guestBookReplyListSqlQuery,
  guestBookReplyInsertSqlQuery, } = require("../sqlQuery/index");
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc'); // UTC 플러그인
const timezone = require('dayjs/plugin/timezone'); // 타임존 플러그인

dayjs.extend(utc);
dayjs.extend(timezone);

const oracledb = require('oracledb');
const fs = require('fs'); // 파일 시스템 모듈 
// function convertToKoreanTime(utcTime) {
//   console.log("utcTime",utcTime)
//   // UTC 시간을 dayjs 객체로 파싱
//   const utcMoment = dayjs(utcTime).utc();

//   // 시간대를 한국 시간대로 설정
//   const koreanMoment = utcMoment.tz('Asia/Seoul');

//   return koreanMoment;
// }
function convertToKoreanTime(utcTime) {
  const koreanTime = dayjs.utc(utcTime).tz('Asia/Seoul');
  return koreanTime.format('YYYY-MM-DD HH:mm');
}
const main = (connection) => {
  return new Promise((resolve, reject) => {
    // console.log("main",JSON.stringify(mainSqlQuery))
    connection.execute(mainSqlQuery, (err, result) => {
      if (err) {
        console.error("2:", err.message);
        reject(err); // 에러 발생 시 reject를 호출하여 프로미스를 거부합니다.
        return;
      }
      const rows = result.rows;
      const jsonData = rows.map((row) => {
        const employmentFrom = dayjs(new Date(row[1])).format("YYYY-MM-DD");
        const employmentTo = row[2]
          ? dayjs(new Date(row[2])).format("YYYY-MM-DD")
          : "재직중";

        // 1. project_from_to 열에 대한 날짜 데이터를 JavaScript Date 객체로 변환
        const projectFrom = dayjs(new Date(row[4])).format("YYYY-MM-DD");
        const projectTo = row[5]
          ? dayjs(new Date(row[5])).format("YYYY-MM-DD")
          : "진행중";

        // 4. JSON 객체에 저장
        return {
          company: row[0],
          company_from_to: employmentFrom + "~" + employmentTo,
          project: row[3],
          project_from_to: projectFrom + "~" + projectTo,
          desc: row[6],
          stack: row[7],
          work: row[8],
        };
      });
      resolve(jsonData); // 성공 시 resolve를 호출하여 프로미스를 해결합니다.
    });
  });
};

const saveUser = (connection, req) => {
  const data = req.body; // JSON 데이터는 req.body에 저장됩니다.
  // data 객체에서 필요한 정보를 추출하거나 처리합니다.
  const id = data.id;
  const pw = data.pw;
  const email = data.email;
  console.log(saveUserSqlQuery(id, pw, email));
  return new Promise((resolve, reject) => {
    connection.execute(saveUserSqlQuery(id, pw, email), (err, result) => {
      if (err) {
        console.error("2:", err.message);
        reject(err);
        return;
      }
      // 변경 내용을 모두 반영하고 커밋 수행
      connection.commit((commitErr) => {
        if (commitErr) {
          console.error("Commit error:", commitErr.message);
          reject(commitErr);
          return;
        }

        const jsonData = { code: "0000", message: "회원가입 성공" };
        resolve(jsonData);
      });
    });
  });
};
const loginUser = (connection, req) => {
  return new Promise((resolve, reject) => {
    const data = req.body; // JSON 데이터는 req.body에 저장됩니다.
    // data 객체에서 필요한 정보를 추출하거나 처리합니다.
    const id = data.id;
    const pw = data.pw; 
    connection.execute(loginUserSqlQuery(id, pw), (err, result) => {
      if (err) {
        console.error("2:", err.message);
        reject(err); // 에러 발생 시 reject를 호출하여 프로미스를 거부합니다.
        return;
      }
      const rows = result.rows;
      console.log("rows",rows)
      const jsonData = rows.map((row) => { 
        return {
          id: row[0],
          email : row[2],
          code: "0000",
          message: "로그인 성공",
          status : true

        };
      });
      console.log("jsonData",jsonData)
      resolve(jsonData); // 성공 시 resolve를 호출하여 프로미스를 해결합니다.
    });
  });
};
const guestBookList = (connection, {index}) => {
  return new Promise((resolve, reject) => {  
    console.log("guestBookList",index)
    console.log("guestBookListSqlQuery(index)",guestBookListSqlQuery(index))
    connection.execute(guestBookListSqlQuery(index), (err, result) => {
      if (err) {
        console.error("2:", err.message);
        reject(err); // 에러 발생 시 reject를 호출하여 프로미스를 거부합니다.
        return;
      }
      const rows = result.rows;
      // console.log("rows",rows)
      const jsonData = rows.map((row,idx) => { 
        return {
          title: row[0],
          creation_timestamp :convertToKoreanTime(row[1]),
          id: row[2],
          contents: row[3],
          index : row[4] ,
          password : row[5] ,
          member_create: row[6],
        };
      });
      // console.log("jsonData",jsonData)
      resolve(jsonData); // 성공 시 resolve를 호출하여 프로미스를 해결합니다.
    });
  });
};
const guestBookCreate = async (connection, req, filePath) => {
  return new Promise((resolve, reject) => {
    const data = req.body; // JSON 데이터는 req.body에 저장됩니다.
    // data 객체에서 필요한 정보를 추출하거나 처리합니다.
    const title = data.title;
    const contents = data.contents; 
    const id = data.id; 
    const index = data.index; 
    const pw = data.password; 
    const member_create = data.member_create; 
    console.log("title, contents, id,index",title, contents, id,index,pw,member_create)
    console.log("guestBookInsertSqlQuery",guestBookInsertSqlQuery(title, contents, id,index,pw))
    
    connection.execute(guestBookInsertSqlQuery(title, contents, id,index,pw,member_create), (err, result) => {
      if (err) {
        console.error("2:", err.message);
        reject(err);
        return;
      }
      // 변경 내용을 모두 반영하고 커밋 수행
      connection.commit((commitErr) => {
        if (commitErr) {
          console.error("Commit error:", commitErr.message);
          reject(commitErr);
          return;
        } 
        const jsonData = { code: "0000", message: "등록 성공" };
        resolve(jsonData);
      });
    });
  });
};


const guestBookReplyList = (connection, {index}) => {
  return new Promise((resolve, reject) => {  
    console.log("guestBookReplyList",index)
    console.log("guestBookReplyList(index)",guestBookReplyListSqlQuery(index))
    connection.execute(guestBookReplyListSqlQuery(index), (err, result) => {
      if (err) {
        console.error("2:", err.message);
        reject(err); // 에러 발생 시 reject를 호출하여 프로미스를 거부합니다.
        return;
      }
      const rows = result.rows;
      console.log("rows",rows)
      const jsonData = rows.map((row,idx) => { 
        return {
          creation_timestamp :convertToKoreanTime(row[0]),
          id: row[1],
          contents: row[2],
          index : row[3] ,
          member_create: row[4],
          guestbook_fk : row[5] ,
        };
      });
      // console.log("jsonData",jsonData)
      resolve(jsonData); // 성공 시 resolve를 호출하여 프로미스를 해결합니다.
    });
  });
};
const guestBookReplyCreate = async (connection, req, filePath) => {
  return new Promise((resolve, reject) => {
    const data = req.body; // JSON 데이터는 req.body에 저장됩니다.
    // data 객체에서 필요한 정보를 추출하거나 처리합니다.
    const title = data.title;
    const contents = data.contents; 
    const id = data.id; 
    const index = data.index; 
    const pw = data.password; 
    const member_create = data.member_create; 
    const guestbook_fk = data.guestbook_fk
    console.log("title, contents, id,index",title, contents, id,index,pw,member_create)
    console.log("guestBookInsertSqlQuery",guestBookReplyInsertSqlQuery(contents, id,  index ,member_create,guestbook_fk))
    
    connection.execute(guestBookReplyInsertSqlQuery(contents, id,  index ,member_create,guestbook_fk), (err, result) => {
      if (err) {
        console.error("2:", err.message);
        reject(err);
        return;
      }
      // 변경 내용을 모두 반영하고 커밋 수행
      connection.commit((commitErr) => {
        if (commitErr) {
          console.error("Commit error:", commitErr.message);
          reject(commitErr);
          return;
        } 
        const jsonData = { code: "0000", message: "등록 성공" };
        resolve(jsonData);
      });
    });
  });
};



module.exports = {
  main,
  saveUser,
  loginUser,
  guestBookList,
  guestBookCreate,
  guestBookReplyList,
  guestBookReplyCreate
};

