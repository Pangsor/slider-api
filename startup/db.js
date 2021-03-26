const conn = require('../middleware/connections');
const winston = require('winston');

module.exports = function() {
  // conn.dbServer.connect((err) => {
  //   if(err){
  //     console.log(err.message)
  //     throw err;
  //   }
  //   winston.info('MySql Database Connected.')
  // });
  conn.poolServer.getConnection((err, connection) => {
    if(err){
      console.log(err.message)
      throw err;
    }
    winston.info('MySql Database Connected.')
  })
}