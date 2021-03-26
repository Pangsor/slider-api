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
    const sqlQuery = `SELECT kode_staff,nama_staff,no_hp,email FROM tm_staff`;
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
        "pesan":"Data staff tidak ditemukan",
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

  const {error} = validateStaffAdd(req.body);
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
  var sqlQuery = `SELECT kode_staff FROM tm_staff WHERE kode_staff = '${dataJson[1].kode_staff}' LIMIT 1`;
  
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
      "pesan":`Kode staff : ${dataJson[1].kode_staff} sudah ada !`,
      "data":[{}]
    });
  }

  sqlQuery = `INSERT INTO tm_staff (kode_staff,nama_staff,no_hp,email,input_by,input_date) VALUES
             ('${dataJson[1].kode_staff}','${dataJson[1].nama_staff}','${dataJson[1].no_hp}','${dataJson[1].email}','-','${tmpTgl}')`;
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
    "pesan":"Data staff berhasil disimpan.",
    "data":[{}]
  });
})

// ===============================================================================Put
router.put('/', async(req, res) => {
  const {error} = validateStaffEdit(req.body);
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
  var sqlQuery = `SELECT kode_staff FROM tm_staff WHERE kode_staff = '${dataJson[1].kode_staff}' LIMIT 1`;
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
      "pesan":`Kode staff : ${dataJson[1].kode_staff} tidak di temukan !`,
      "data":[{}]
    });
  }
  // End Cek Kode

  sqlQuery = `UPDATE tm_staff SET nama_staff = '${dataJson[1].nama_staff}',no_hp = '${dataJson[1].no_hp}'
            ,email = '${dataJson[1].email}' WHERE kode_staff = '${dataJson[1].kode_staff}'`
  ResultSelect = await dbToko.UpdateQuery(strIdCluster[1], sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (ResultSelect[0] === 500) {
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send("Internal Server Error !");
  }

  dbToko.closeConnection(strIdCluster[1]);
  return res.send({
    "status":"berhasil",
    "pesan":"Data staff berhasil diedit.",
    "data":[{}]
  });
})

// ===============================================================================Delete
router.delete('/', async(req, res) => {
  const {error} = validateStaffDelete(req.body);
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
  var sqlQuery = `SELECT kode_staff FROM tm_staff WHERE kode_staff = '${dataJson[1].kode_staff}' LIMIT 1`;
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
      "pesan":`Data staff : ${dataJson[1].kode_staff} tidak di temukan !`,
      "data":[{}]
    });
  }
  // End Cek Kode

  sqlQuery = `DELETE FROM tm_staff WHERE kode_staff = '${dataJson[1].kode_staff}' LIMIT 1`;
  ResultSelect = await dbToko.DeleteQuery(strIdCluster[1], sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (ResultSelect[0] === 500) {
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send("Internal Server Error !");
  }

  dbToko.closeConnection(strIdCluster[1]);
  return res.send({
    "status":"berhasil",
    "pesan":"Data staff berhasil dihapus.",
    "data":[{}]
  });
})

// ===============================================================================Validasi
function validateStaffAdd(bahan){
    const schema = Joi.object({
    kode_staff: Joi.string().min(1).max(30).required(),
    nama_staff: Joi.string().min(1).max(100).required(),
    no_hp: Joi.string().min(1).max(50).required(),
    email: Joi.string().min(1).max(50).required()
  });
  return schema.validate(bahan);
}

function validateStaffEdit(bahan){
  const schema = Joi.object({
    kode_staff: Joi.string().min(1).max(30).required(),
    nama_staff: Joi.string().min(1).max(100).required(),
    no_hp: Joi.string().min(1).max(50).required(),
    email: Joi.string().min(1).max(50).required()
  });
  return schema.validate(bahan);
}

function validateStaffDelete(bahan){
  const schema = Joi.object({
    kode_staff: Joi.string().min(1).max(30).required()
  });
  return schema.validate(bahan);
}

module.exports = router;