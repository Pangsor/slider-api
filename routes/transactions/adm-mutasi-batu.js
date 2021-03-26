const express = require(`express`);
const router = express.Router();
const dbToko = require('../../middleware/sql-function')
const {nsiAuth} = require('../../middleware/auth');
const {GenIdCluster,GenAdmTerimaBatu,GenAdmKirimBatu} = require('../../middleware/generator');
const Joi = require('@hapi/joi');
const {DateNow} = require('../../middleware/datetime');
const {trimUcaseJSON,insertCardAdmin,saldoAdminDebit,saldoAdminKredit} = require('../../middleware/function');
const { dbServer } = require('../../middleware/connections');
const moment = require('moment');
const uuid = require('uuid');

// ===============================================================================Get No Kirim Batu Admin Batu (Terima)
router.get('/tgl_kirim/:tgl_kirim', async(req, res) => {
  const strIdCluster = GenIdCluster("MDN", "CS01");
  if (strIdCluster[0] !== 200) return res.status(strIdCluster[0]).send(strIdCluster[1]);

  let resConn = await dbToko.createConnToko("MDN", strIdCluster[1])
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resConn[0] === 500) return res.status(resConn[0]).send(resConn[1]);

  try{
    var dataParams = trimUcaseJSON(req.params,[]);
    var sqlQuery = `SELECT no_batu_kirim FROM tt_admbatu_kirim_batu WHERE tgl_kirim = '${dataParams[1].tgl_kirim}' AND status_terima = 'DONE'
                   GROUP BY no_batu_kirim ORDER BY no_batu_kirim`;

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
        "pesan":"No Kirim tidak ditemukan !",
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

// ===============================================================================Get Detail Berdasar No Kirim Batu (Terima)
router.get('/no_batu_kirim/:no_batu_kirim', async(req, res) => {
  const strIdCluster = GenIdCluster("MDN", "CS01");
  if (strIdCluster[0] !== 200) return res.status(strIdCluster[0]).send(strIdCluster[1]);

  let resConn = await dbToko.createConnToko("MDN", strIdCluster[1])
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resConn[0] === 500) return res.status(resConn[0]).send(resConn[1]);

  try{
    var dataParams = trimUcaseJSON(req.params,[]);
    var sqlQuery = `SELECT no_transaksi,no_batu_kirim,no_job_order,kode_barang,kode_jenis_bahan,kode_batu,stock_batu,berat_batu FROM tt_admbatu_kirim_batu
          WHERE no_batu_kirim = '${dataParams[1].no_batu_kirim}' AND status_terima='OPEN'`;

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
        "pesan":"No Kirim tidak ditemukan !",
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

// ===============================================================================Simpan Ke Cart Terima 
router.post('/cart/terima', async(req, res) => {
  var i = 0;
  let tmpNoTransaksi = "";
  let tmpNoBatuKirim = "";
  let tmpNoJO = "";
  let tmpKdBrg = "";
  let tmpKdJnsBahan = "";
  let tmpKdBatu = "";
  let tmpStockBatu = 0;
  let tmpBeratBatu = 0;
  let tmpTotBeratBatu = 0;

  const {error} = validateCartTerima(req.body);
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

  // Start Transaction
  resConn = await dbToko.StartTransaction(strIdCluster[1])
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resConn[0] === 500) {
    dbToko.closeConnection(strIdCluster[1])
    return res.status(resConn[0]).send(resConn[1]);
  }

  // Validasi No Kirim
  var sqlQuery = `SELECT no_transaksi,no_batu_kirim,no_job_order,kode_barang,kode_jenis_bahan,kode_batu,stock_batu,berat_batu FROM tt_admbatu_kirim_batu
          WHERE no_batu_kirim = '${dataJson[1].no_kirim_batu}' AND status_terima='OPEN'`;
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
      "pesan":`No kirim batu : ${dataJson[1].no_kirim_batu} tidak ditemukan !`,
      "data":[{}]
    });
  }
  // End Validasi No Kirim

  // No Transaksi
  const resGenKode = await GenAdmTerimaBatu(strIdCluster[1]);
  if (resGenKode[0] !== 200) return resGenKode;
  const noTrx = resGenKode[1];

  // Generate a v4 (random) id
  uuid.v4(); // -> '110ec58a-a0f2-4ac4-8393-c866d813b8d1'
  var id = uuid.v4();

  let tmpTgl = moment(DateNow()).format('YYYY-MM-DD');
  let tmpTglJam = DateNow();

  // Simpan Ke Cart
  for (i in ResultSelect[1]){
    tmpNoTransaksi = ResultSelect[1][i].no_transaksi;
    tmpNoBatuKirim = ResultSelect[1][i].no_batu_kirim;
    tmpNoJO = ResultSelect[1][i].no_job_order;
    tmpKdBrg = ResultSelect[1][i].kode_barang;
    tmpKdJnsBahan = ResultSelect[1][i].kode_jenis_bahan;
    tmpKdBatu = ResultSelect[1][i].kode_batu;
    tmpStockBatu = ResultSelect[1][i].stock_batu;
    tmpBeratBatu = ResultSelect[1][i].berat_batu;

    sqlQuery = `INSERT INTO tt_admin_terima_batu_detail (no_transaksi,no_admin_terima_batu,no_batu_kirim,no_job_order,kode_barang,kode_jenis_bahan,kode_batu
          ,stock_batu,berat_batu) VALUES 
          ('${id}','${noTrx}','${tmpNoBatuKirim}','${tmpNoJO}','${tmpKdBrg}','${tmpKdJnsBahan}','${tmpKdBatu}','${tmpStockBatu}','${tmpBeratBatu}')`;

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

    tmpTotBeratBatu += Number(tmpBeratBatu);

    // Update Status
    sqlQuery = `UPDATE tt_admbatu_kirim_batu SET status_terima = 'DONE' WHERE no_transaksi = '${tmpNoTransaksi}'
            AND kode_batu = '${tmpKdBatu}' LIMIT 1`;
    ResultUpdate = await dbToko.UpdateQuery(strIdCluster[1], sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if (ResultUpdate[0] === 500) {
      await dbToko.RollBackTransaction(strIdCluster[1]);
      dbToko.closeConnection(strIdCluster[1]);
      return res.status(500).send({
        "status":"error",
        "pesan":"Internal Server Error !",
        "data":[{}]
      });
    }
    // Update Status

  }
  // End Simpan Ke Cart

  // Simpan Card
  const resCard = await insertCardAdmin(strIdCluster[1],id,tmpTgl,"ADMIN","TERIMA BATU","TERIMA BATU",tmpNoJO,tmpKdJnsBahan,tmpTotBeratBatu,"-","IN");
  if  (resCard[0] !== 200){
    await dbToko.RollBackTransaction(strIdCluster[1]);
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send("Internal Server Error !");
  }
  // End Simpan Card

  // Update Saldo
  const resSaldo = await saldoAdminDebit(strIdCluster[1],tmpTgl,"ADMIN",tmpKdJnsBahan,tmpTotBeratBatu,"-","berat_terima_batu");
  if  (resSaldo[0] !== 200){
    await dbToko.RollBackTransaction(strIdCluster[1]);
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send("Internal Server Error !");
  }
  // End Update Saldo

  // Simpan Head
  sqlQuery = `INSERT INTO tt_admin_terima_batu_head (no_transaksi,no_admin_terima_batu,tgl_terima_batu,input_by,input_date) VALUES 
      ('${id}','${noTrx}','${tmpTgl}','-','${tmpTglJam}')`;
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
  // End Simpan Head

  await dbToko.CommitTransaction(strIdCluster[1]);
  dbToko.closeConnection(strIdCluster[1]);
  return res.send({
    "status":"berhasil",
    "pesan":`Terima batu berhasil disimpan.`,
    "data":[{}]
  });
})

// ===============================================================================Laporan Admin Terima Batu
router.post('/terima/all', async(req, res) => {
  let sqlQuery = "";

  const {error} = validateGetTerima(req.body);
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

  sqlQuery = `SELECT b.*,a.tgl_terima_batu FROM tt_admin_terima_batu_head a INNER JOIN tt_admin_terima_batu_detail b ON a.no_transaksi = b.no_transaksi WHERE (a.tgl_terima_batu BETWEEN '${dataJson[1].tgl_awal}' AND '${dataJson[1].tgl_akhir}')`;
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

// ===============================================================================KIRIM

// ===============================================================================Get Detail (Kirim)
router.get('/kirim/no_job_order/:no_job_order', async(req, res) => {
  const strIdCluster = GenIdCluster("MDN", "CS01");
  if (strIdCluster[0] !== 200) return res.status(strIdCluster[0]).send(strIdCluster[1]);

  let resConn = await dbToko.createConnToko("MDN", strIdCluster[1])
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resConn[0] === 500) return res.status(resConn[0]).send(resConn[1]);

  try{
    var dataParams = trimUcaseJSON(req.params,[]);
    var sqlQuery = `SELECT a.no_transaksi,a.no_admin_terima_batu,a.no_batu_kirim,a.kode_barang,b.nama_barang,a.kode_jenis_bahan
                  ,a.kode_batu,a.stock_batu,a.berat_batu FROM tt_admin_terima_batu_detail a INNER JOIN tm_barang_master b
                  ON a.kode_barang = b.kode_barang WHERE a.no_job_order = '${dataParams[1].no_job_order}' AND a.status_kirim = 'OPEN'`;

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

// ===============================================================================Simpan Ke Cart (Kirim)
router.post('/cart/kirim', async(req, res) => {
  let tmpKdJnsBhn = "";

  const {error} = validateCartKirim(req.body);
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

  // Start Transaction
  resConn = await dbToko.StartTransaction(strIdCluster[1])
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resConn[0] === 500) {
    dbToko.closeConnection(strIdCluster[1])
    return res.status(resConn[0]).send(resConn[1]);
  }

  // Validasi Divisi
  var sqlQuery = `SELECT kode_divisi,nama_divisi FROM tm_divisi WHERE kode_divisi = '${dataJson[1].kode_divisi}'`;
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
      "pesan":`Divisi : ${dataJson[1].kode_divisi} tidak ditemukan !`,
      "data":[{}]
    });
  }
  // End Validasi Divisi

  // Validasi No JO Dan Kode Barang
  var sqlQuery = `SELECT no_job_order,kode_jenis_bahan FROM tt_admin_terima_batu_detail WHERE no_job_order = '${dataJson[1].no_job_order}'
                 AND kode_barang = '${dataJson[1].kode_barang}' AND kode_batu = '${dataJson[1].kode_batu}' AND status_kirim = 'OPEN'`;
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
      "pesan":`No job order : ${dataJson[1].no_job_order}, kode barang : ${dataJson[1].kode_barang}, kode batu : ${dataJson[1].kode_batu} tidak ditemukan !`,
      "data":[{}]
    });
  }
  // End Validasi No JO Dan  Kode Barang

  tmpKdJnsBhn = ResultSelect[1][0].kode_jenis_bahan;

  // Validasi Cart
  var sqlQuery = `SELECT no_job_order FROM tt_admin_kirim_batu_cart WHERE kode_divisi = '${dataJson[1].kode_divisi}'
                AND no_job_order = '${dataJson[1].no_job_order}' AND kode_barang = '${dataJson[1].kode_barang}' AND kode_batu = '${dataJson[1].kode_batu}'`;
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

  if (Object.keys(ResultSelect[1]).length !== 0) {
    await dbToko.RollBackTransaction(strIdCluster[1]);
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(400).send({
      "status":"error",
      "pesan":`No job order : ${dataJson[1].no_job_order}, kode barang : ${dataJson[1].kode_barang}, kode batu : ${dataJson[1].kode_batu} sudah ada di daftar !`,
      "data":[{}]
    });
  }
  // End Validasi Cart

  // Simpan Ke Cart
  sqlQuery = `INSERT INTO tt_admin_kirim_batu_cart (kode_divisi,no_job_order,kode_barang,kode_jenis_bahan,kode_batu,stock_batu,berat_batu) VALUES 
        ('${dataJson[1].kode_divisi}','${dataJson[1].no_job_order}','${dataJson[1].kode_barang}','${tmpKdJnsBhn}','${dataJson[1].kode_batu}'
        ,'${dataJson[1].jumlah_batu}','${dataJson[1].berat_batu}')`;
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
  // End Simpan Ke Cart

  await dbToko.CommitTransaction(strIdCluster[1]);
  dbToko.closeConnection(strIdCluster[1]);
  return res.send({
    "status":"berhasil",
    "pesan":`Tambah kirim batu berhasil disimpan.`,
    "data":[{}]
  });
})

