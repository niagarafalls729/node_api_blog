const { mainSqlQuery } = require("../sqlQuery/index");
const dayjs = require("dayjs");
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

module.exports = {
  main,
};
