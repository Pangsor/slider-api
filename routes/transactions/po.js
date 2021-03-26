const express = require(`express`);
const router = express.Router();
const dbToko = require('../../middleware/sql-function')
const { nsiAuth } = require('../../middleware/auth');
const { GenIdCluster, GenNoJO, GenNoTrxPO } = require('../../middleware/generator');
const Joi = require('@hapi/joi');
const { DateNow } = require('../../middleware/datetime');
const { trimUcaseJSON, cekNumber, mutasiSaldoBatu } = require('../../middleware/function');
const { dbServer } = require('../../middleware/connections');
const { number } = require('@hapi/joi');

// ===============================================================================Simpan PO
router.post('/', async (req, res) => {
  let tmpTgl = DateNow();
  let tmpDetailUkuran = [];
  let arrUkuran = [];
  let tmpUkuran = "";
  let tmpUkuran2 = "";
  let tmpUkuranSem = "";
  let tmpBerat = "";
  let tmpBerat2 = "";
  let tmpJumlah = "";
  let tmpJumlah2 = "";
  let statCari = false;
  var i;

  const { error } = validatePO(req.body);
  if (error) return res.status(500).send({
    "status": "error",
    "pesan": error.details[0].message,
    "data": [{}]
  });
  var dataJson = trimUcaseJSON(req.body, []);
  tmpDetailUkuran = dataJson[1].detail_ukuran;

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

  // Validasi Marketing
  var sqlQuery = `SELECT kode_marketing FROM tm_marketing WHERE kode_marketing = '${dataJson[1].kode_marketing}' LIMIT 1`;
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
      "pesan": `Kode marketing : ${dataJson[1].kode_marketing} tidak ditemukan !`,
      "data": [{}]
    });
  }
  // End Validasi Marketing

  // Validasi Customer
  var sqlQuery = `SELECT kode_customer FROM tm_customer WHERE kode_customer = '${dataJson[1].kode_customer}' LIMIT 1`;
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
      "pesan": `Kode customer : ${dataJson[1].kode_customer} tidak ditemukan !`,
      "data": [{}]
    });
  }
  // End Validasi Customer

  // Validasi Barang
  var sqlQuery = `SELECT kode_barang FROM tm_barang_master WHERE kode_barang = '${dataJson[1].kode_barang}' LIMIT 1`;
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
      "pesan": `Kode barang : ${dataJson[1].kode_barang} tidak ditemukan !`,
      "data": [{}]
    });
  }
  // End Validasi Barang

  // Validasi Jenis Bahan
  var sqlQuery = `SELECT kode_jenis_bahan FROM tm_jenis_bahan WHERE kode_jenis_bahan = '${dataJson[1].kode_jenis_bahan}' LIMIT 1`;
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
      "pesan": `Kode jenis bahan : ${dataJson[1].kode_jenis_bahan} tidak ditemukan !`,
      "data": [{}]
    });
  }
  // End Validasi Jenis Bahan

  // Validasi Stamp
  var sqlQuery = `SELECT kode_stamp FROM tm_stamp WHERE kode_stamp = '${dataJson[1].kode_stamp}' LIMIT 1`;
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
      "pesan": `Kode stamp : ${dataJson[1].kode_stamp} tidak ditemukan !`,
      "data": [{}]
    });
  }
  // End Validasi Stamp

  // Validasi Ukuran,Berat Dan Jumlah
  for (i in tmpDetailUkuran) {
    tmpUkuranSem = tmpDetailUkuran[i].nama_ukuran;
    tmpUkuranSem = tmpUkuranSem.toUpperCase();

    // Cek Duplicate
    statCari = arrUkuran.includes(tmpUkuranSem)
    if (statCari === false) {
      arrUkuran.push(tmpUkuranSem)
    } else {
      return res.status(500).send({
        "status": "error",
        "pesan": `Ukuran : ${tmpUkuranSem} sudah ada dalam daftar !`,
        "data": []
      });
    }
    // End Cek Duplicate

    var sqlQuery = `SELECT nama_ukuran FROM tm_ukuran WHERE nama_ukuran = '${tmpDetailUkuran[i].nama_ukuran}' LIMIT 1`;
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
        "pesan": `Ukuran : ${tmpDetailUkuran[i].nama_ukuran} tidak ditemukan !`,
        "data": [{}]
      });
    }

    resCek = cekNumber("berat", tmpDetailUkuran[i].berat);
    if (resCek[0] !== 200) return res.status(resCek[0]).send({
      "status": "error",
      "pesan": resCek[1],
      "data": []
    });

    resCek = cekNumber("jumlah", tmpDetailUkuran[i].jumlah);
    if (resCek[0] !== 200) return res.status(resCek[0]).send({
      "status": "error",
      "pesan": resCek[1],
      "data": []
    });

    tmpUkuran += tmpDetailUkuran[i].nama_ukuran + "|";
    tmpBerat += Number(tmpDetailUkuran[i].berat) + "|";
    tmpJumlah += Number(tmpDetailUkuran[i].jumlah) + "|";
  }
  // End Validasi Ukuran,Berat Dan Jumlah

  tmpUkuran2 = tmpUkuran.substr(0, tmpUkuran.length - 1)
  tmpBerat2 = tmpBerat.substr(0, tmpBerat.length - 1)
  tmpJumlah2 = tmpJumlah.substr(0, tmpJumlah.length - 1)

  // No Transaksi
  const resGenKode = await GenNoJO(strIdCluster[1]);
  if (resGenKode[0] !== 200) return resGenKode;
  const noTrxJO = resGenKode[1];
  // End No Transaksi

  // Simpan PO JO
  sqlQuery = `INSERT INTO tt_po_job_order (no_po_marketing,tgl_po,tgl_kirim_produksi,tgl_kirim_marketing,no_job_order,kode_marketing,kode_customer,pesanan
    ,kode_barang,kode_jenis_bahan,ukuran,berat_cad,stock_order,input_by,input_date) VALUES 
    ('-','${dataJson[1].tgl_po}','${dataJson[1].tgl_deadline}','${dataJson[1].tgl_delivery}','${noTrxJO}','${dataJson[1].kode_marketing}','${dataJson[1].kode_customer}'
    ,'${dataJson[1].pesanan}','${dataJson[1].kode_barang}','${dataJson[1].kode_jenis_bahan}'
    ,'${tmpUkuran2}','${tmpBerat2}','${tmpJumlah2}','-','${tmpTgl}')`;

  ResultSelect = await dbToko.InsertQuery(strIdCluster[1], sqlQuery)
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
  // End Simpan PO JO

  for (i in tmpDetailUkuran) {
    // Simpan Detail
    sqlQuery = `INSERT INTO tt_po_marketing_detail (no_po_marketing,no_job_order,kode_barang,kode_jenis_bahan,kode_stamp,ongkos,ketentuan,catatan_diproduksi
          ,kode_warna_master,ukuran,stock,berat) VALUES 
          ('-','${noTrxJO}','${dataJson[1].kode_barang}','${dataJson[1].kode_jenis_bahan}','${dataJson[1].kode_stamp}','${dataJson[1].ongkos}','${dataJson[1].keterangan}'
          ,'${dataJson[1].catatan_produksi}','${dataJson[1].kode_warna}','${tmpDetailUkuran[i].nama_ukuran}','${tmpDetailUkuran[i].jumlah}','${tmpDetailUkuran[i].berat}')`;

    ResultSelect = await dbToko.InsertQuery(strIdCluster[1], sqlQuery)
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
    // End Simpan Detail

  }

  await dbToko.CommitTransaction(strIdCluster[1]);
  dbToko.closeConnection(strIdCluster[1]);
  return res.send({
    "status": "berhasil",
    "pesan": `Draft po berhasil disimpan.`,
    "data": [{}]
  });
})

