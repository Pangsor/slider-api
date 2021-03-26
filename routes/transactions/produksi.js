const express = require(`express`);
const router = express.Router();
const dbToko = require('../../middleware/sql-function')
const { nsiAuth } = require('../../middleware/auth');
const { GenIdCluster, GenProduksiTerimaBatu, GenProduksiTerimaTambahan } = require('../../middleware/generator');
const Joi = require('@hapi/joi');
const { DateNow } = require('../../middleware/datetime');
const { trimUcaseJSON, insertCardAdmin, saldoAdminDebit, saldoAdminKredit } = require('../../middleware/function');
const { dbServer } = require('../../middleware/connections');
const moment = require('moment');
const uuid = require('uuid');

// ===============================================================================Simpan Terima Batu
router.post('/terima-batu', async (req, res) => {
  var i;
  let tmpKdJnsBahan = "";
  let tmpTotBerat = 0;
  const { error } = validateTerimaBatu(req.body);
  if (error) return res.status(500).send({
    "status": "error",
    "pesan": error.details[0].message,
    "data": [{}]
  });
  var dataJson = trimUcaseJSON(req.body, []);
  const strIdCluster = GenIdCluster("MDN", "CS01");
  if (strIdCluster[0] !== 200) return res.status(strIdCluster[0]).send(strIdCluster[1]);

  let resConn = await dbToko.createConnToko("MDN", strIdCluster[1])
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err] });
  if (resConn[0] === 500) return res.status(resConn[0]).send(resConn[1]);

  // Start Transaction
  resConn = await dbToko.StartTransaction(strIdCluster[1])
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err] });
  if (resConn[0] === 500) {
    dbToko.closeConnection(strIdCluster[1])
    return res.status(resConn[0]).send(resConn[1]);
  }

  // Validasi Divisi
  var sqlQuery = `SELECT kode_divisi,nama_divisi FROM tm_divisi WHERE nama_divisi = '${dataJson[1].nama_divisi}'`;

  var ResultSelect = await dbToko.SelectQuery(strIdCluster[1], sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err] });
  if (ResultSelect[0] === 500) {
    await dbToko.RollBackTransaction(strIdCluster[1]);
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send({
      "status": "error",
      "pesan": "Internal Server Error !",
      "data": [{}]
    });
  }

  if (Object.keys(ResultSelect[1]).length === 0) {
    await dbToko.RollBackTransaction(strIdCluster[1]);
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(400).send({
      "status": "error",
      "pesan": `Divisi : ${dataJson[1].nama_divisi} tidak ditemukan !`,
      "data": [{}]
    });
  }
  // End Validasi Divisi

  // Validasi No JO
  var sqlQuery = `SELECT no_job_order,kode_barang,kode_jenis_bahan,kode_batu,stock_batu,berat_batu FROM tt_admin_kirim_batu WHERE no_job_order = '${dataJson[1].no_job_order}' AND status_terima = 'OPEN'`;

  var ResultSelect = await dbToko.SelectQuery(strIdCluster[1], sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err] });
  if (ResultSelect[0] === 500) {
    await dbToko.RollBackTransaction(strIdCluster[1]);
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send({
      "status": "error",
      "pesan": "Internal Server Error !",
      "data": [{}]
    });
  }

  if (Object.keys(ResultSelect[1]).length === 0) {
    await dbToko.RollBackTransaction(strIdCluster[1]);
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(400).send({
      "status": "error",
      "pesan": `No job order : ${dataJson[1].no_job_order} tidak ditemukan !`,
      "data": [{}]
    });
  }
  // End Validasi No JO







  // No Transaksi
  const resGenKode = await GenProduksiTerimaBatu(strIdCluster[1]);
  if (resGenKode[0] !== 200) return resGenKode;
  const noTrx = resGenKode[1];

  // Generate a v4 (random) id
  uuid.v4(); // -> '110ec58a-a0f2-4ac4-8393-c866d813b8d1'
  var id = uuid.v4();

  let tmpTgl = moment(DateNow()).format('YYYY-MM-DD');
  let tmpTglJam = DateNow();

  // Simpan Head
  sqlQuery = `INSERT INTO tt_produksi_batu_head (no_transaksi,no_terima,tgl_terima,input_by,input_date) VALUES 
    ('${id}','${noTrx}','${tmpTgl}','-','${tmpTglJam}')`;
  ResultInsert = await dbToko.InsertQuery(strIdCluster[1], sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err] });
  if (ResultInsert[0] === 500) {
    await dbToko.RollBackTransaction(strIdCluster[1]);
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send({
      "status": "error",
      "pesan": "Internal Server Error !",
      "data": [{}]
    });
  }
  // End Simpan Head

  // Simpan
  for (i in ResultSelect[1]) {
    tmpKdJnsBahan = ResultSelect[1][i].kode_jenis_bahan;
    tmpTotBerat = ResultSelect[1][i].berat_batu;

    sqlQuery = `INSERT INTO tt_produksi_batu (no_transaksi,no_terima,tgl_terima,nama_divisi,no_job_order,kode_barang,kode_jenis_bahan,kode_batu,stock_in,berat_in
      ,input_by,input_date) VALUES 
      ('${id}','${noTrx}','${tmpTgl}','${dataJson[1].nama_divisi}','${ResultSelect[1][i].no_job_order}','${ResultSelect[1][i].kode_barang}'
      ,'${ResultSelect[1][i].kode_jenis_bahan}','${ResultSelect[1][i].kode_batu}','${ResultSelect[1][i].stock_batu}','${ResultSelect[1][i].berat_batu}'
      ,'-','${tmpTglJam}')`;
    ResultInsert = await dbToko.InsertQuery(strIdCluster[1], sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err] });
    if (ResultInsert[0] === 500) {
      await dbToko.RollBackTransaction(strIdCluster[1]);
      dbToko.closeConnection(strIdCluster[1]);
      return res.status(500).send({
        "status": "error",
        "pesan": "Internal Server Error !",
        "data": [{}]
      });
    }

  }
  // End Simpan

  // Update Status
  sqlQuery = `UPDATE tt_admin_kirim_batu SET status_terima= 'DONE' WHERE no_job_order = '${ResultSelect[1][i].no_job_order}' AND status_terima='OPEN'`;
  ResultInsert = await dbToko.UpdateQuery(strIdCluster[1], sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err] });
  if (ResultInsert[0] === 500) {
    await dbToko.RollBackTransaction(strIdCluster[1]);
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send({
      "status": "error",
      "pesan": "Internal Server Error !",
      "data": [{}]
    });
  }
  // Update Status

  // Simpan Card
  const resCard = await insertCardAdmin(strIdCluster[1], id, tmpTgl, dataJson[1].nama_divisi, "TERIMA BATU", "TERIMA BATU", dataJson[1].no_job_order, tmpKdJnsBahan, tmpTotBerat, "-", "IN");
  if (resCard[0] !== 200) {
    await dbToko.RollBackTransaction(strIdCluster[1]);
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send("Internal Server Error !");
  }
  // Simpan Card

  // Update Saldo
  const resSaldo = await saldoAdminDebit(strIdCluster[1], tmpTgl, dataJson[1].nama_divisi, tmpKdJnsBahan, tmpTotBerat, "-", "berat_terima_batu");
  if (resSaldo[0] !== 200) {
    await dbToko.RollBackTransaction(strIdCluster[1]);
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send("Internal Server Error !");
  }
  // Update Saldo


  await dbToko.CommitTransaction(strIdCluster[1]);
  dbToko.closeConnection(strIdCluster[1]);
  return res.send({
    "status": "berhasil",
    "pesan": `Terima batu berhasil disimpan.`,
    "data": [{}]
  });
})

