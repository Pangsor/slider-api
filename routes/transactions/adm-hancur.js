const express = require(`express`);
const router = express.Router();
const dbToko = require('../../middleware/sql-function')
const {nsiAuth} = require('../../middleware/auth');
const {GenIdCluster,GenHancurSusut} = require('../../middleware/generator');
const Joi = require('@hapi/joi');
const {DateNow} = require('../../middleware/datetime');
const {trimUcaseJSON,insertCardAdmin,saldoAdminKredit} = require('../../middleware/function');
const { dbServer } = require('../../middleware/connections');
const moment = require('moment');
const uuid = require('uuid');

// ===============================================================================Get Detail
router.post('/bahan', async(req, res) => {
  const {error} = validateGetBahan(req.body);
  if (error) return res.status(500).send({
    "status":"error",
    "pesan":error.details[0].message,
    "data":[{}]
  });

  const dataJson = trimUcaseJSON(req.body,[]);
  const strIdCluster = GenIdCluster("MDN", "CS01");
  if (strIdCluster[0] !== 200) return res.status(strIdCluster[0]).send(strIdCluster[1]);

  let resConn = await dbToko.createConnToko("MDN", strIdCluster[1])
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resConn[0] === 500) return res.status(resConn[0]).send(resConn[1]);

  try{
    var dataParams = trimUcaseJSON(req.params,[]);
    var sqlQuery = `SELECT a.tgl_kirim,b.no_job_order,b.berat_susut FROM tt_admin_kirim_head a INNER JOIN tt_admin_kirim_detail b
                 ON a.no_transaksi = b.no_transaksi WHERE a.tujuan_divisi = '${dataJson[1].nama_divisi}' AND (a.tgl_kirim BETWEEN '${dataJson[1].tgl_awal}' AND '${dataJson[1].tgl_akhir}') AND b.kode_jenis_bahan = '${dataJson[1].kode_jenis_bahan}' GROUP BY a.no_transaksi`;
    
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
        "pesan":"Data tidak ditemukan !",
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
  let tmpNoTrx = "";
  let tmpBeratSusut = 0;

  const {error} = validateCart(req.body);
  if (error) return res.status(500).send({
    "status":"error",
    "pesan":error.details[0].message,
    "data":[{}]
  });
  var dataJson = trimUcaseJSON(req.body,[]);
  var detailBahan = trimUcaseJSON(req.body.detail_bahan,[]);

  const strIdCluster = GenIdCluster("MDN", "CS01");
  if (strIdCluster[0] !== 200) return res.status(strIdCluster[0]).send(strIdCluster[1]);

  let resConn = await dbToko.createConnToko("MDN", strIdCluster[1])
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resConn[0] === 500) return res.status(resConn[0]).send(resConn[1]);

  // Start Transaction
  resConn = await dbToko.StartTransaction(strIdCluster[1])
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resConn[0] === 500) {
    dbToko.closeConnection(strIdCluster[1])
    return res.status(resConn[0]).send(resConn[1]);
  }

  // Validasi
  var sqlQuery = `SELECT no_transaksi,kode_barang,berat_susut FROM tt_admin_kirim_detail WHERE divisi = '${dataJson[1].nama_divisi}'
                 AND no_job_order = '${dataJson[1].no_job_order}' AND kode_jenis_bahan = '${dataJson[1].kode_jenis_bahan}'
                  AND status = 'OPEN' GROUP BY divisi,no_job_order,no_job_order`;
  var ResultSelect = await dbToko.SelectQuery(strIdCluster[1], sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (ResultSelect[0] === 500) {
    await dbToko.RollBackTransaction(strIdCluster[1]);
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send({
      "status":"error",
      "pesan":"Internal Server Error !",
      "data":[{}]
    });
  }

  if (Object.keys(ResultSelect[1]).length === 0) {
    await dbToko.RollBackTransaction(strIdCluster[1]);
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(400).send({
      "status":"error",
      "pesan":`No job order : ${dataJson[1].no_job_order} tidak ditemukan !`,
      "data":[{}]
    });
  }
  // End Validasi

  // No Transaksi
  const resGenKode = await GenHancurSusut(strIdCluster[1]);
  if (resGenKode[0] !== 200) return resGenKode;
  const noTrx = resGenKode[1];

  // Generate a v4 (random) id
  uuid.v4(); // -> '110ec58a-a0f2-4ac4-8393-c866d813b8d1'
  var id = uuid.v4();

  let tmpTgl = moment(DateNow()).format('YYYY-MM-DD');
  let tmpTglJam = DateNow();

  tmpNoTrx = ResultSelect[1][0].no_transaksi;
  tmpBeratSusut = ResultSelect[1][0].berat_susut;
  // Simpan Transaksi
  sqlQuery = `INSERT INTO tt_admin_hancur_susut (no_transaksi,no_hancur,no_job_order,tgl_hancur,divisi,ket_divisi,kode_jenis_bahan,berat_hancur,input_by,input_date) VALUES 
      ('${id}','${noTrx}','${dataJson[1].no_job_order}','${tmpTgl}','${dataJson[1].nama_divisi}','SUSUT','${dataJson[1].kode_jenis_bahan}'
      ,'${tmpBeratSusut}','-','${tmpTglJam}')`;
  ResultInsert = await dbToko.InsertQuery(strIdCluster[1], sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (ResultInsert[0] === 500) {
    await dbToko.RollBackTransaction(strIdCluster[1]);
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send({
      "status":"error",
      "pesan":"Internal Server Error !",
      "data":[{}]
    });
  }
  // End Simpan Transaksi

  // Simpan Card
  const resCard = await insertCardAdmin(strIdCluster[1],id,tmpTgl,dataJson[1].nama_divisi,"HANCUR SUSUT","HANCUR SUSUT",dataJson[1].no_job_order,dataJson[1].kode_jenis_bahan,tmpBeratSusut,"-","OUT");
  if  (resCard[0] !== 200){
    await dbToko.RollBackTransaction(strIdCluster[1]);
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send("Internal Server Error !");
  }
  // End Simpan Card

  // Update Saldo
  const resSaldo = await saldoAdminKredit(strIdCluster[1],tmpTgl,dataJson[1].nama_divisi,dataJson[1].kode_jenis_bahan,tmpBeratSusut,"-","berat_hancur");
  if  (resSaldo[0] !== 200){
    await dbToko.RollBackTransaction(strIdCluster[1]);
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send("Internal Server Error !");
  }
  // End Update Saldo

  // Update Status Detail
  sqlQuery = `UPDATE tt_admin_kirim_detail SET status = 'DONE' WHERE no_transaksi = '${tmpNoTrx}'`;
  ResultInsert = await dbToko.InsertQuery(strIdCluster[1], sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (ResultInsert[0] === 500) {
    await dbToko.RollBackTransaction(strIdCluster[1]);
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send({
      "status":"error",
      "pesan":"Internal Server Error !",
      "data":[{}]
    });
  }
  // Update Status Detail

  // Update Status Head
  sqlQuery = `UPDATE tt_admin_kirim_head SET status = 'DONE' WHERE no_transaksi = '${tmpNoTrx}'`;
  ResultInsert = await dbToko.InsertQuery(strIdCluster[1], sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (ResultInsert[0] === 500) {
    await dbToko.RollBackTransaction(strIdCluster[1]);
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send({
      "status":"error",
      "pesan":"Internal Server Error !",
      "data":[{}]
    });
  }
  // Update Status Head

  await dbToko.CommitTransaction(strIdCluster[1]);
  dbToko.closeConnection(strIdCluster[1]);
  return res.send({
    "status":"berhasil",
    "pesan":`Hancur susut berhasil disimpan.`,
    "data":[{}]
  });
})

// ===============================================================================Laporan
router.post('/tgl/all', async(req, res) => {
  let sqlQuery = "";

  const {error} = validateReport(req.body);
  if (error) return res.status(500).send({
    "status":"error",
    "pesan":error.details[0].message,
    "data":[{}]
  });

  var dataJson = trimUcaseJSON(req.body,[]);
  const strIdCluster = GenIdCluster("MDN", "CS01");
  if (strIdCluster[0] !== 200) return res.status(strIdCluster[0]).send(strIdCluster[1]);

  let resConn = await dbToko.createConnToko("MDN", strIdCluster[1])
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resConn[0] === 500) return res.status(resConn[0]).send(resConn[1]);

  sqlQuery = `SELECT * FROM tt_admin_hancur_susut WHERE (tgl_hancur BETWEEN '${dataJson[1].tgl_awal}' AND '${dataJson[1].tgl_akhir}')`;
  try{
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
        "pesan":"Data tidak ditemukan",
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

// ===============================================================================Validasi
function validateGetBahan(bahan){
  const schema = Joi.object({
    nama_divisi: Joi.string().min(1).max(50).required(),
    tgl_awal: Joi.date().required(),
    tgl_akhir: Joi.date().required(),
    kode_jenis_bahan: Joi.string().min(1).max(30).required(),
  });
  return schema.validate(bahan);
}

function validateCart(data){
  const schema = Joi.object({
    nama_divisi: Joi.string().min(1).max(50).required(),
    no_job_order: Joi.string().min(1).max(30).required(),
    kode_jenis_bahan: Joi.string().min(1).max(30).required()
  });
  return schema.validate(data);
}

function validateReport(bahan){
  const schema = Joi.object({
    tgl_awal: Joi.date().required(),
    tgl_akhir: Joi.date().required()
  });
  return schema.validate(bahan);
}

module.exports = router;