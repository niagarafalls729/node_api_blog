const { mainSqlQuery, saveUserSqlQuery,loginUserSqlQuery,guestBookListSqlQuery,guestBookInsertSqlQuery } = require("../sqlQuery/index");
const dayjs = require("dayjs");
const oracledb = require('oracledb');
const fs = require('fs'); // 파일 시스템 모듈 
 
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
const guestBookList = (connection, req) => {
  return new Promise((resolve, reject) => { 
    connection.execute(guestBookListSqlQuery(), (err, result) => {
      if (err) {
        console.error("2:", err.message);
        reject(err); // 에러 발생 시 reject를 호출하여 프로미스를 거부합니다.
        return;
      }
      const rows = result.rows;
      console.log("rows",rows)
      const jsonData = rows.map((row) => { 
        return {
          title: row[0],
          contents : row[1],
          creation_timestamp: row[2],
          id: row[3],
          code : "0000", 
        };
      });
      console.log("jsonData",jsonData)
      resolve(jsonData); // 성공 시 resolve를 호출하여 프로미스를 해결합니다.
    });
  });
};
const guestBookCreate = async (connection, req, filePath) => {
  try {
    // BLOB 열을 초기화
    const result = await connection.execute(
      `INSERT INTO GUESTBOOK (TITLE, CONTENTS, CREATION_TIMESTAMP, ID)
       VALUES (:title, EMPTY_BLOB(), SYSTIMESTAMP AT TIME ZONE 'Asia/Seoul', :id)
       RETURNING CONTENTS INTO :contentBlob`,
      {
        title: '제목',
        id: '아이디',
        contentBlob: { type: oracledb.BLOB, dir: oracledb.BIND_OUT }
      }
    );

    if (result.outBinds.contentBlob) {
      const lob = result.outBinds.contentBlob;
      if (filePath && fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath);
        await lob.write(data);
      } else {
        // 파일이 없는 경우, 기본 HTML 컨텐츠를 BLOB 열에 삽입
        const defaultContent = '<p>기본 내용</p>';
        await lob.write(defaultContent);
      }
      await lob.end();
    } else {
      console.error('BLOB 초기화 실패');
    }

    // 커밋 수행
    await connection.commit();

    console.log('BLOB 데이터 삽입 완료');
  } catch (err) {
    console.error('BLOB 데이터 삽입 오류:', err.message);
  }
};




module.exports = {
  main,
  saveUser,
  loginUser,
  guestBookList,
  guestBookCreate
};
