const {
  mainSqlQuery,
  saveUserSqlQuery,
  loginUserSqlQuery,
  guestBookListSqlQuery,
  guestBookCountSqlQuery,
  guestBookDetailSqlQuery,
  guestBookInsertSqlQuery,
  guestBookReplyListSqlQuery,
  guestBookReplyInsertSqlQuery,
  guestBookDeleteSqlQuery,
  visitLogSqlQuery,
  visitCntSqlQuery,
  oneDaySqlQuery,
  updatePasswordSqlQuery,
  updateEmailSqlQuery,
  verifyPasswordSqlQuery,
} = require("../sqlQuery/index");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc"); // UTC 플러그인
const timezone = require("dayjs/plugin/timezone"); // 타임존 플러그인

dayjs.extend(utc);
dayjs.extend(timezone);

const oracledb = require("oracledb");

function convertToKoreanTime(utcTime) {
  const koreanTime = dayjs.utc(utcTime).tz("Asia/Seoul");
  return koreanTime.format("YYYY-MM-DD HH:mm");
}
const fs = require("fs").promises;
const path = require("path");
const logDir = path.join(__dirname, "..", "log");
const logFilePath = path.join(logDir, "cron.log");

// 로그 디렉토리 존재 여부 확인 및 생성
const ensureLogDirectory = async () => {
  try {
    await fs.access(logDir); // 디렉토리 접근 권한 확인
  } catch (err) {
    if (err.code === "ENOENT") {
      // 디렉토리가 존재하지 않으면 생성
      await fs.mkdir(logDir);
    } else {
      throw err; // 다른 오류는 다시 던짐
    }
  }
};

