const oracledb = require("oracledb");
const dbConfig = require("../dbConfig/config");

async function baseDbConnection() {
  return new Promise(async (resolve, reject) => {
    try {
      const connection = await oracledb.getConnection(dbConfig);
      resolve(connection);
    } catch (err) {
      console.error("1", err.message);
      reject(err);
    }
  });
}

module.exports = {
  baseDbConnection,
};