// ===============================================================================Check Out (Kirim)
router.post('/check-out/kirim', async(req, res) => {
  var i = 0;
  let tmpKdDivisi = "";
  let tmpNmDivisi = "";
  let tmpNoJO = "";
  let tmpKdBrg = "";
  let tmpKdJnsBahan = "";
  let tmpKdBatu = "";
  let tmpStockBatu = 0;
  let tmpBeratBatu = 0;
  let tmpTotBeratBatu = 0;

  const {error} = validateCOKirim(req.body);
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

  // Start Transaction
  resConn = await dbToko.StartTransaction(strIdCluster[1])
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resConn[0] === 500) {
    dbToko.closeConnection(strIdCluster[1])
    return res.status(resConn[0]).send(resConn[1]);
  }

  // Validasi Divisi
  var sqlQuery = `SELECT kode_divisi,nama_divisi FROM tm_divisi WHERE kode_divisi = '${dataJson[1].kode_divisi}'`;
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
      "pesan":`Divisi : ${dataJson[1].kode_divisi} tidak ditemukan !`,
      "data":[{}]
    });
  }
  // End Validasi Divisi

  tmpNmDivisi = ResultSelect[1][0].nama_divisi;

  // Simpan
  var sqlQuery = `SELECT * FROM tt_admin_kirim_batu_cart WHERE kode_divisi = '${dataJson[1].kode_divisi}' AND no_job_order = '${dataJson[1].no_job_order}'`;
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
      "pesan":`Data tidak ditemukan !`,
      "data":[{}]
    });
  }

  // No Transaksi
  const resGenKode = await GenAdmKirimBatu(strIdCluster[1]);
  if (resGenKode[0] !== 200) return resGenKode;
  const noTrx = resGenKode[1];

  // Generate a v4 (random) id
  uuid.v4(); // -> '110ec58a-a0f2-4ac4-8393-c866d813b8d1'
  var id = uuid.v4();

  let tmpTgl = moment(DateNow()).format('YYYY-MM-DD');
  let tmpTglJam = DateNow();

  // Simpan Detail
  for (i in ResultSelect[1]){
    tmpKdDivisi = ResultSelect[1][i].kode_divisi;
    tmpNoJO = ResultSelect[1][i].no_job_order;
    tmpKdBrg = ResultSelect[1][i].kode_barang;
    tmpKdJnsBahan = ResultSelect[1][i].kode_jenis_bahan;
    tmpKdBatu = ResultSelect[1][i].kode_batu;
    tmpStockBatu = ResultSelect[1][i].stock_batu;
    tmpBeratBatu = ResultSelect[1][i].berat_batu;

    tmpTotBeratBatu += Number(tmpBeratBatu);

    sqlQuery = `INSERT INTO tt_admin_kirim_batu (no_transaksi,no_batu_kirim,tgl_batu_kirim,kode_divisi,no_job_order,kode_barang,kode_jenis_bahan
          ,kode_batu,stock_batu,berat_batu,input_by,input_date) VALUES 
          ('${id}','${noTrx}','${tmpTgl}','${tmpKdDivisi}','${tmpNoJO}','${tmpKdBrg}','${tmpKdJnsBahan}','${tmpKdBatu}','${tmpStockBatu}','${tmpBeratBatu}','-','${tmpTglJam}')`;
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

    // Update Status
    sqlQuery = `UPDATE tt_admin_terima_batu_detail SET status_kirim = 'DONE' WHERE no_job_order = '${tmpNoJO}'
              AND kode_barang = '${tmpKdBrg}' AND kode_batu = '${tmpKdBatu}' AND status_kirim = 'OPEN'`;
    ResultStock = await dbToko.UpdateQuery(strIdCluster[1], sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if (ResultStock[0] === 500) {
      await dbToko.RollBackTransaction(strIdCluster[1]);
      dbToko.closeConnection(strIdCluster[1]);
      return res.status(500).send({
        "status":"error",
        "pesan":"Internal Server Error !",
        "data":[{}]
      });
    }
    // End Update Status

  }
  // Simpan Detail

  // Simpan Card
  const resCard = await insertCardAdmin(strIdCluster[1],id,tmpTgl,tmpNmDivisi,"KIRIM BATU","KIRIM BATU",dataJson[1].no_job_order,tmpKdJnsBahan,tmpTotBeratBatu,"-","OUT");
  if  (resCard[0] !== 200){
    await dbToko.RollBackTransaction(strIdCluster[1]);
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send("Internal Server Error !");
  }
  // End Simpan Card

  // Update Saldo
  const resSaldo = await saldoAdminKredit(strIdCluster[1],tmpTgl,tmpNmDivisi,tmpKdJnsBahan,tmpTotBeratBatu,"-","berat_kirim_batu");
  if  (resSaldo[0] !== 200){
    await dbToko.RollBackTransaction(strIdCluster[1]);
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send("Internal Server Error !");
  }
  // End Update Saldo

  // Simpan Head
  sqlQuery = `INSERT INTO tt_admin_kirim_batu_head (no_transaksi,no_batu_kirim,tgl_batu_kirim,input_by,input_date) VALUES 
        ('${id}','${noTrx}','${tmpTgl}','-','${tmpTglJam}')`;
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
  // Simpan Head

  // Hapus Cart
  sqlQuery = `DELETE FROM tt_admin_kirim_batu_cart WHERE kode_divisi = '${dataJson[1].kode_divisi}'`;
  ResultInsert = await dbToko.DeleteQuery(strIdCluster[1], sqlQuery)
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
  // End Hapus Cart

  // End Simpan

  await dbToko.CommitTransaction(strIdCluster[1]);
  dbToko.closeConnection(strIdCluster[1]);
  return res.send({
    "status":"berhasil",
    "pesan":`Kirim batu berhasil disimpan.`,
    "data":[{}]
  });
})

