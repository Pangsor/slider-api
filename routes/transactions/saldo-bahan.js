const express = require(`express`);
const router = express.Router();
const dbToko = require('../../middleware/sql-function')
const {nsiAuth} = require('../../middleware/auth');
const {GenIdCluster, GenNoTrxAddSaldoMurni,GenNoTrxCreateSaldoBahan} = require('../../middleware/generator');
const Joi = require('@hapi/joi');
const {DateNow} = require('../../middleware/datetime');
const {trimUcaseJSON,cekNumber,insertCardAdmin,saldoAdminDebit} = require('../../middleware/function');
const { dbServer } = require('../../middleware/connections');
const moment = require('moment');
const uuid = require('uuid');

// ===============================================================================Get Bahan Yang Ada Saldo
router.get('/stock-bahan', async(req, res) => {
  let sqlQuery = "";

  const strIdCluster = GenIdCluster("MDN", "CS01");
  if (strIdCluster[0] !== 200) return res.status(strIdCluster[0]).send(strIdCluster[1]);

  let resConn = await dbToko.createConnToko("MDN", strIdCluster[1])
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resConn[0] === 500) return res.status(resConn[0]).send(resConn[1]);

  sqlQuery = `SELECT nama_bahan,berat FROM tt_saldo_stock_murni WHERE berat*1 > 0`;
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
        "pesan":"Data bahan tidak ditemukan",
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

// ===============================================================================Pembuatan Saldo Bahan
router.post('/', async(req, res) => {
  let tmpDetail = "";
  let arrBahan = [];
  let statCari = false;
  var i;

  const {error} = validateCreate(req.body);
  if (error) return res.status(500).send({
    "status":"error",
    "pesan":error.details[0].message,
    "data":[{}]
  });
  var dataJson = trimUcaseJSON(req.body,[]);
  var dataJsonDetail = trimUcaseJSON(req.body.detail_bahan,[]);
  tmpDetail = dataJsonDetail[1];

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
  
  // Validasi Jenis Bahan
  var sqlQuery = `SELECT kode_jenis_bahan FROM tm_jenis_bahan WHERE kode_jenis_bahan = '${dataJson[1].kode_jenis_bahan}' LIMIT 1`;
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
    return res.status(500).send({
      "status":"error",
      "pesan":`Kode jenis bahan : ${dataJson[1].kode_jenis_bahan} tidak ditemukan !`,
      "data":[{}]
    });
  }
  // End Validasi Jenis Bahan

  // Validasi Berat
  resCek = cekNumber("berat", dataJson[1].berat);
  if(resCek[0] !== 200) return res.status(resCek[0]).send({
    "status":"error",
    "pesan":resCek[1],
    "data":[]
  });
  // End Validasi Berat

  // Validasi Susut
  resCek = cekNumber("berat_susut", dataJson[1].berat_susut);
  if(resCek[0] !== 200) return res.status(resCek[0]).send({
    "status":"error",
    "pesan":resCek[1],
    "data":[]
  });
  // End Validasi Susut

  // Validasi Detail
  for (i in tmpDetail){
    var sqlQuery = `SELECT nama_bahan FROM tt_saldo_stock_murni WHERE nama_bahan = '${tmpDetail[i].nama_bahan}' AND berat*1>0 LIMIT 1`;
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
      return res.status(500).send({
        "status":"error",
        "pesan":`Bahan : ${tmpDetail[i].nama_bahan} tidak ditemukan !`,
        "data":[{}]
      });
    }

    resCek = cekNumber("berat_bahan", tmpDetail[i].berat_bahan);
    if(resCek[0] !== 200) return res.status(resCek[0]).send({
      "status":"error",
      "pesan":resCek[1],
      "data":[]
    });

    // Cek Duplicate
    statCari = arrBahan.includes(tmpDetail[i].nama_bahan)
    if (statCari === false){
      arrBahan.push(tmpDetail[i].nama_bahan)
    }else{
      return res.status(500).send({
        "status":"error",
        "pesan":`Bahan : ${tmpDetail[i].nama_bahan} sudah ada dalam daftar !`,
        "data":[]
      });
    }
    // End Cek Duplicate

  }
  // End Validasi Detail

  // Validasi Saldo
  var sqlQuery = `SELECT kode_jenis_bahan FROM tt_saldo_stock_bahan WHERE kode_jenis_bahan = '${dataJson[1].kode_jenis_bahan}' LIMIT 1`;
  var ResultSelect = await dbToko.SelectQuery(strIdCluster[1], sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (ResultSelect[0] === 500) {
    await dbToko.RollBackTransaction(strIdCluster[1]);
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send("Internal Server Error !");
  }
  if (Object.keys(ResultSelect[1]).length !== 0){
    return res.status(500).send({
      "status":"error",
      "pesan":`Kode jenis bahan : ${dataJson[1].kode_jenis_bahan} sudah ada !`,
      "data":[{}]
    });
  }
  // End Validasi Saldo

  // No Transaksi
  const resGenKode = await GenNoTrxCreateSaldoBahan(strIdCluster[1]);
  if  (resGenKode[0] !== 200) return resGenKode;
  const noTrx = resGenKode[1];
  // End No Transaksi

  // No Transaksi
  const resGenKode2 = await GenNoTrxAddSaldoMurni(strIdCluster[1]);
  if  (resGenKode2[0] !== 200) return resGenKode2;
  const noTrxMurni = resGenKode2[1];
  // End No Transaksi

  let tmpTgl = DateNow();
  let tmpTglTrx = moment(DateNow()).format('YYYY-MM-DD');
  
  // Generate a v4 (random) id
  uuid.v4(); // -> '110ec58a-a0f2-4ac4-8393-c866d813b8d1'
  var id = uuid.v4();

  // Simpan
  for (i in tmpDetail){
    // Detail
    sqlQuery = `INSERT INTO tt_mutasi_saldo_bahan (no_transaksi,no_mutasi,tgl_mutasi,kategori,keterangan,kode_jenis_bahan,berat,berat_susut,nama_bahan,berat_bahan,input_by,input_date) VALUES 
          ('${id}','${noTrx}','${tmpTglTrx}','PEMBUATAN SALDO BAHAN','PEMBUATAN SALDO BAHAN','${dataJson[1].kode_jenis_bahan}','${dataJson[1].berat}','${dataJson[1].berat_susut}'
          ,'${tmpDetail[i].nama_bahan}','${tmpDetail[i].berat_bahan}','-','${tmpTgl}')`;
       
    ResultSelect = await dbToko.InsertQuery(strIdCluster[1], sqlQuery)
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
    // End Detail

    // Update Saldo Murni
    // Simpan Trx
    sqlQuery = `INSERT INTO tt_mutasi_saldo_murni (no_transaksi,no_mutasi,tgl_mutasi,kategori,keterangan,nama_bahan,berat,input_by,input_date) VALUES 
          ('${id}','${noTrxMurni}','${tmpTglTrx}','PEMBUATAN SALDO BAHAN','PEMBUATAN SALDO BAHAN','${tmpDetail[i].nama_bahan}','${tmpDetail[i].berat_bahan}','-','${tmpTgl}')`;
       
    ResultSelect = await dbToko.InsertQuery(strIdCluster[1], sqlQuery)
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
    // End Simpan Trx

    sqlQuery = `UPDATE tt_saldo_stock_murni SET berat = berat - '${tmpDetail[i].berat_bahan}' WHERE nama_bahan = '${tmpDetail[i].nama_bahan}'`;
    ResultSelect = await dbToko.UpdateQuery(strIdCluster[1], sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if (ResultSelect[0] === 500) {
      dbToko.closeConnection(strIdCluster[1]);
      return res.status(500).send("Internal Server Error !");
    }
    // End Update Saldo Murni

  }

  sqlQuery = `INSERT INTO tt_saldo_stock_bahan (no_transaksi,kode_jenis_bahan,berat,berat_susut,input_by,input_date) VALUES 
            ('${id}','${dataJson[1].kode_jenis_bahan}','${dataJson[1].berat}','${dataJson[1].berat_susut}','-','${tmpTgl}')`;
  ResultSelect = await dbToko.InsertQuery(strIdCluster[1], sqlQuery)
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

  await dbToko.CommitTransaction(strIdCluster[1]);
  dbToko.closeConnection(strIdCluster[1]);
  return res.send({
    "status":"berhasil",
    "pesan":`Pembuatan saldo bahan berhasil disimpan.`,
    "data":[{}]
  });
})

// ===============================================================================Laporan Pembuatan Saldo Bahan
router.post('/all', async(req, res) => {
  let sqlQuery = "";

  const {error} = validateGetAll(req.body);
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

  sqlQuery = `SELECT no_transaksi,no_mutasi,tgl_mutasi,kode_jenis_bahan,berat,berat_susut,nama_bahan,berat_bahan,input_by,input_date
              FROM tt_mutasi_saldo_bahan WHERE (tgl_mutasi BETWEEN '${req.body.tgl_awal}' AND '${req.body.tgl_akhir}') AND kategori = 'PEMBUATAN SALDO BAHAN'`;
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
function validateAdd(data){
  const bahan = Joi.object({
    kode_jenis_bahan: Joi.string().min(1).max(30).required(),
    berat: Joi.number().required()
  }).required();

  const schema = Joi.object({
    detail: Joi.array().items(bahan).required()
  });
  return schema.validate(data);
}

function validateCreate(data){
  const bahan = Joi.object({
    nama_bahan: Joi.string().min(1).max(100).required(),
    berat_bahan: Joi.number().required()
  }).required();

  const schema = Joi.object({
    kode_jenis_bahan: Joi.string().min(1).max(30).required(),
    berat: Joi.number().required(),
    berat_susut: Joi.number().required(),
    detail_bahan: Joi.array().items(bahan).required()
  });
  return schema.validate(data);
}

function validateGetAll(bahan){
  const schema = Joi.object({
    tgl_awal: Joi.date().required(),  
    tgl_akhir: Joi.date().required()
  });
  return schema.validate(bahan);
}

module.exports = router;
