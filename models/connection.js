/**
 * 数据库连接
 */
const mysql = require('mysql');
exports.getConnection = function () {
  let connection = mysql.createConnection({
    host: 'localhost',
    database: 'safety'
    // user:'',
    // password:''
  });
  connection.connect();
  return connection;
};