// 로그 작성 함수 (async/await와 fs.promises 사용)
const writeLog = async (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}\n`;
  try {
    await fs.appendFile(logFilePath, logMessage);
    console.log("로그 작성 완료:", logMessage);
  } catch (err) {
    console.error("로그 파일 작성 중 오류 발생:", err);
  }
};
const oneDaySql = (connection) => {
  console.log("oneDaySql");
  ensureLogDirectory();
  return new Promise((resolve, reject) => {
    connection.execute(oneDaySqlQuery, async (err, result) => {
      if (err) {
        console.error("작업 실패:", err);
        await writeLog(`작업 실패: ${err.message}`);
        reject(err);
        return;
      }
      // 작업 성공 처리
      console.log("작업 성공:", result);
      await writeLog("작업 성공");
      resolve(result);
    });
  });
};

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
          link: row[9],
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
      console.log("rows", rows);
      const jsonData = rows.map((row) => {
        return {
          id: row[0],
          email: row[2],
          code: "0000",
          message: "로그인 성공",
          status: true,
        };
      });
      console.log("jsonData", jsonData);
      resolve(jsonData); // 성공 시 resolve를 호출하여 프로미스를 해결합니다.
    });
  });
};
const guestBookList = (connection, { index, page = 1, limit = 10 }) => {
  return new Promise((resolve, reject) => {
    connection.execute(
      guestBookListSqlQuery(index, page, limit),
      (err, result) => {
        if (err) {
          console.error("2:", err.message);
          reject(err); // 에러 발생 시 reject를 호출하여 프로미스를 거부합니다.
          return;
        }
        const rows = result.rows;
        // console.log("rows",rows)
        const jsonData = rows.map((row, idx) => {
          return {
            title: row[0],           // g.title
            creation_timestamp: convertToKoreanTime(row[1]), // g.creation_timestamp
            id: row[2],              // g.id
            contents: row[3],        // g.contents
            index: row[4],           // g.idx
            password: row[5],        // g.password
            member_create: row[6],   // g.member_create
            replyCount: row[7] || 0, // reply_count
          };
        });
        // console.log("jsonData",jsonData)
        resolve(jsonData); // 성공 시 resolve를 호출하여 프로미스를 해결합니다.
      }
    );
  });
};

const guestBookCount = (connection) => {
  return new Promise((resolve, reject) => {
    connection.execute(guestBookCountSqlQuery(), (err, result) => {
      if (err) {
        console.error("2:", err.message);
        reject(err);
        return;
      }
      const total = result.rows[0][0];
      resolve(total);
    });
  });
};

// 단일 게시글 조회 함수 추가
const guestBookDetail = (connection, { index }) => {
  return new Promise((resolve, reject) => {
    console.log("guestBookDetail 호출:", index);
    connection.execute(guestBookDetailSqlQuery(index), (err, result) => {
      if (err) {
        console.error("guestBookDetail 에러:", err.message);
        reject(err);
        return;
      }
      const rows = result.rows;
      console.log("guestBookDetail 결과:", rows);

      if (rows.length === 0) {
        resolve(null);
        return;
      }

      const row = rows[0];
      const jsonData = {
        title: row[0],
        creation_timestamp: convertToKoreanTime(row[1]),
        id: row[2],
        contents: row[3],
        index: row[4],
        password: row[5],
        member_create: row[6],
      };
      console.log("guestBookDetail 변환된 데이터:", jsonData);
      resolve(jsonData);
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
    console.log(
      "title, contents, id,index",
      title,
      contents,
      id,
      index,
      pw,
      member_create
    );
    console.log(
      "guestBookInsertSqlQuery",
      guestBookInsertSqlQuery(title, contents, id, index, pw)
    );

    connection.execute(
      guestBookInsertSqlQuery(title, contents, id, index, pw, member_create),
      (err, result) => {
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
      }
    );
  });
};
const guestBookDelete = async (connection, req) => {
  return new Promise((resolve, reject) => {
    const index = req.body.index;
    console.log("index", index);
    connection.execute(guestBookDeleteSqlQuery(index), (err, result) => {
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
        const jsonData = { code: "0000", message: "삭제 성공" };
        resolve(jsonData);
      });
    });
  });
};

const guestBookReplyList = (connection, { index }) => {
  return new Promise((resolve, reject) => {
    console.log("guestBookReplyList", index);
    console.log("guestBookReplyList(index)", guestBookReplyListSqlQuery(index));
    connection.execute(guestBookReplyListSqlQuery(index), (err, result) => {
      if (err) {
        console.error("2:", err.message);
        reject(err); // 에러 발생 시 reject를 호출하여 프로미스를 거부합니다.
        return;
      }
      const rows = result.rows;
      console.log("rows", rows);
      const jsonData = rows.map((row, idx) => {
        return {
          creation_timestamp: convertToKoreanTime(row[0]),
          id: row[1],
          contents: row[2],
          index: row[3],
          member_create: row[4],
          guestbook_fk: row[5],
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
    const guestbook_fk = data.guestbook_fk;
    console.log(
      "title, contents, id,index",
      title,
      contents,
      id,
      index,
      pw,
      member_create
    );
    console.log(
      "guestBookInsertSqlQuery",
      guestBookReplyInsertSqlQuery(
        contents,
        id,
        index,
        member_create,
        guestbook_fk
      )
    );

    connection.execute(
      guestBookReplyInsertSqlQuery(
        contents,
        id,
        index,
        member_create,
        guestbook_fk
      ),
      (err, result) => {
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
      }
    );
  });
};

const visitLog = async (connection, req, filePath) => {
  return new Promise((resolve, reject) => {
    const data = req; // JSON 데이터는 req.body에 저장됩니다.

    // data 객체에서 필요한 정보를 추출하거나 처리합니다.

    const ip = data.ip;
    const city = data.city;
    console.log("ip, city", ip, city);

    connection.execute(visitLogSqlQuery(ip, city), (err, result) => {
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
const visitCnt = async (connection) => {
  console.log("visitCnt,isitCntSqlQuery");
  return new Promise((resolve, reject) => {
    connection.execute(visitCntSqlQuery, (err, result) => {
      if (err) {
        console.error("2:", err.message);
        reject(err); // 에러 발생 시 reject를 호출하여 프로미스를 거부합니다.
        return;
      }
      const rows = result.rows;
      const jsonData = rows.map((row) => {
        return {
          total: row[0],
          today: row[1],
        };
      });
      resolve(jsonData); // 성공 시 resolve를 호출하여 프로미스를 해결합니다.
    });
  });
};

// 사용자 정보 수정 함수들
const updatePassword = async (connection, req) => {
  return new Promise((resolve, reject) => {
    const { id, currentPassword, newPassword } = req.body;

    // 먼저 현재 비밀번호가 맞는지 확인
    connection.execute(
      verifyPasswordSqlQuery(id, currentPassword),
      (err, result) => {
        if (err) {
          console.error("비밀번호 확인 오류:", err.message);
          reject(err);
          return;
        }

        const count = result.rows[0][0];
        if (count === 0) {
          resolve({
            code: "0001",
            message: "현재 비밀번호가 일치하지 않습니다.",
          });
          return;
        }

        // 비밀번호 업데이트
        connection.execute(
          updatePasswordSqlQuery(id, newPassword),
          (updateErr, updateResult) => {
            if (updateErr) {
              console.error("비밀번호 업데이트 오류:", updateErr.message);
              reject(updateErr);
              return;
            }

            // 변경 내용을 모두 반영하고 커밋 수행
            connection.commit((commitErr) => {
              if (commitErr) {
                console.error("Commit error:", commitErr.message);
                reject(commitErr);
                return;
              }
              resolve({
                code: "0000",
                message: "비밀번호가 성공적으로 변경되었습니다.",
              });
            });
          }
        );
      }
    );
  });
};

const updateEmail = async (connection, req) => {
  return new Promise((resolve, reject) => {
    const { id, newEmail } = req.body;

    // 이메일 업데이트
    connection.execute(updateEmailSqlQuery(id, newEmail), (err, result) => {
      if (err) {
        console.error("이메일 업데이트 오류:", err.message);
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
        resolve({
          code: "0000",
          message: "이메일이 성공적으로 변경되었습니다.",
        });
      });
    });
  });
};

module.exports = {
  main,
  saveUser,
  loginUser,
  guestBookList,
  guestBookCount,
  guestBookCreate,
  guestBookReplyList,
  guestBookReplyCreate,
  guestBookDelete,
  visitLog,
  visitCnt,
  oneDaySql,
  guestBookDetail,
  updatePassword,
  updateEmail,
};
