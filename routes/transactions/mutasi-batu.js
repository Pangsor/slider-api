const express = require(`express`);
const router = express.Router();
const dbToko = require('../../middleware/sql-function')
const {nsiAuth} = require('../../middleware/auth');
const {GenIdCluster,GenNoTrxMutasi, GenNoTrxKirimBatu} = require('../../middleware/generator');
const Joi = require('@hapi/joi');
const {DateNow} = require('../../middleware/datetime');
const {trimUcaseJSON,cekNumber,insertCardAdmin,saldoAdminDebit} = require('../../middleware/function');
const { dbServer } = require('../../middleware/connections');
const moment = require('moment');
const uuid = require('uuid');

// ===============================================================================Tambah/Ambil Saldo Batu
router.post('/', async(req, res) => {
  let tmpTgl = DateNow();
  let tmpKategori = "";
  let tmpJumlahAk = 0;
  let tmpBeratAk = 0;

  const {error} = validateMutasi(req.body);
  if (error) return res.status(500).send({
    "status":"error", 
    "pesan":error.details[0].message,
    "data":[{}]
  });
  var dataJson = trimUcaseJSON(req.body,[]);
  if (dataJson[1].kategori != "TAMBAH" && dataJson[1].kategori != "AMBIL"){
    return res.status(500).send({
      "status":"error",
      "pesan":"Kategori transaksi Harus TAMBAH/AMBIL",
      "data":[{}]
    })
  }

  resCek = cekNumber("jumlah", req.body.jumlah);
  if(resCek[0] !== 200) return res.status(resCek[0]).send({
    "status":"error",
    "pesan":resCek[1],
    "data":[]
  });

  resCek = cekNumber("berat", req.body.berat);
  if(resCek[0] !== 200) return res.status(resCek[0]).send({
    "status":"error",
    "pesan":resCek[1],
    "data":[]
  });

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

  // Cek Batu
  var sqlQuery = `SELECT kode_batu FROM tm_batu WHERE kode_batu = '${dataJson[1].kode_batu}' LIMIT 1`;
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
      "pesan":`Kode batu : ${dataJson[1].kode_batu} tidak ditemukan !`,
      "data":[{}]
    });
  }
  // End Cek Batu

  // No Transaksi
  const resGenKode = await GenNoTrxMutasi(strIdCluster[1]);
  if  (resGenKode[0] !== 200) return resGenKode;
  const noMutasi = resGenKode[1];
  // End No Transaksi

  let tmpTglMutasi = moment(DateNow()).format('YYYY-MM-DD');
  
  // Tambah Saldo
  if (dataJson[1].kategori === "TAMBAH"){
    tmpKategori = "tambah saldo";

    // Generate a v4 (random) id
    uuid.v4(); // -> '110ec58a-a0f2-4ac4-8393-c866d813b8d1'
    var id = uuid.v4();

    // Simpan Transaksi
    sqlQuery = `INSERT INTO tt_mutasi_batu (no_transaksi,no_mutasi_batu,tgl_mutasi,kategori,keterangan,kode_batu,jumlah,berat,input_by,input_date) VALUES 
    ('${id}','${noMutasi}','${tmpTglMutasi}','TAMBAH','${dataJson[1].keterangan}','${dataJson[1].kode_batu}','${dataJson[1].jumlah}','${dataJson[1].berat}','-','${tmpTgl}')`;
    
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
    // End Simpan Transksi

    // Update Saldo
    var sqlQuery = `SELECT kode_batu,jumlah,berat FROM tt_saldo_stock_batu WHERE kode_batu = '${dataJson[1].kode_batu}' LIMIT 1`;
    var ResultSelect = await dbToko.SelectQuery(strIdCluster[1], sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if (ResultSelect[0] === 500) {
      await dbToko.RollBackTransaction(strIdCluster[1]);
      dbToko.closeConnection(strIdCluster[1]);
      return res.status(500).send("Internal Server Error !");
    }

    if (Object.keys(ResultSelect[1]).length === 0) {
      sqlQuery = `INSERT INTO tt_saldo_stock_batu (kode_batu,jumlah,berat,input_by,input_date) VALUES 
      ('${dataJson[1].kode_batu}','${dataJson[1].jumlah}','${dataJson[1].berat}','-','${tmpTgl}')`;
      
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
    }else{
      
      tmpJumlahAk = Number(ResultSelect[1][0].jumlah) + Number(dataJson[1].jumlah);
      tmpBeratAk = Number(ResultSelect[1][0].berat) + Number(dataJson[1].berat);

      sqlQuery = `UPDATE tt_saldo_stock_batu SET jumlah = '${tmpJumlahAk}',berat = '${tmpBeratAk}' WHERE kode_batu = '${dataJson[1].kode_batu}' LIMIT 1`;
      ResultSelect = await dbToko.UpdateQuery(strIdCluster[1], sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
      if (ResultSelect[0] === 500) {
        await dbToko.RollBackTransaction(strIdCluster[1]);
        dbToko.closeConnection(strIdCluster[1]);
        return res.status(500).send({
          "status":"error",
          "pesan":"Internal Server Error2 !",
          "data":[{}]
        });
      }
      
    }
    // Update Saldo

  }
  // End Tambah Saldo

  // Ambil Saldo
  if (dataJson[1].kategori === "AMBIL"){
    tmpKategori = "ambil saldo";

    // Cek Saldo
    var sqlQuery = `SELECT kode_batu,jumlah,berat FROM tt_saldo_stock_batu WHERE kode_batu = '${dataJson[1].kode_batu}' LIMIT 1`;
    var ResultSelect = await dbToko.SelectQuery(strIdCluster[1], sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if (ResultSelect[0] === 500) {
      await dbToko.RollBackTransaction(strIdCluster[1]);
      dbToko.closeConnection(strIdCluster[1]);
      return res.status(500).send("Internal Server Error !");
    }

    if (Object.keys(ResultSelect[1]).length === 0) {
      await dbToko.RollBackTransaction(strIdCluster[1]);
      dbToko.closeConnection(strIdCluster[1]);
      return res.status(500).send({
        "status":"error",
        "pesan":`Saldo Kode Batu : ${dataJson[1].kode_batu} tidak ditemukan !`,
        "data":[{}]
      });
    }

    if (Number(ResultSelect[1][0].jumlah) < Number(dataJson[1].jumlah)) {
      await dbToko.RollBackTransaction(strIdCluster[1]);
      dbToko.closeConnection(strIdCluster[1]);
      return res.status(500).send({
        "status":"error",
        "pesan":`Saldo Kode Batu : ${dataJson[1].kode_batu} tidak mencukupi !`,
        "data":[{}]
      });
    }
    // End Cek Saldo

    // Generate a v4 (random) id
    uuid.v4(); // -> '110ec58a-a0f2-4ac4-8393-c866d813b8d1'
    var id = uuid.v4();

    // Simpan Transaksi
    sqlQuery = `INSERT INTO tt_mutasi_batu (no_transaksi,no_mutasi_batu,tgl_mutasi,kategori,keterangan,kode_batu,jumlah,berat,input_by,input_date) VALUES 
    ('${id}','${noMutasi}','${tmpTglMutasi}','AMBIL','${dataJson[1].keterangan}','${dataJson[1].kode_batu}','${dataJson[1].jumlah}','${dataJson[1].berat}','-','${tmpTgl}')`;
    
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
    // End Simpan Transksi

    // Update Saldo
    var sqlQuery = `SELECT kode_batu,jumlah,berat FROM tt_saldo_stock_batu WHERE kode_batu = '${dataJson[1].kode_batu}' LIMIT 1`;
    var ResultSelect = await dbToko.SelectQuery(strIdCluster[1], sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if (ResultSelect[0] === 500) {
      dbToko.closeConnection(strIdCluster[1]);
      return res.status(500).send("Internal Server Error !");
    }

    if (Object.keys(ResultSelect[1]).length === 0) {
      sqlQuery = `INSERT INTO tt_saldo_stock_batu (kode_batu,jumlah,berat,input_by,input_date) VALUES 
      ('${dataJson[1].kode_batu}','${dataJson[1].jumlah}','${dataJson[1].berat}','-','${tmpTgl}')`;
      
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
    }else{
      
      tmpJumlahAk = Number(ResultSelect[1][0].jumlah) - Number(dataJson[1].jumlah);
      tmpBeratAk = Number(ResultSelect[1][0].berat) - Number(dataJson[1].berat);

      sqlQuery = `UPDATE tt_saldo_stock_batu SET jumlah = '${tmpJumlahAk}',berat = '${tmpBeratAk}' WHERE kode_batu = '${dataJson[1].kode_batu}' LIMIT 1`;
      ResultSelect = await dbToko.UpdateQuery(strIdCluster[1], sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
      if (ResultSelect[0] === 500) {
        dbToko.closeConnection(strIdCluster[1]);
        return res.status(500).send({
          "status":"error",
          "pesan":"Internal Server Error2 !",
          "data":[{}]
        });
      }
      
    }
    // Update Saldo

  }
  // End Ambil Saldo

  await dbToko.CommitTransaction(strIdCluster[1]);
  dbToko.closeConnection(strIdCluster[1]);
  return res.send({
    "status":"berhasil",
    "pesan":`Transaksi ${tmpKategori} batu berhasil disimpan.`,
    "data":[{}]
  });
})

// ===============================================================================Kirim Ke Produksi
router.post('/kirim-produksi', async(req, res) => {
  let tmpTgl = DateNow();
  let tmpKodeBatu = "";
  let tmpQtyBatu = 0;
  let tmpBeratBatu = 0;
  let tmpTotBeratBatu = 0;
  let tmpNoUrut = 0;
  let statCari = false;
  let arrBatu = [];
  var i;

  const {error} = validateKirim(req.body);
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

  // Start Transaction
  resConn = await dbToko.StartTransaction(strIdCluster[1])
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resConn[0] === 500) {
    dbToko.closeConnection(strIdCluster[1])
    return res.status(resConn[0]).send(resConn[1]);
  }

  var dataJson = trimUcaseJSON(req.body,[]);

  // Cek Kode Barang
  var sqlQuery = `SELECT kode_barang FROM tm_barang_master WHERE kode_barang = '${dataJson[1].kode_barang}' LIMIT 1`;
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

  if (Object.keys(ResultSelect[1]).length === 0) {
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send({
      "status":"error",
      "pesan":`Kode barang : ${dataJson[1].kode_barang} tidak ditemukan !`,
      "data":[{}]
    });
  }
  // End Cek Kode Barang

  // Cek Jenis Bahan
  var sqlQuery = `SELECT kode_jenis_bahan FROM tm_jenis_bahan WHERE kode_jenis_bahan = '${dataJson[1].kode_jenis_bahan}' LIMIT 1`;
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

  if (Object.keys(ResultSelect[1]).length === 0) {
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send({
      "status":"error",
      "pesan":`Jenis bahan : ${dataJson[1].kode_jenis_bahan} tidak ditemukan !`,
      "data":[{}]
    });
  }
  // End Cek Jenis Bahan

  // Cek Batu
  for (let i in dataJson[1].detail_batu){
    tmpKodeBatu = dataJson[1].detail_batu[i].kode_batu;
    tmpQtyBatu = dataJson[1].detail_batu[i].qty_kirim;
    tmpBeratBatu = dataJson[1].detail_batu[i].berat_kirim;

    // Cek Duplicate
    statCari = arrBatu.includes(tmpKodeBatu)
    if (statCari === false){
      arrBatu.push(tmpKodeBatu)
    }else{
      return res.status(500).send({
        "status":"error",
        "pesan":`Kode batu : ${tmpKodeBatu} sudah ada dalam daftar !`,
        "data":[]
      });
    }
    // End Cek Duplicate

    var sqlQuery = `SELECT kode_batu FROM tm_batu WHERE kode_batu = '${tmpKodeBatu}' LIMIT 1`;
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

    if (Object.keys(ResultSelect[1]).length === 0) {
      dbToko.closeConnection(strIdCluster[1]);
      return res.status(500).send({
        "status":"error",
        "pesan":`Kode batu : ${tmpKodeBatu} tidak ditemukan !`,
        "data":[{}]
      });
    }

    // Cek Qty Batu
    resCek = cekNumber("qty_kirim", tmpQtyBatu);
    if(resCek[0] !== 200) return res.status(resCek[0]).send({
      "status":"error",
      "pesan":resCek[1],
      "data":[]
    });
    // End Cek Qty Batu

    // Cek Berat Batu
    resCek = cekNumber("berat_kirim", tmpBeratBatu);
    if(resCek[0] !== 200) return res.status(resCek[0]).send({
      "status":"error",
      "pesan":resCek[1],
      "data":[]
    });
    // End Cek Berat Batu
     
  }
  // End Cek Batu

  const resGenKode = await GenNoTrxKirimBatu(strIdCluster[1]);
  if  (resGenKode[0] !== 200) return resGenKode;
  const noKirim = resGenKode[1];

  let tmpTglKirim = moment(DateNow()).format('YYYY-MM-DD');
  tmpKodeBatu = "";
  tmpQtyBatu = 0;
  tmpBeratBatu = 0;

  // Generate a v4 (random) id
  uuid.v4(); // -> '110ec58a-a0f2-4ac4-8393-c866d813b8d1'
  var id = uuid.v4();

  // Simpan
  for(let i in dataJson[1].detail_batu){
    tmpKodeBatu = dataJson[1].detail_batu[i].kode_batu;
    tmpQtyBatu = dataJson[1].detail_batu[i].qty_kirim;
    tmpBeratBatu = dataJson[1].detail_batu[i].berat_kirim;
    tmpNoUrut = Number(i) + Number(1)
    sqlQuery = `INSERT INTO tt_admbatu_kirim_batu (no_transaksi,no_batu_kirim,tgl_kirim,no_job_order,kode_barang,kode_jenis_bahan,no_urut_batu,
               kode_batu,stock_batu,berat_batu,input_by,input_date) VALUES 
               ('${id}','${noKirim}','${tmpTglKirim}','${dataJson[1].no_job_order}','${dataJson[1].kode_barang}','${dataJson[1].kode_jenis_bahan}',
               '${tmpNoUrut}','${tmpKodeBatu}','${tmpQtyBatu}','${tmpBeratBatu}','-','${tmpTgl}')`;
    
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

    tmpTotBeratBatu += Number(tmpBeratBatu);
    
  }
  // End Simpan

  // Simpan Card
  // const resCek2 = await insertCardAdmin(strIdCluster[1],id,tmpTglKirim,"PUSAT","KIRIM BATU KE PRODUKSI","KIRIM BATU KE PRODUKSI",dataJson[1].no_job_order,dataJson[1].kode_jenis_bahan,tmpTotBeratBatu,"-","IN");
  // if (resCek2[0] !== 200){
  //   await dbToko.RollBackTransaction(strIdCluster[1]);
  //   dbToko.closeConnection(strIdCluster[1]);
  //   return res.status(500).send("Internal Server Error !");
  // }
  // End Simpan Card

  // Simpan Saldo
  // const resCek3 = await saldoAdminDebit(strIdCluster[1],tmpTglKirim,"PUSAT",dataJson[1].kode_jenis_bahan,tmpTotBeratBatu,"-","berat_kirim_batu_produksi");
  // if (resCek3[0] !== 200){
  //   await dbToko.RollBackTransaction(strIdCluster[1]);
  //   dbToko.closeConnection(strIdCluster[1]);
  //   return res.status(500).send("Internal Server Error !");
  // }
  // End Simpan Saldo

  await dbToko.CommitTransaction(strIdCluster[1]);
  dbToko.closeConnection(strIdCluster[1]);
  return res.send({
    "status":"berhasil",
    "pesan":"Kirim batu produksi berhasil disimpan.",
    "data":[{}]
  });
})

// ===============================================================================Laporan Tambah/Ambil Saldo Batu Dan Kirim Batu
router.post('/all', async(req, res) => {
  let sqlQuery = "";

  const {error} = validateGetAll(req.body);
  if (error) return res.status(500).send({
    "status":"error",
    "pesan":error.details[0].message,
    "data":[{}]
  });

  var dataJson = trimUcaseJSON(req.body,[]);
  if (dataJson[1].kategori != "TAMBAH" && dataJson[1].kategori != "AMBIL" && dataJson[1].kategori != "KIRIM"){
    return res.status(500).send({
      "status":"error",
      "pesan":"Kategori Harus TAMBAH/AMBIL/KIRIM",
      "data":[{}]
    })
  }

  const strIdCluster = GenIdCluster("MDN", "CS01");
  if (strIdCluster[0] !== 200) return res.status(strIdCluster[0]).send(strIdCluster[1]);

  let resConn = await dbToko.createConnToko("MDN", strIdCluster[1])
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resConn[0] === 500) return res.status(resConn[0]).send(resConn[1]);

  if (dataJson[1].kategori === "TAMBAH"){
    sqlQuery = `SELECT no_transaksi,no_mutasi_batu,tgl_mutasi,keterangan,kode_batu,jumlah,berat FROM tt_mutasi_batu WHERE kategori = 'TAMBAH'
               AND (tgl_mutasi BETWEEN '${dataJson[1].tgl_awal}' AND '${dataJson[1].tgl_akhir}')`;
  }else if (dataJson[1].kategori === "AMBIL"){
    sqlQuery = `SELECT no_transaksi,no_mutasi_batu,tgl_mutasi,keterangan,kode_batu,jumlah,berat FROM tt_mutasi_batu WHERE kategori = 'AMBIL'`;
  }else{
    sqlQuery = `SELECT * FROM tt_admbatu_kirim_batu WHERE tgl_kirim BETWEEN '${dataJson[1].tgl_awal}' AND '${dataJson[1].tgl_akhir}'`;
  }

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

// ===============================================================================Laporan Semua Saldo Batu
router.get('/saldo-batu/all', async(req, res) => {
  let sqlQuery = "";

  const strIdCluster = GenIdCluster("MDN", "CS01");
  if (strIdCluster[0] !== 200) return res.status(strIdCluster[0]).send(strIdCluster[1]);

  let resConn = await dbToko.createConnToko("MDN", strIdCluster[1])
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resConn[0] === 500) return res.status(resConn[0]).send(resConn[1]);

  sqlQuery = `SELECT kode_batu,jumlah,berat FROM tt_saldo_stock_batu`;
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

// ===============================================================================Laporan Saldo Batu Per Kode
router.get('/saldo-batu/1/:kode_batu', async(req, res) => {
  let sqlQuery = "";

  var dataParams = trimUcaseJSON(req.params,[]);
  const strIdCluster = GenIdCluster("MDN", "CS01");
  if (strIdCluster[0] !== 200) return res.status(strIdCluster[0]).send(strIdCluster[1]);

  let resConn = await dbToko.createConnToko("MDN", strIdCluster[1])
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resConn[0] === 500) return res.status(resConn[0]).send(resConn[1]);

  sqlQuery = `SELECT kode_batu,jumlah,berat FROM tt_saldo_stock_batu WHERE kode_batu = '${dataParams[1].kode_batu}'`;
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
function validateMutasi(bahan){
  const schema = Joi.object({
    kategori: Joi.string().min(1).max(7).required(),    
    kode_batu: Joi.string().min(1).max(30).required(),
    jumlah: Joi.number().required(),
    berat: Joi.number().required(),
    keterangan: Joi.string().min(1).max(100).required()
  });
  return schema.validate(bahan);
}

function validateKirim(bahan){
  const batu = Joi.object({
    kode_batu: Joi.string().min(1).max(30).required(),
    qty_kirim: Joi.number().required(),
    berat_kirim: Joi.number().required()
  }).required();

  const schema = Joi.object({
    no_job_order: Joi.string().min(1).max(40).required(),
    kode_barang: Joi.string().min(1).max(30).required(),
    kode_jenis_bahan: Joi.string().min(1).max(30).required(),
    detail_batu: Joi.array().items(batu).required()
  });
  return schema.validate(bahan);
}

function validateGetAll(bahan){
  const schema = Joi.object({
    kategori: Joi.string().min(1).max(30).required(),
    tgl_awal: Joi.date().required(),    
    tgl_akhir: Joi.date().required()
  });
  return schema.validate(bahan);
}

module.exports = router;