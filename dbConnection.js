const oracledb = require('oracledb');
const dbConfig = require('./dbConfig/config');

function dbConnection() { // 데이터베이스 연결 구성
    
    // 데이터베이스 연결
    oracledb.getConnection(dbConfig, (err, connection) => {
        if (err) {
            console.error(err.message);
            return;
        }
        
        // 쿼리 실행
        connection.execute('SELECT * FROM study_history', (err, result) => {
            if (err) {
                console.error(err.message);
                return;
            }

            console.log(result.rows);
            // 결과 출력

            // 연결 종료
            connection.close((err) => {
                if (err) {
                    console.error(err.message);
                }
            });
        });
    });
}
module.exports = {
    dbConnection
};