// ===============================================================================Laporan Terima Batu
router.post('/terima-batu/all', async (req, res) => {
  let sqlQuery = "";


  const { error } = validateReport(req.body);
  if (error) return res.status(500).send({
    "status": "error",
    "pesan": error.details[0].message,
    "data": [{}]
  });

  var dataJson = trimUcaseJSON(req.body, []);
  const strIdCluster = GenIdCluster("MDN", "CS01");
  if (strIdCluster[0] !== 200) return res.status(strIdCluster[0]).send(strIdCluster[1]);

  let resConn = await dbToko.createConnToko("MDN", strIdCluster[1])
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err] });
  if (resConn[0] === 500) return res.status(resConn[0]).send(resConn[1]);

  sqlQuery = `SELECT * FROM tt_produksi_batu WHERE (tgl_terima BETWEEN '${dataJson[1].tgl_awal}' AND '${dataJson[1].tgl_akhir}') AND nama_divisi='${dataJson[1].nama_divisi}'`;

  try {
    const resultSelect = await dbToko.SelectQuery(strIdCluster[1], sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err] });
    if (resultSelect[0] === 500) {
      dbToko.closeConnection(strIdCluster[1]);
      return res.status(500).send({
        "status": "error",
        "pesan": resultSelect[1],
        "data": [{}]
      });
    }

    dbToko.closeConnection(strIdCluster[1]);

    if (resultSelect[1].length == 0) {
      return res.send({
        "status": "berhasil",
        "pesan": "Data tidak ditemukan",
        "data": resultSelect[1]
      });
    } else {
      return res.send({
        "status": "berhasil",
        "pesan": "berhasil",
        "data": resultSelect[1]
      });
    }

  } catch (error) {
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500, error.message);
  }
})

