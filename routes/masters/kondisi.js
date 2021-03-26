const express = require(`express`);
const router = express.Router();
const dbToko = require('../../middleware/sql-function')
const {nsiAuth} = require('../../middleware/auth');
const {GenIdCluster} = require('../../middleware/generator');
const Joi = require('@hapi/joi');
const {DateNow} = require('../../middleware/datetime');
const {trimUcaseJSON} = require('../../middleware/function');
const { dbServer } = require('../../middleware/connections');
const uuid = require('uuid');

// ===============================================================================Get
router.get('/all', async(req, res) => {
  const strIdCluster = GenIdCluster("MDN", "CS01");
  if (strIdCluster[0] !== 200) return res.status(strIdCluster[0]).send(strIdCluster[1]);

  let resConn = await dbToko.createConnToko("MDN", strIdCluster[1])
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resConn[0] === 500) return res.status(resConn[0]).send(resConn[1]);

  try{
    const sqlQuery = `SELECT * FROM tm_kondisi`;
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
        "pesan":"Data kondisi tidak ditemukan",
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

// ===============================================================================Simpan
router.post('/', async(req, res) => {
  let tmpTgl = DateNow();

  const {error} = validateKondisiAdd(req.body);
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
  var sqlQuery = `SELECT nama_kondisi FROM tm_kondisi WHERE nama_kondisi = '${dataJson[1].nama_kondisi}' LIMIT 1`;
  
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
      "pesan":`Data kondisi : ${dataJson[1].nama_kondisi} sudah ada !`,
      "data":[{}]
    });
  }

  // Generate a v4 (random) id
  uuid.v4(); // -> '110ec58a-a0f2-4ac4-8393-c866d813b8d1'
  var id = uuid.v4();

  sqlQuery = `INSERT INTO tm_kondisi (kode_kondisi,nama_kondisi,input_by,input_date) VALUES ('${id}','${dataJson[1].nama_kondisi}','-','${tmpTgl}')`;
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
    "pesan":"Data kondisi berhasil disimpan.",
    "data":[{}]
  });
})

// ==========================================================================Edit Bahan
router.put('/', async(req, res) => {
  const {error} = validateKondisiEdit(req.body);
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

  // Cek Nama
  var sqlQuery = `SELECT nama_kondisi FROM tm_kondisi WHERE kode_kondisi = '${dataJson[1].kode_kondisi}' LIMIT 1`;
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
      "pesan":`Data kondisi dengan kode : ${dataJson[1].kode_kondisi} tidak di temukan !`,
      "data":[{}]
    });
  }
  // End Cek Nama

  // Cek Nama Kondisi Update
  var sqlQuery = `SELECT nama_kondisi FROM tm_kondisi WHERE nama_kondisi = '${dataJson[1].nama_kondisi}' LIMIT 1`;
  var ResultSelect = await dbToko.SelectQuery(strIdCluster[1], sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (ResultSelect[0] === 500) {
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send("Internal Server Error !");
  }

  if (Object.keys(ResultSelect[1]).length > 0) {
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send({
      "status":"error",
      "pesan":`Data kondisi dengan nama : ${dataJson[1].nama_kondisi} sudah ada !`,
      "data":[{}]
    });
  }
  // End Cek Nama Kondisi Update

  sqlQuery = `UPDATE tm_kondisi SET nama_kondisi = '${dataJson[1].nama_kondisi}' WHERE kode_kondisi = '${dataJson[1].kode_kondisi}'`;
  ResultSelect = await dbToko.UpdateQuery(strIdCluster[1], sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (ResultSelect[0] === 500) {
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send("Internal Server Error !");
  }

  dbToko.closeConnection(strIdCluster[1]);
  return res.send({
    "status":"berhasil",
    "pesan":"Data kondisi berhasil diedit.",
    "data":[{}]
  });
})

// ===============================================================================Delete
router.delete('/', async(req, res) => {
  const {error} = validateKondisiDelete(req.body);
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

  // Cek Nama Kondisi
  var sqlQuery = `SELECT nama_kondisi FROM tm_kondisi WHERE nama_kondisi = '${dataJson[1].nama_kondisi}' LIMIT 1`;
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
      "pesan":`Data kondisi dengan nama : ${dataJson[1].nama_kondisi} tidak di temukan !`,
      "data":[{}]
    });
  }
  // End Cek Nama Kondisi

  sqlQuery = `DELETE FROM tm_kondisi WHERE nama_kondisi = '${dataJson[1].nama_kondisi}' LIMIT 1`;
  ResultSelect = await dbToko.DeleteQuery(strIdCluster[1], sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (ResultSelect[0] === 500) {
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send("Internal Server Error !");
  }

  dbToko.closeConnection(strIdCluster[1]);
  return res.send({
    "status":"berhasil",
    "pesan":"Data kondisi berhasil dihapus.",
    "data":[{}]
  });
})

// ===============================================================================Validasi
function validateKondisiAdd(bahan){
  const schema = Joi.object({
    nama_kondisi: Joi.string().min(1).max(100).required()
  });
  return schema.validate(bahan);
}

function validateKondisiEdit(bahan){
  const schema = Joi.object({
    kode_kondisi: Joi.string().min(1).max(100).required(),
    nama_kondisi: Joi.string().min(1).max(100).required()
  });
  return schema.validate(bahan);
}

function validateKondisiDelete(bahan){
  const schema = Joi.object({
    nama_kondisi: Joi.string().min(1).max(100).required()
  });
  return schema.validate(bahan);
}

module.exports = router;