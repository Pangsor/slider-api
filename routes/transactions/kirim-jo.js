const express = require(`express`);
const router = express.Router();
const dbToko = require('../../middleware/sql-function')
const {nsiAuth} = require('../../middleware/auth');
const {GenIdCluster,GenKirimJO} = require('../../middleware/generator');
const Joi = require('@hapi/joi');
const {DateNow} = require('../../middleware/datetime');
const {trimUcaseJSON,cekNumber,insertCardAdmin,saldoAdminKredit} = require('../../middleware/function');
const { dbServer } = require('../../middleware/connections');
const moment = require('moment');
const uuid = require('uuid');

// ===============================================================================Get JO
router.post('/no_job_order', async(req, res) => {
  const {error} = validateGetJO(req.body);
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

  try{
    var dataParams = trimUcaseJSON(req.params,[]);
    var sqlQuery = `SELECT a.no_job_order,a.kode_barang,b.nama_barang,a.kode_jenis_bahan FROM tt_po_job_order a INNER JOIN tm_barang_master b
                    ON a.kode_barang = b.kode_barang WHERE a.no_job_order = '${dataJson[1].no_job_order}' AND a.status_job='PROSES'
                     AND a.asal_divisi = '${dataJson[1].asal_divisi}' AND a.tujuan_divisi = '${dataJson[1].asal_divisi}'`;

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

// ===============================================================================Simpan Ke Cart
router.post('/cart', async(req, res) => {
  let tmpKdBrg = "";
  let tmpKdJnsBahan = "";
  let i;
  let arrBahan = [];
  let statCari = false;
  
  const {error} = validateCart(req.body);
  if (error) return res.status(500).send({
    "status":"error",
    "pesan":error.details[0].message,
    "data":[{}]
  });
  var dataJson = trimUcaseJSON(req.body,[]);
  var detailBahan = trimUcaseJSON(req.body.detail_bahan,[]);

  // Cel Number
  resCek = cekNumber("jumlah", dataJson[1].jumlah);
  if(resCek[0] !== 200) return res.status(resCek[0]).send({
    "status":"error",
    "pesan":resCek[1],
    "data":[]
  });
  resCek = cekNumber("berat", dataJson[1].berat);
  if(resCek[0] !== 200) return res.status(resCek[0]).send({
    "status":"error",
    "pesan":resCek[1],
    "data":[]
  });

  if (dataJson[1].jumlah < 0) {
    return res.send(`Jumlah kurang atau sama dengan nol!`)
  }

  if (dataJson[1].berat < 0) {
    return res.send(`Berat kurang atau sama dengan nol!`)
  }
  // End Cek Number

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
  var sqlQuery = `SELECT kode_divisi,nama_divisi FROM tm_divisi WHERE nama_divisi = '${dataJson[1].tujuan_divisi}'`;
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
      "pesan":`Divisi dengan nama : ${dataJson[1].tujuan_divisi} tidak ditemukan !`,
      "data":[{}]
    });
  }
  // End Validasi Divisi

  // Validasi No JO
  var sqlQuery = `SELECT no_job_order,kode_barang,kode_jenis_bahan FROM tt_po_job_order WHERE no_job_order = '${dataJson[1].no_job_order}'
                 AND status_job = 'PROSES' AND asal_divisi = '${dataJson[1].asal_divisi}' AND tujuan_divisi = '${dataJson[1].asal_divisi}'`;
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
  // End Validasi No JO

  tmpKdBrg = ResultSelect[1][0].kode_barang;
  tmpKdJnsBahan = ResultSelect[1][0].kode_jenis_bahan;

  // Validasi Bahan,Jumlah Bahan Dan Berat Bahan
  for (i in detailBahan[1]){

    // Cek Duplicate
    statCari = arrBahan.includes(detailBahan[1][i].nama_bahan)
    if (statCari === false){
      arrBahan.push(detailBahan[1][i].nama_bahan)
    }else{
      return res.status(500).send({
        "status":"error",
        "pesan":`Bahan : ${detailBahan[1][i].nama_bahan} sudah ada dalam daftar !`,
        "data":[]
      });
    }
    // End Cek Duplicate

    var sqlQuery = `SELECT nama_bahan FROM tm_bahan WHERE nama_bahan = '${detailBahan[1][i].nama_bahan}'`;
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
        "pesan":`Bahan : ${detailBahan[1][i].nama_bahan} tidak ditemukan !`,
        "data":[{}]
      });
    }

    // Jumlah
    resCek = cekNumber("jumlah_bahan", detailBahan[1][i].jumlah_bahan);
    if(resCek[0] !== 200) return res.status(resCek[0]).send({
      "status":"error",
      "pesan":resCek[1],
      "data":[]
    });

    // Berat
    resCek = cekNumber("berat_bahan", detailBahan[1][i].berat_bahan);
    if(resCek[0] !== 200) return res.status(resCek[0]).send({
      "status":"error",
      "pesan":resCek[1],
      "data":[]
    });

  }
  // End Validasi Bahan

  // Validasi Cart
  var sqlQuery = `SELECT no_job_order FROM tt_admin_kirim_detail_cart WHERE divisi = '${dataJson[1].tujuan_divisi}'
                AND no_job_order = '${dataJson[1].no_job_order}'`;
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
      "pesan":`No job order : ${dataJson[1].no_job_order} sudah ada di daftar !`,
      "data":[{}]
    });
  }
  // End Validasi Cart

  // Simpan Ke Cart
  for (i in detailBahan[1]){
    sqlQuery = `INSERT INTO tt_admin_kirim_detail_cart (asal_divisi,tujuan_divisi,no_job_order,kode_barang,kode_jenis_bahan,stock_out,berat_out,stock_susut,berat_susut
              ,tambahan,stock_bahan,berat_bahan) VALUES 
              ('${dataJson[1].asal_divisi}','${dataJson[1].tujuan_divisi}','${dataJson[1].no_job_order}','${tmpKdBrg}','${tmpKdJnsBahan}','${dataJson[1].jumlah}'
              ,'${dataJson[1].berat}','${dataJson[1].jumlah}','${dataJson[1].berat}','${detailBahan[1][i].nama_bahan}'
              ,'${detailBahan[1][i].jumlah_bahan}','${detailBahan[1][i].berat_bahan}')`;
    
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
  }
  // End Simpan Ke Cart

  await dbToko.CommitTransaction(strIdCluster[1]);
  dbToko.closeConnection(strIdCluster[1]);
  return res.send({
    "status":"berhasil",
    "pesan":`Tambah kirim jo berhasil disimpan.`,
    "data":[{}]
  });
})

