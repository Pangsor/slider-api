const express = require(`express`);
const router = express.Router();
const dbToko = require('../../middleware/sql-function')
const {nsiAuth} = require('../../middleware/auth');
const {GenIdCluster} = require('../../middleware/generator');
const Joi = require('@hapi/joi');
const {DateNow} = require('../../middleware/datetime');
const {trimUcaseJSON} = require('../../middleware/function');
const { dbServer } = require('../../middleware/connections');

// ===============================================================================Get
router.get('/all', async(req, res) => {
  const strIdCluster = GenIdCluster("MDN", "CS01");
  if (strIdCluster[0] !== 200) return res.status(strIdCluster[0]).send(strIdCluster[1]);

  let resConn = await dbToko.createConnToko("MDN", strIdCluster[1])
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resConn[0] === 500) return res.status(resConn[0]).send(resConn[1]);

  try{
    const sqlQuery = `SELECT kode_stamp,nama_stamp FROM tm_stamp`;
    const resultSelect = await dbToko.SelectQuery(strIdCluster[1], sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if (resultSelect[0] === 500) {
      dbToko.closeConnection(strIdCluster[1]);
      return res.status(500).send({
        "status":"error",
        "pesan":resultSelect[1],
        "data":[{}]
      });
    }

    dbToko.closeConnection(strIdCluster[1]);

    if (resultSelect[1].length == 0){
      return res.send({
        "status":"berhasil",
        "pesan":"Data stamp tidak ditemukan",
        "data":resultSelect[1]
      });
    }else{
      return res.send({
        "status":"berhasil",
        "pesan":"berhasil",
        "data":resultSelect[1]
      });
    }
    
  }catch(error){
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500, error.message);
  }
})