// ===============================================================================Simpan Terima Tambahan
router.post('/terima-tambahan', async (req, res) => {
  var i;
  let tmpKdJnsBahan = "";
  let tmpTotBerat = 0;

  const { error } = validateTerimaTambahan(req.body);
  if (error) return res.status(500).send({
    "status": "error",
    "pesan": error.details[0].message,
    "data": [{}]
  });
  var dataJson = trimUcaseJSON(req.body, []);
  const strIdCluster = GenIdCluster("MDN", "CS01");
  if (strIdCluster[0] !== 200) return res.status(strIdCluster[0]).send(strIdCluster[1]);

  let resConn = await dbToko.createConnToko("MDN", strIdCluster[1])
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err] });
  if (resConn[0] === 500) return res.status(resConn[0]).send(resConn[1]);

  // Start Transaction
  resConn = await dbToko.StartTransaction(strIdCluster[1])
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err] });
  if (resConn[0] === 500) {
    dbToko.closeConnection(strIdCluster[1])
    return res.status(resConn[0]).send(resConn[1]);
  }

  // Validasi Divisi
  var sqlQuery = `SELECT kode_divisi,nama_divisi FROM tm_divisi WHERE nama_divisi = '${dataJson[1].nama_divisi}'`;
  var ResultSelect = await dbToko.SelectQuery(strIdCluster[1], sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err] });
  if (ResultSelect[0] === 500) {
    await dbToko.RollBackTransaction(strIdCluster[1]);
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send({
      "status": "error",
      "pesan": "Internal Server Error !",
      "data": [{}]
    });
  }

  if (Object.keys(ResultSelect[1]).length === 0) {
    await dbToko.RollBackTransaction(strIdCluster[1]);
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(400).send({
      "status": "error",
      "pesan": `Divisi : ${dataJson[1].nama_divisi} tidak ditemukan !`,
      "data": [{}]
    });
  }
  // End Validasi Divisi

  // Validasi No JO
  var sqlQuery = `SELECT no_job_order,kode_barang,kode_jenis_bahan,tambahan,stock_out,berat_out FROM tt_admin_kirim_tambahan
                 WHERE divisi = '${dataJson[1].nama_divisi}' AND no_job_order = '${dataJson[1].no_job_order}' AND status = 'OPEN'`;
  var ResultSelect = await dbToko.SelectQuery(strIdCluster[1], sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err] });
  if (ResultSelect[0] === 500) {
    await dbToko.RollBackTransaction(strIdCluster[1]);
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send({
      "status": "error",
      "pesan": "Internal Server Error !",
      "data": [{}]
    });
  }

  if (Object.keys(ResultSelect[1]).length === 0) {
    await dbToko.RollBackTransaction(strIdCluster[1]);
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(400).send({
      "status": "error",
      "pesan": `No job order : ${dataJson[1].no_job_order} tidak ditemukan !`,
      "data": [{}]
    });
  }
  // End Validasi No JO

  tmpKdJnsBahan = ResultSelect[1][0].kode_jenis_bahan;
  tmpTotBerat = ResultSelect[1][0].berat_out;

  // No Transaksi
  const resGenKode = await GenProduksiTerimaTambahan(strIdCluster[1]);
  if (resGenKode[0] !== 200) return resGenKode;
  const noTrx = resGenKode[1];

  // Generate a v4 (random) id
  uuid.v4(); // -> '110ec58a-a0f2-4ac4-8393-c866d813b8d1'
  var id = uuid.v4();

  let tmpTgl = moment(DateNow()).format('YYYY-MM-DD');
  let tmpTglJam = DateNow();

  // Simpan Head
  sqlQuery = `INSERT INTO tt_produksi_tambahan_head (no_transaksi,no_terima,tgl_terima,input_by,input_date) VALUES 
    ('${id}','${noTrx}','${tmpTgl}','-','${tmpTglJam}')`;
  ResultInsert = await dbToko.InsertQuery(strIdCluster[1], sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err] });
  if (ResultInsert[0] === 500) {
    await dbToko.RollBackTransaction(strIdCluster[1]);
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send({
      "status": "error",
      "pesan": "Internal Server Error !",
      "data": [{}]
    });
  }
  // End Simpan Head

  // Simpan
  for (i in ResultSelect[1]) {
    sqlQuery = `INSERT INTO tt_produksi_tambahan (no_transaksi,no_terima,tgl_terima,nama_divisi,no_job_order,kode_barang,kode_jenis_bahan,tambahan,stock_in,berat_in
      ,input_by,input_date) VALUES 
      ('${id}','${noTrx}','${tmpTgl}','${dataJson[1].nama_divisi}','${ResultSelect[1][i].no_job_order}','${ResultSelect[1][i].kode_barang}'
      ,'${ResultSelect[1][i].kode_jenis_bahan}','${ResultSelect[1][i].tambahan}','${ResultSelect[1][i].stock_out}','${ResultSelect[1][i].berat_out}'
      ,'-','${tmpTglJam}')`;
    ResultInsert = await dbToko.InsertQuery(strIdCluster[1], sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err] });
    if (ResultInsert[0] === 500) {
      await dbToko.RollBackTransaction(strIdCluster[1]);
      dbToko.closeConnection(strIdCluster[1]);
      return res.status(500).send({
        "status": "error",
        "pesan": "Internal Server Error !",
        "data": [{}]
      });
    }

    // Update Status
    sqlQuery = `UPDATE tt_admin_kirim_tambahan SET status = 'DONE' WHERE divisi = '${dataJson[1].nama_divisi}' AND no_job_order = '${ResultSelect[1][i].no_job_order}'`;
    ResultInsert = await dbToko.UpdateQuery(strIdCluster[1], sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err] });
    if (ResultInsert[0] === 500) {
      await dbToko.RollBackTransaction(strIdCluster[1]);
      dbToko.closeConnection(strIdCluster[1]);
      return res.status(500).send({
        "status": "error",
        "pesan": "Internal Server Error !",
        "data": [{}]
      });
    }
    // Update Status

  }
  // End Simpan

  // Simpan Card
  const resCard = await insertCardAdmin(strIdCluster[1], id, tmpTgl, dataJson[1].nama_divisi, "TERIMA TAMBAHAN", "TERIMA TAMBAHAN", dataJson[1].no_job_order, tmpKdJnsBahan, tmpTotBerat, "-", "IN");
  if (resCard[0] !== 200) {
    await dbToko.RollBackTransaction(strIdCluster[1]);
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send("Internal Server Error !");
  }
  // Simpan Card

  // Update Saldo
  const resSaldo = await saldoAdminDebit(strIdCluster[1], tmpTgl, dataJson[1].nama_divisi, tmpKdJnsBahan, tmpTotBerat, "-", "berat_terima_tambahan");
  if (resSaldo[0] !== 200) {
    await dbToko.RollBackTransaction(strIdCluster[1]);
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send("Internal Server Error !");
  }
  // Update Saldo

  await dbToko.CommitTransaction(strIdCluster[1]);
  dbToko.closeConnection(strIdCluster[1]);
  return res.send({
    "status": "berhasil",
    "pesan": `Terima Tambahan berhasil disimpan.`,
    "data": [{}]
  });
})

