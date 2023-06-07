const oracledb = require('oracledb');
const dbConfig = require('./dbConfig/config');

async function dbConnection() {
    return new Promise((resolve, reject) => {
      oracledb.getConnection(dbConfig, (err, connection) => {
        if (err) {
          console.error(err.message);
          reject(err); // Reject the promise if there is an error
          return;
        }
  
        connection.execute('SELECT * FROM study_history', (err, result) => {
          if (err) {
            console.error(err.message);
            reject(err); // Reject the promise if there is an error
            return;
          } 
          const rows = result.rows;
          const jsonData = rows.map(row => {
            return {
              id: row[0],
              title: row[1],
              content: row[2],
              date: row[3]
            };
          }); 

          console.log(jsonData[0]);
          console.log(jsonData[1]);
          resolve(jsonData); // Resolve the promise with the result
  
          connection.close((err) => {
            if (err) {
              console.error(err.message);
            }
          });
        });
      });
    });
  }
  
module.exports = {
    dbConnection
};