// ===============================================================================Post
router.post('/', async(req, res) => {
  let tmpTgl = DateNow();

  const {error} = validateStampAdd(req.body);
  if (error) return res.status(500).send({
    "status":"error",
    "pesan":error.details[0].message,
    "data":[{}]
  });

  const strIdCluster = GenIdCluster("MDN", "CS01");
  if (strIdCluster[0] !== 200) return res.status(strIdCluster[0]).send(strIdCluster[1]);

  let resConn = await dbToko.createConnToko("MDN", strIdCluster[1])
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resConn[0] === 500) return res.status(resConn[0]).send(resConn[1]);

  var dataJson = trimUcaseJSON(req.body,[]);
  var sqlQuery = `SELECT kode_stamp FROM tm_stamp WHERE kode_stamp = '${dataJson[1].kode_stamp}' LIMIT 1`;
  
  var ResultSelect = await dbToko.SelectQuery(strIdCluster[1], sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (ResultSelect[0] === 500) {
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send({
      "status":"error",
      "pesan":"Internal Server Error !",
      "data":[{}]
    });
  }

  if (Object.keys(ResultSelect[1]).length !== 0) {
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send({
      "status":"error",
      "pesan":`Kode stamp : ${dataJson[1].kode_stamp} sudah ada !`,
      "data":[{}]
    });
  }

  sqlQuery = `INSERT INTO tm_stamp (kode_stamp,nama_stamp,input_by,input_date) VALUES ('${dataJson[1].kode_stamp}','${dataJson[1].nama_stamp}','-','${tmpTgl}')`;
  ResultSelect = await dbToko.InsertQuery(strIdCluster[1], sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (ResultSelect[0] === 500) {
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send({
      "status":"error",
      "pesan":"Internal Server Error !",
      "data":[{}]
    });
  }

  dbToko.closeConnection(strIdCluster[1]);
  return res.send({
    "status":"berhasil",
    "pesan":"Data stamp berhasil disimpan.",
    "data":[{}]
  });
})

// ===============================================================================Put
router.put('/', async(req, res) => {
  const {error} = validateStampEdit(req.body);
  if (error) return res.status(500).send({
    "status":"error",
    "pesan":error.details[0].message,
    "data":[{}]
  });

  const strIdCluster = GenIdCluster("MDN", "CS01");
  if (strIdCluster[0] !== 200) return res.status(strIdCluster[0]).send({
    "status":"error",
    "pesan":strIdCluster[1],
    "data":[{}]
  });

  let resConn = await dbToko.createConnToko("MDN", strIdCluster[1])
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resConn[0] === 500) return res.status(resConn[0]).send(resConn[1]);

  var dataJson = trimUcaseJSON(req.body,[]);

  // Cek Kode
  var sqlQuery = `SELECT kode_stamp FROM tm_stamp WHERE kode_stamp = '${dataJson[1].kode_stamp}' LIMIT 1`;
  var ResultSelect = await dbToko.SelectQuery(strIdCluster[1], sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (ResultSelect[0] === 500) {
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send("Internal Server Error !");
  }

  if (Object.keys(ResultSelect[1]).length === 0) {
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send({
      "status":"error",
      "pesan":`Kode stamp : ${dataJson[1].kode_stamp} tidak di temukan !`,
      "data":[{}]
    });
  }
  // End Cek Kode

  sqlQuery = `UPDATE tm_stamp SET nama_stamp = '${dataJson[1].nama_stamp}' WHERE kode_stamp = '${dataJson[1].kode_stamp}'`;
  ResultSelect = await dbToko.UpdateQuery(strIdCluster[1], sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (ResultSelect[0] === 500) {
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send("Internal Server Error !");
  }

  dbToko.closeConnection(strIdCluster[1]);
  return res.send({
    "status":"berhasil",
    "pesan":"Data stamp berhasil diedit.",
    "data":[{}]
  });
})

// ===============================================================================Delete
router.delete('/', async(req, res) => {
  const {error} = validateStampDelete(req.body);
  if (error) return res.status(500).send({
    "status":"error",
    "pesan":error.details[0].message,
    "data":[{}]
  });

  const strIdCluster = GenIdCluster("MDN", "CS01");
  if (strIdCluster[0] !== 200) return res.status(strIdCluster[0]).send({
    "status":"error",
    "pesan":strIdCluster[1],
    "data":[{}]
  });

  let resConn = await dbToko.createConnToko("MDN", strIdCluster[1])
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resConn[0] === 500) return res.status(resConn[0]).send(resConn[1]);

  var dataJson = trimUcaseJSON(req.body,[]);

  // Cek Kode
  var sqlQuery = `SELECT kode_stamp FROM tm_stamp WHERE kode_stamp = '${dataJson[1].kode_stamp}' LIMIT 1`;
  var ResultSelect = await dbToko.SelectQuery(strIdCluster[1], sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (ResultSelect[0] === 500) {
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send("Internal Server Error !");
  }

  if (Object.keys(ResultSelect[1]).length === 0) {
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send({
      "status":"error",
      "pesan":`Data stamp : ${dataJson[1].kode_stamp} tidak di temukan !`,
      "data":[{}]
    });
  }
  // End Cek Kode

  sqlQuery = `DELETE FROM tm_stamp WHERE kode_stamp = '${dataJson[1].kode_stamp}' LIMIT 1`;
  ResultSelect = await dbToko.DeleteQuery(strIdCluster[1], sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (ResultSelect[0] === 500) {
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send("Internal Server Error !");
  }

  dbToko.closeConnection(strIdCluster[1]);
  return res.send({
    "status":"berhasil",
    "pesan":"Data stamp berhasil dihapus.",
    "data":[{}]
  });
})

// ===============================================================================validasi
function validateStampAdd(bahan){
    const schema = Joi.object({
    kode_stamp: Joi.string().min(1).max(30).required(),
    nama_stamp: Joi.string().min(1).max(100).required()
  });
  return schema.validate(bahan);
}

function validateStampEdit(bahan){
  const schema = Joi.object({
    kode_stamp: Joi.string().min(1).max(30).required(),
    nama_stamp: Joi.string().min(1).max(100).required()
  });
  return schema.validate(bahan);
}

function validateStampDelete(bahan){
  const schema = Joi.object({
    kode_stamp: Joi.string().min(1).max(30).required()
  });
  return schema.validate(bahan);
}

module.exports = router;