// ===============================================================================Laporan Terima Tambahan
router.post('/terima-tambahan/all', async (req, res) => {
  let sqlQuery = "";

  const { error } = validateReport(req.body);
  if (error) return res.status(500).send({
    "status": "error",
    "pesan": error.details[0].message,
    "data": [{}]
  });

  var dataJson = trimUcaseJSON(req.body, []);
  const strIdCluster = GenIdCluster("MDN", "CS01");
  if (strIdCluster[0] !== 200) return res.status(strIdCluster[0]).send(strIdCluster[1]);

  let resConn = await dbToko.createConnToko("MDN", strIdCluster[1])
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err] });
  if (resConn[0] === 500) return res.status(resConn[0]).send(resConn[1]);

  sqlQuery = `SELECT * FROM tt_produksi_tambahan WHERE (tgl_terima BETWEEN '${dataJson[1].tgl_awal}' AND '${dataJson[1].tgl_akhir}')`;
  try {
    const resultSelect = await dbToko.SelectQuery(strIdCluster[1], sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err] });
    if (resultSelect[0] === 500) {
      dbToko.closeConnection(strIdCluster[1]);
      return res.status(500).send({
        "status": "error",
        "pesan": resultSelect[1],
        "data": [{}]
      });
    }

    dbToko.closeConnection(strIdCluster[1]);

    if (resultSelect[1].length == 0) {
      return res.send({
        "status": "berhasil",
        "pesan": "Data tidak ditemukan",
        "data": resultSelect[1]
      });
    } else {
      return res.send({
        "status": "berhasil",
        "pesan": "berhasil",
        "data": resultSelect[1]
      });
    }

  } catch (error) {
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500, error.message);
  }
})