// ===============================================================================Get JO Status OPEN
router.post('/jo-open', async (req, res) => {
  let sqlQuery = "";
  var i;
  var tmpDetail = [];

  const { error } = validateGetAll(req.body);
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

  sqlQuery = `SELECT no_job_order,kode_barang,kode_jenis_bahan,ukuran,berat_cad,stock_order FROM tt_po_job_order
             WHERE (tgl_po BETWEEN '${req.body.tgl_awal}' AND '${req.body.tgl_akhir}') AND status_job = 'OPEN'
             AND kode_marketing = '${dataJson[1].kode_marketing}' AND kode_customer = '${dataJson[1].kode_customer}' ORDER BY no_job_order`;
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


// ===============================================================================Batal PO
router.post('/batal-po', async (req, res) => {
  var i = 0;
  let statCari = false;
  let tmpJO = "";
  let arrJO = [];

  const { error } = valideBatalPo(req.body);
  if (error) return res.status(500).send({
    "status": "error",
    "pesan": error.details[0].message,
    "data": [{}]
  });

  var dataJson = trimUcaseJSON(req.body.detail_jo, []);
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

  // Delete PO
  for (i in dataJson[1]) {
    tmpJO = dataJson[1][i].no_job_order;

    // Cek Duplicate
    statCari = arrJO.includes(tmpJO)
    if (statCari === false) {
      arrJO.push(tmpJO)
    } else {
      return res.status(500).send({
        "status": "error",
        "pesan": `No job order : ${tmpJO} sudah ada dalam daftar !`,
        "data": []
      });
    }
    // End Cek Duplicate


    var sqlQuery = `DELETE FROM tt_po_job_order WHERE no_job_order = '${tmpJO}' AND status_job = 'OPEN'`;
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

    var sqlQuery = `DELETE FROM tt_po_marketing_detail WHERE no_job_order = '${tmpJO}'`;
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

  }
  // End Delete PO

  await dbToko.CommitTransaction(strIdCluster[1]);
  dbToko.closeConnection(strIdCluster[1]);
  return res.send({
    "status": "berhasil",
    "pesan": `Pembatalan PO Berhasil.`,
    "data": [{}]
  });
})

// ===============================================================================Validasi JO
router.post('/validasi', async (req, res) => {
  var i = 0;
  let statCari = false;
  let tmpJO = "";
  let arrJO = [];
  let tmpTglPO = "";
  let tmpTglDeadLine = "";
  let tmpTglDelivery = "";
  let tmpKdMkt = "";
  let tmpKdCust = "";
  let tmpPesanan = "";
  let tmpInputBy = "";
  let tmpInputDate = "";

  const { error } = validateJO(req.body);
  if (error) return res.status(500).send({
    "status": "error",
    "pesan": error.details[0].message,
    "data": [{}]
  });

  var dataJson = trimUcaseJSON(req.body.detail_jo, []);
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

  // Validasi JO
  for (i in dataJson[1]) {
    tmpJO = dataJson[1][i].no_job_order;

    // Cek Duplicate
    statCari = arrJO.includes(tmpJO)
    if (statCari === false) {
      arrJO.push(tmpJO)
    } else {
      return res.status(500).send({
        "status": "error",
        "pesan": `No job order : ${tmpJO} sudah ada dalam daftar !`,
        "data": []
      });
    }
    // End Cek Duplicate


    var sqlQuery = `SELECT tgl_po,tgl_kirim_produksi,tgl_kirim_marketing,no_job_order,kode_marketing,kode_customer,pesanan,input_by,input_date
                   FROM tt_po_job_order WHERE no_job_order = '${tmpJO}' AND status_job = 'OPEN'`;
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
        "pesan": `No job order : ${tmpJO} tidak ditemukan !`,
        "data": [{}]
      });
    }

    // 
    tmpTglPO = ResultSelect[1][0].tgl_po;
    tmpTglDeadLine = ResultSelect[1][0].tgl_kirim_produksi;
    tmpTglDelivery = ResultSelect[1][0].tgl_kirim_marketing;
    tmpKdMkt = ResultSelect[1][0].kode_marketing;
    tmpKdCust = ResultSelect[1][0].kode_customer;
    tmpPesanan = ResultSelect[1][0].pesanan;
    tmpInputBy = ResultSelect[1][0].input_by;
    tmpInputDate = ResultSelect[1][0].input_date;
    // 

  }
  // End Validasi JO

  // No Transaksi
  const resGenKode = await GenNoTrxPO(strIdCluster[1]);
  if (resGenKode[0] !== 200) return resGenKode;
  const noTrxPO = resGenKode[1];
  // No Transaksi

  // Simpan Head
  sqlQuery = `INSERT INTO tt_po_marketing_head (no_po_marketing,tgl_po,tgl_deadline,tgl_delivery,kode_marketing,kode_customer,pesanan,input_by,input_date) VALUES 
    ('${noTrxPO}','${tmpTglPO}','${tmpTglDeadLine}','${tmpTglDelivery}','${tmpKdMkt}','${tmpKdCust}','${tmpPesanan}','${tmpInputBy}','${tmpInputDate}')`;
  ResultSelect = await dbToko.InsertQuery(strIdCluster[1], sqlQuery)
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
  // Simpan Head

  // Simpan Detail
  for (i in dataJson[1]) {
    tmpJO = dataJson[1][i].no_job_order;
    var sqlQuery = `SELECT no_job_order FROM tt_po_job_order WHERE no_job_order = '${tmpJO}' AND status_job = 'OPEN'`;
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
        "pesan": `No job order : ${tmpJO} tidak ditemukan !`,
        "data": [{}]
      });
    }

    // Update JO
    sqlQuery = `UPDATE tt_po_job_order SET no_po_marketing = '${noTrxPO}', status_job = 'DONE' WHERE no_job_order = '${tmpJO}' LIMIT 1`;
    ResultSelect = await dbToko.UpdateQuery(strIdCluster[1], sqlQuery)
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
    // End Update JO

    // Update PO Detail
    sqlQuery = `UPDATE tt_po_marketing_detail SET no_po_marketing = '${noTrxPO}',status = 'DONE' WHERE no_job_order = '${tmpJO}'`;
    ResultSelect = await dbToko.UpdateQuery(strIdCluster[1], sqlQuery)
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
    // End Update PO Detail

  }
  // Simpan Detail

  await dbToko.CommitTransaction(strIdCluster[1]);
  dbToko.closeConnection(strIdCluster[1]);
  return res.send({
    "status": "berhasil",
    "pesan": `Draft po berhasil disimpan.`,
    "data": [{}]
  });
})