// ===============================================================================Laporan Admin Kirim Batu
router.post('/kirim/all', async(req, res) => {
  let sqlQuery = "";

  const {error} = validateGetTerima(req.body);
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

  sqlQuery = `SELECT * FROM tt_admin_kirim_batu WHERE (tgl_batu_kirim BETWEEN '${dataJson[1].tgl_awal}' AND '${dataJson[1].tgl_akhir}')`;
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

// ===============================================================================Laporan Saldo Admin Berdasar Tgl dan Jenis Bahan
router.post('/sld/all', async(req, res) => {
  let sqlQuery = "";

  const {error} = validateSaldo(req.body);
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

  sqlQuery = `SELECT * FROM tt_saldo_stock_admin WHERE tanggal = '${dataJson[1].tgl}' AND kode_jenis_bahan = '${dataJson[1].kode_jenis_bahan}'`;
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
      return res.send(resultSelect[1]);
    }
    
  }catch(error){
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500, error.message);
  }
})

// ===============================================================================Laporan Saldo Admin Berdasar Tgl dan Jenis Bahan Dan Divisi
router.post('/sld/1', async(req, res) => {
  let sqlQuery = "";

  const {error} = validateSaldo2(req.body);
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

  sqlQuery = `SELECT * FROM tt_saldo_stock_admin WHERE tanggal = '${dataJson[1].tgl}'
             AND kode_jenis_bahan = '${dataJson[1].kode_jenis_bahan}' AND nama_divisi = '${dataJson[1].nama_divisi}'`;
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
      return res.send(resultSelect[1]);
    }
    
  }catch(error){
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500, error.message);
  }
})

