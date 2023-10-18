const  { mainSqlQuery }  = require('../sqlQuery/index')

const main = (connection) => {
  return new Promise((resolve, reject) => {

    console.log("main",JSON.stringify(mainSqlQuery))
    connection.execute(mainSqlQuery, (err, result) => {
      if (err) {
        console.error("2:", err.message);
        reject(err); // 에러 발생 시 reject를 호출하여 프로미스를 거부합니다.
        return;
      }
      const rows = result.rows;
      const jsonData = rows.map(row => {
        const employmentFrom = new Date(row[1]);
        const employmentTo = row[2] ? new Date(row[2]) : '재직중';

        // 1. project_from_to 열에 대한 날짜 데이터를 JavaScript Date 객체로 변환
        const projectFrom = new Date(row[4]);
        const projectTo = row[5] ? new Date(row[5]) : '진행중';

        // 2. Intl.DateTimeFormat을 사용하여 날짜를 원하는 형식으로 포맷
        const formatter = new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });

        const formattedEmploymentFrom = formatter.format(employmentFrom);
        const formattedEmploymentTo = employmentTo !== '재직중' ? formatter.format(employmentTo) : '재직중';

        // 3. project_from_to 열에 대한 포맷된 날짜를 생성
        const formattedProjectFrom = formatter.format(projectFrom);
        const formattedProjectTo = projectTo !== '진행중' ? formatter.format(projectTo) : '진행중';

        // 4. JSON 객체에 저장
        return {
          company: row[0],
          company_from_to: formattedEmploymentFrom + '~' + formattedEmploymentTo,
          project: row[3],
          project_from_to: formattedProjectFrom + '~' + formattedProjectTo,
          desc: row[6],
          stack: row[7],
          work: row[8]
        };
      });
      resolve(jsonData); // 성공 시 resolve를 호출하여 프로미스를 해결합니다.
    });
  });
};

module.exports = {
  main,
};

