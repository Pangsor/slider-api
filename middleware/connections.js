const mysql = require('mysql');
const cf = require('config');

const dbServer = mysql.createConnection({
  host     : cf.get('db_host'),
  user     : cf.get('db_user'),
  password : cf.get('db_pass'),
  database : cf.get('db_name')
});

const poolServer = mysql.createPool({
  connectionLimit: 5,
  host: cf.get('db_host'),
  user: cf.get('db_user'),
  password: cf.get('db_pass'), 
  database: cf.get('db_name')
})

exports.dbServer = dbServer;
exports.poolServer = poolServer;