// ===============================================================================Check Out
router.post('/check-out', async(req, res) => {
  var i = 0;
  let tmpDivisi = "";
  let tmpAsalDivisi = "";
  let tmpTujuanDivisi = "";
  let tmpNoJO = "";
  let tmpKdBrg = "";
  let tmpKdJnsBahan = "";
  let tmpStockOut = 0;
  let tmpBeratOut = 0;
  let tmpTambahan = "";
  let tmpStockBahan = 0;
  let tmpBeratBahan = 0;
  let tmpTotBeratBahan = 0;

  const {error} = validateCheckOut(req.body);
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
  var sqlQuery = `SELECT kode_divisi FROM tm_divisi WHERE nama_divisi = '${dataJson[1].nama_divisi}'`;
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
      "pesan":`Divisi dengan nama : ${dataJson[1].nama_divisi} tidak ditemukan !`,
      "data":[{}]
    });
  }
  // End Validasi Divisi

  // Simpan
  var sqlQuery = `SELECT * FROM tt_admin_kirim_detail_cart WHERE tujuan_divisi = '${dataJson[1].nama_divisi}' AND no_job_order = '${dataJson[1].no_job_order}'`;
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
  const resGenKode = await GenKirimJO(strIdCluster[1]);
  if (resGenKode[0] !== 200) return resGenKode;
  const noTrx = resGenKode[1];

  // Generate a v4 (random) id
  uuid.v4(); // -> '110ec58a-a0f2-4ac4-8393-c866d813b8d1'
  var id = uuid.v4();

  let tmpTgl = moment(DateNow()).format('YYYY-MM-DD');
  let tmpTglJam = DateNow();

  // Simpan Detail
  for (i in ResultSelect[1]){
    tmpDivisi = ResultSelect[1][i].divisi;
    tmpAsalDivisi = ResultSelect[1][i].asal_divisi;
    tmpTujuanDivisi = ResultSelect[1][i].tujuan_divisi;
    tmpNoJO = ResultSelect[1][i].no_job_order;
    tmpKdBrg = ResultSelect[1][i].kode_barang;
    tmpKdJnsBahan = ResultSelect[1][i].kode_jenis_bahan;
    tmpStockOut = ResultSelect[1][i].stock_out;
    tmpBeratOut = ResultSelect[1][i].berat_out;
    tmpTambahan = ResultSelect[1][i].tambahan;
    tmpStockBahan = ResultSelect[1][i].stock_bahan;
    tmpBeratBahan = ResultSelect[1][i].berat_bahan;

    tmpTotBeratBahan += Number(tmpTotBeratBahan);

    sqlQuery = `INSERT INTO tt_admin_kirim_detail (no_transaksi,no_kirim,asal_divisi,tujuan_divisi,no_job_order,kode_barang,kode_jenis_bahan
          ,stock_out,berat_out,stock_susut,berat_susut,tambahan,stock_bahan,berat_bahan) VALUES 
          ('${id}','${noTrx}','${tmpAsalDivisi}','${tmpTujuanDivisi}','${tmpNoJO}','${tmpKdBrg}','${tmpKdJnsBahan}','${tmpStockOut}','${tmpBeratOut}'
          ,'${tmpStockOut}','${tmpBeratOut}','${tmpTambahan}','${tmpStockBahan}','${tmpBeratBahan}')`;
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

    // Update Tujuan Divisi
    sqlQuery = `UPDATE tt_po_job_order SET tujuan_divisi = '${dataJson[1].nama_divisi}',stock_akhir='${tmpStockOut}',berat_akhir='${tmpBeratOut}' WHERE no_job_order = '${dataJson[1].no_job_order}'`;
    ResultInsert = await dbToko.UpdateQuery(strIdCluster[1], sqlQuery)
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
    // Update Tujuan Divisi


  }
  // Simpan Detail

  // Simpan Card
  const resCard = await insertCardAdmin(strIdCluster[1],id,tmpTgl,dataJson[1].asal_divisi,"KIRIM JOB ORDER","KIRIM JOB ORDER",dataJson[1].no_job_order,tmpKdJnsBahan,tmpBeratOut,"-","OUT");
  if  (resCard[0] !== 200){
    await dbToko.RollBackTransaction(strIdCluster[1]);
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send("Internal Server Error !");
  }
  // End Simpan Card

  // Update Saldo
  const resSaldo = await saldoAdminKredit(strIdCluster[1],tmpTgl,dataJson[1].asal_divisi,tmpKdJnsBahan,tmpBeratOut,"-","berat_kirim_jo");
  if  (resSaldo[0] !== 200){
    await dbToko.RollBackTransaction(strIdCluster[1]);
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send("Internal Server Error !");
  }
  // End Update Saldo

  // Simpan Head
  sqlQuery = `INSERT INTO tt_admin_kirim_head (no_transaksi,no_kirim,tgl_kirim,asal_divisi,tujuan_divisi,tot_stock_out,tot_berat_out,tot_stock_susut
            ,tot_berat_susut,input_by,input_date) VALUES 
            ('${id}','${noTrx}','${tmpTgl}','${tmpAsalDivisi}','${tmpTujuanDivisi}','${tmpStockOut}','${tmpBeratOut}','${tmpStockOut}','${tmpBeratOut}','-','${tmpTglJam}')`;
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
  sqlQuery = `DELETE FROM tt_admin_kirim_detail_cart WHERE divisi = '${dataJson[1].nama_divisi}' AND no_job_order = '${dataJson[1].no_job_order}'`;
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
    "pesan":`Kirim jo berhasil disimpan.`,
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

  sqlQuery = `SELECT b.*,a.tgl_kirim FROM tt_admin_kirim_head a INNER JOIN tt_admin_kirim_detail b ON a.no_transaksi = b.no_transaksi
             WHERE a.asal_divisi = '${dataJson[1].nama_divisi}' AND (a.tgl_kirim BETWEEN '${dataJson[1].tgl_awal}' AND '${dataJson[1].tgl_akhir}')`;
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
function validateGetJO(bahan){
  const schema = Joi.object({
    asal_divisi: Joi.string().min(1).max(50).required(),
    tujuan_divisi: Joi.string().min(1).max(50).required(),
    no_job_order: Joi.string().min(1).max(30).required()
  });
  return schema.validate(bahan);
}

function validateCart(data){
  const bahan = Joi.object({
    nama_bahan: Joi.string().min(1).max(100).required(),
    jumlah_bahan: Joi.number().required(),
    berat_bahan: Joi.number().required()
  }).required();

  const schema = Joi.object({
    asal_divisi: Joi.string().min(1).max(50).required(),
    tujuan_divisi: Joi.string().min(1).max(50).required(),
    no_job_order: Joi.string().min(1).max(30).required(),
    jumlah: Joi.number().required(),
    berat: Joi.number().required(),
    detail_bahan: Joi.array().items(bahan).required()
  });
  return schema.validate(data);
}

function validateCheckOut(bahan){
  const schema = Joi.object({
    nama_divisi: Joi.string().min(1).max(60).required(),
    asal_divisi: Joi.string().min(1).max(60).required(),
    no_job_order: Joi.string().min(1).max(30).required()
  });
  return schema.validate(bahan);
}

function validateReport(bahan){
  const schema = Joi.object({
    nama_divisi: Joi.string().min(1).max(50).required(),
    tgl_awal: Joi.date().required(),
    tgl_akhir: Joi.date().required()
  });
  return schema.validate(bahan);
}

module.exports = router;