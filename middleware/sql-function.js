const mysql = require('mysql');
const conn = require('./connections');
const {logger} = require('./logger');
const { idCluster } = require('./generator');
const cf = require('config');

let dbToko = mysql.createPoolCluster();
const dbServer = conn.poolServer;

exports.SelectQuery = function (strIdCluster, strQuery) {
  return new Promise(async(resolve, reject) => {
    let pool = dbToko.of(strIdCluster);

    pool.query(strQuery ,(err, row, field) => {
      if(err) {
        logger.error(err);
        return reject([err]);
      }
      return resolve([row, field]);
    });
  });
}

exports.InsertQuery = function (strIdCluster, strQuery){
  return new Promise(async(resolve, reject) => {
    let pool = dbToko.of(strIdCluster);

    pool.query(strQuery ,(err, row, field) => {
      if(err) {
        logger.error(err);
        return reject([err]);
      }
      return resolve("success");
    })
  })
}

exports.UpdateQuery = function (strIdCluster, strQuery){
  return new Promise(async(resolve, reject) => {
    let pool = dbToko.of(strIdCluster);

    pool.query(strQuery ,(err, row, field) => {
      if(err) {
        logger.error(err);
        return reject([err]);
      }
      return resolve("success");
    })
  })
}

exports.DeleteQuery = function (strIdCluster, strQuery){
  return new Promise(async(resolve, reject) => {
    let pool = dbToko.of(strIdCluster);

    pool.query(strQuery ,(err, row, field) => {
      if(err) {
        logger.error(err);
        return reject([err]);
      }
      return resolve("success");
    })
  })
}

exports.RunQuery = function (strIdCluster, strQuery){
  return new Promise(async(resolve, reject) => {
    let pool = dbToko.of(strIdCluster);

    pool.query(strQuery ,(err, row, field) => {
      if(err) {
        logger.error(err);
        return reject([err]);
      }
      return resolve("success");
    })
  })
}

exports.createConnToko = async function(kodeToko, strIdCluster){
  return new Promise(async(resolve, reject) => {
    dbServer.query(`SELECT db_name FROM tp_toko WHERE kode_toko = '${kodeToko}'`,(err, row, field) => {
      if(err) {
        logger.error(err);
        return reject([err]);
      }
      if (row.length === 0) return reject('Data Toko Tidak Di Temukan !');


      dbToko.add(strIdCluster, {
        host     : cf.get('db_host'),
        user     : cf.get('db_user'),
        password : cf.get('db_pass'),
        database : row[0].db_name,
        // database : cf.get('db_name'),
        debug      : false,
        dateStrings: true,
        connectionLimit     : 10,
        defaultSelector     : 'RR',
        multipleStatements  : true,
        removeNodeErrorCount: 1
      });

      dbToko.getConnection(strIdCluster, (err, connection) => {
        if(err){
          logger.error(err);
          return reject(err);
        }
        return resolve('success.');
      })

    })

  })
}

exports.StartTransaction = async function (strIdCluster){
  return new Promise(async(resolve, reject) => {
    dbToko.getConnection(strIdCluster,async (err, connection) => {
      if(err){
        logger.error(err);
        return reject(err);
      }
      await connection.beginTransaction((err) => {
        if (err) {
          return reject(err);
        }
        return resolve('success.');
      });
    })
  })
}

exports.CommitTransaction = async function (strIdCluster){
  return new Promise(async(resolve, reject) => {
    dbToko.getConnection(strIdCluster,async (err, connection) => {
      if(err){
        logger.error(err);
        await connection.rollback();
        return reject(err);
      }
      await connection.commit(async (err) => {
        if (err) {
          await connection.rollback();
          return reject(err);
        }
        return resolve('success.');
      });
    })
  })
}

exports.RollBackTransaction = async function (strIdCluster) {
  return new Promise(async(resolve, reject) => {
    dbToko.getConnection(strIdCluster,async (err, connection) => {
      if(err){
        logger.error(err);
        return reject(err);
      }
      await connection.rollback();
      return resolve('success.');
    })
  })
}

exports.closeConnection = async function (strIdCluster) {
  var index = idCluster.indexOf(strIdCluster);
  if (index !== -1) idCluster.splice(index, 1);

  await dbToko.remove(strIdCluster);
}