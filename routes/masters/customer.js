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
    const sqlQuery = `SELECT kode_customer,nama_toko,nama_customer,alamat,no_hp,email,negara,lokasi FROM tm_customer`;
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
        "pesan":"Data customer tidak ditemukan",
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

  const {error} = validateCustomerAdd(req.body);
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
  var sqlQuery = `SELECT kode_customer FROM tm_customer WHERE kode_customer = '${dataJson[1].kode_customer}' LIMIT 1`;
  
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
      "pesan":`Kode customer : ${dataJson[1].kode_customer} sudah ada !`,
      "data":[{}]
    });
  }

  sqlQuery = `INSERT INTO tm_customer (kode_customer,nama_toko,nama_customer,alamat,no_hp,email,negara,lokasi,input_by,input_date) VALUES
             ('${dataJson[1].kode_customer}','${dataJson[1].nama_toko}','${dataJson[1].nama_customer}','${dataJson[1].alamat}','${dataJson[1].no_hp}'
             ,'${dataJson[1].email}','${dataJson[1].negara}','${dataJson[1].lokasi}','-','${tmpTgl}')`;
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
    "pesan":"Data customer berhasil disimpan.",
    "data":[{}]
  });
})

// ===============================================================================Put
router.put('/', async(req, res) => {
  const {error} = validateCustomerEdit(req.body);
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
  var sqlQuery = `SELECT kode_customer FROM tm_customer WHERE kode_customer = '${dataJson[1].kode_customer}' LIMIT 1`;
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
      "pesan":`Kode customer : ${dataJson[1].kode_customer} tidak di temukan !`,
      "data":[{}]
    });
  }
  // End Cek Kode

  sqlQuery = `UPDATE tm_customer SET nama_toko = '${dataJson[1].nama_toko}',nama_customer = '${dataJson[1].nama_customer}'
            ,alamat = '${dataJson[1].alamat}',no_hp = '${dataJson[1].no_hp}',email = '${dataJson[1].email}'
            ,negara = '${dataJson[1].negara}',lokasi = '${dataJson[1].lokasi}' WHERE kode_customer = '${dataJson[1].kode_customer}'`
  ResultSelect = await dbToko.UpdateQuery(strIdCluster[1], sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (ResultSelect[0] === 500) {
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send("Internal Server Error !");
  }

  dbToko.closeConnection(strIdCluster[1]);
  return res.send({
    "status":"berhasil",
    "pesan":"Data customer berhasil diedit.",
    "data":[{}]
  });
})

// ===============================================================================Delete
router.delete('/', async(req, res) => {
  const {error} = validateCustomerDelete(req.body);
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
  var sqlQuery = `SELECT kode_customer FROM tm_customer WHERE kode_customer = '${dataJson[1].kode_customer}' LIMIT 1`;
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
      "pesan":`Data customer : ${dataJson[1].kode_customer} tidak di temukan !`,
      "data":[{}]
    });
  }
  // End Cek Kode

  sqlQuery = `DELETE FROM tm_customer WHERE kode_customer = '${dataJson[1].kode_customer}' LIMIT 1`
  ResultSelect = await dbToko.DeleteQuery(strIdCluster[1], sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (ResultSelect[0] === 500) {
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send("Internal Server Error !");
  }

  dbToko.closeConnection(strIdCluster[1]);
  return res.send({
    "status":"berhasil",
    "pesan":"Data customer berhasil dihapus.",
    "data":[{}]
  });
})

// ===============================================================================Validasi
function validateCustomerAdd(bahan){
    const schema = Joi.object({
    kode_customer: Joi.string().min(1).max(30).required(),
    nama_toko: Joi.string().min(1).max(100).required(),
    nama_customer: Joi.string().min(1).max(100).required(),
    alamat: Joi.string().min(1).max(100).required(),
    no_hp: Joi.string().min(1).max(50).required(),
    email: Joi.string().min(1).max(50).required(),
    negara: Joi.string().min(1).max(100).required(),
    lokasi: Joi.string().min(1).max(100).required()
  });
  return schema.validate(bahan);
}

function validateCustomerEdit(bahan){
  const schema = Joi.object({
    kode_customer: Joi.string().min(1).max(30).required(),
    nama_toko: Joi.string().min(1).max(100).required(),
    nama_customer: Joi.string().min(1).max(100).required(),
    alamat: Joi.string().min(1).max(100).required(),
    no_hp: Joi.string().min(1).max(50).required(),
    email: Joi.string().min(1).max(50).required(),
    negara: Joi.string().min(1).max(100).required(),
    lokasi: Joi.string().min(1).max(100).required()
  });
  return schema.validate(bahan);
}

function validateCustomerDelete(bahan){
  const schema = Joi.object({
    kode_customer: Joi.string().min(1).max(30).required()
  });
  return schema.validate(bahan);
}

module.exports = router;