//GET OUTSTAND
router.get('/outstand', async(req, res) => {
  const strIdCluster = GenIdCluster("MDN", "CS01");
  if (strIdCluster[0] !== 200) return res.status(strIdCluster[0]).send(strIdCluster[1]);

  let resConn = await dbToko.createConnToko("MDN", strIdCluster[1])
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resConn[0] === 500) return res.status(resConn[0]).send(resConn[1]);

  try{
    var dataParams = trimUcaseJSON(req.params,[]);
    var sqlQuery = `SELECT no_job_order,asal_divisi,tujuan_divisi,berat_akhir as berat FROM tt_po_job_order WHERE status_job='PROSES' AND asal_divisi<>tujuan_divisi`;
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
        "pesan":"No job order tidak ditemukan !",
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
//GET OUTSTAND
// ===============================================================================Validasi
function validateTerimaBatu(bahan) {
  const schema = Joi.object({
    nama_divisi: Joi.string().min(1).max(60).required(),
    no_job_order: Joi.string().min(1).max(30).required()
  });
  return schema.validate(bahan);
}

function validateTerimaTambahan(bahan) {
  const schema = Joi.object({
    nama_divisi: Joi.string().min(1).max(60).required(),
    no_job_order: Joi.string().min(1).max(30).required()
  });
  return schema.validate(bahan);
}

function validateReport(bahan) {
  const schema = Joi.object({
    tgl_awal: Joi.date().required(),
    tgl_akhir: Joi.date().required(),
    nama_divisi: Joi.string().min(1).max(30).required()
  });
  return schema.validate(bahan);
}

module.exports = router;