// ===============================================================================Get No PO
router.post('/all/no_po_marketing', async (req, res) => {
  let sqlQuery = "";
  var i;
  var tmpDetail = [];

  const { error } = validateGetAll(req.body);
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

  sqlQuery = `SELECT a.no_po_marketing FROM tt_po_marketing_head a INNER JOIN tt_po_marketing_detail b ON a.no_po_marketing = b.no_po_marketing
            WHERE (a.tgl_po BETWEEN '${req.body.tgl_awal}' AND '${req.body.tgl_akhir}') AND a.kode_marketing = '${dataJson[1].kode_marketing}'
            AND a.kode_customer = '${dataJson[1].kode_customer}'  GROUP BY a.no_po_marketing`;
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

// ===============================================================================Laporan Per PO
router.post('/1/:no_po_marketing', async (req, res) => {
  let sqlQuery = "";

  var dataParams = trimUcaseJSON(req.params, []);

  const strIdCluster = GenIdCluster("MDN", "CS01");
  if (strIdCluster[0] !== 200) return res.status(strIdCluster[0]).send(strIdCluster[1]);

  let resConn = await dbToko.createConnToko("MDN", strIdCluster[1])
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err] });
  if (resConn[0] === 500) return res.status(resConn[0]).send(resConn[1]);

  sqlQuery = `SELECT a.no_po_marketing,a.tgl_po,a.tgl_deadline,a.tgl_delivery,c.nama_marketing,d.nama_customer,b.no_job_order,a.pesanan,b.kode_barang
              ,b.ongkos,b.ketentuan,b.catatan_diproduksi,b.ukuran,b.stock,b.berat FROM tt_po_marketing_head a
              INNER JOIN tt_po_marketing_detail b ON a.no_po_marketing = b.no_po_marketing INNER JOIN tm_marketing c ON a.kode_marketing = c.kode_marketing
              INNER JOIN tm_customer d ON a.kode_customer = d.kode_customer WHERE a.no_po_marketing = '${dataParams[1].no_po_marketing}'
              ORDER BY a.no_po_marketing`;
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

// ===============================================================================Laporan Per Tanggal
router.post('/all/bydate', async (req, res) => {
  let sqlQuery = "";

  const { error } = validateGetAllDate(req.body);
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

  sqlQuery = `SELECT a.no_po_marketing,a.tgl_po,a.tgl_deadline,a.tgl_delivery,c.nama_marketing,d.nama_customer,a.pesanan,b.kode_barang
              ,b.ongkos,b.ketentuan,b.catatan_diproduksi,b.ukuran,b.stock,b.berat FROM tt_po_marketing_head a
              INNER JOIN tt_po_marketing_detail b ON a.no_po_marketing = b.no_po_marketing INNER JOIN tm_marketing c ON a.kode_marketing = c.kode_marketing
              INNER JOIN tm_customer d ON a.kode_customer = d.kode_customer WHERE (a.tgl_po BETWEEN '${req.body.tgl_awal}' AND '${req.body.tgl_akhir}')
              ORDER BY a.no_po_marketing`;
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

// ===============================================================================Get Ukuran By Kode Barang
router.get('/ukuran/kode-barang/:kode_barang', async (req, res) => {
  let sqlQuery = "";
  var i;
  var tmpDetail = [];

  var dataParams = trimUcaseJSON(req.params, []);

  const strIdCluster = GenIdCluster("MDN", "CS01");
  if (strIdCluster[0] !== 200) return res.status(strIdCluster[0]).send(strIdCluster[1]);

  let resConn = await dbToko.createConnToko("MDN", strIdCluster[1])
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err] });
  if (resConn[0] === 500) return res.status(resConn[0]).send(resConn[1]);

  sqlQuery = `SELECT ukuran FROM tm_barang_master_detail WHERE kode_barang = '${dataParams[1].kode_barang}' ORDER BY ukuran`;
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

// ===============================================================================Validasi
function validatePO(bahan) {
  const ukuran = Joi.object({
    nama_ukuran: Joi.string().min(1).max(100).required(),
    berat: Joi.number().required(),
    jumlah: Joi.number().required()
  }).required();

  const schema = Joi.object({
    tgl_po: Joi.date().required(),
    tgl_deadline: Joi.date().required(),
    tgl_delivery: Joi.date().required(),
    kode_marketing: Joi.string().min(1).max(30).required(),
    kode_customer: Joi.string().min(1).max(30).required(),
    pesanan: Joi.string().min(1).max(30).required(),
    kode_barang: Joi.string().min(1).max(30).required(),
    kode_jenis_bahan: Joi.string().min(1).max(30).required(),
    kode_stamp: Joi.string().min(1).max(30).required(),
    kode_warna: Joi.string().min(1).max(10).required(),
    ongkos: Joi.number().required(),
    keterangan: Joi.string().min(1).max(200).required(),
    catatan_produksi: Joi.string().min(1).max(200).required(),
    detail_ukuran: Joi.array().items(ukuran).required()
  });
  return schema.validate(bahan);
}

function validateGetAll(bahan) {
  const schema = Joi.object({
    tgl_awal: Joi.string().min(1).max(30).required(),
    tgl_akhir: Joi.string().min(1).max(30).required(),
    kode_marketing: Joi.string().min(1).max(30).required(),
    kode_customer: Joi.string().min(1).max(30).required()
  });
  return schema.validate(bahan);
}

function validateGetAllDate(bahan) {
  const schema = Joi.object({
    tgl_awal: Joi.string().min(1).max(30).required(),
    tgl_akhir: Joi.string().min(1).max(30).required()
  });
  return schema.validate(bahan);
}

function validateJO(bahan) {
  const no_jo = Joi.object({
    no_job_order: Joi.string().min(1).max(100).required()
  }).required();

  const schema = Joi.object({
    detail_jo: Joi.array().items(no_jo).required()
  });
  return schema.validate(bahan);
}

function valideBatalPo(bahan) {
  const no_jo = Joi.object({
    no_job_order: Joi.string().min(1).max(100).required()
  }).required();

  const schema = Joi.object({
    detail_jo: Joi.array().items(no_jo).required()
  });
  return schema.validate(bahan);
}

module.exports = router;