// ===============================================================================Validasi
function validateCartTerima(bahan){
  const schema = Joi.object({
    no_kirim_batu: Joi.string().min(1).max(30).required()
  });
  return schema.validate(bahan);
}

function validateGetTerima(bahan){
  const schema = Joi.object({
    tgl_awal: Joi.date().required(),
    tgl_akhir: Joi.date().required()
  });
  return schema.validate(bahan);
}

function validateCartKirim(bahan){
  const schema = Joi.object({
    kode_divisi: Joi.string().min(1).max(60).required(),
    no_job_order: Joi.string().min(1).max(30).required(),
    kode_barang: Joi.string().min(1).max(30).required(),
    kode_batu: Joi.string().min(1).max(30).required(),
    jumlah_batu: Joi.number().required(),
    berat_batu: Joi.number().required()
  });
  return schema.validate(bahan);
}

// Check Out
function validateCOKirim(bahan){
  const schema = Joi.object({
    kode_divisi: Joi.string().min(1).max(60).required(),
    no_job_order: Joi.string().min(1).max(30).required()
  });
  return schema.validate(bahan);
}

function validateSaldo(bahan){
  const schema = Joi.object({
    tgl: Joi.date().required(),
    kode_jenis_bahan: Joi.string().min(1).max(30).required()
  });
  return schema.validate(bahan);
}

function validateSaldo2(bahan){
  const schema = Joi.object({
    tgl: Joi.date().required(),
    kode_jenis_bahan: Joi.string().min(1).max(30).required(),
    nama_divisi: Joi.string().min(1).max(60).required()
  });
  return schema.validate(bahan);
}

module.exports = router;