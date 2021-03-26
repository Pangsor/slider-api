const express = require(`express`);
const router = express.Router();
const dbToko = require('../../middleware/sql-function')
const { nsiAuth } = require('../../middleware/auth');
const { GenIdCluster, GenNoTrxCreateLilin, GenNoTrxCreateTree } = require('../../middleware/generator');
const Joi = require('@hapi/joi');
const { DateNow } = require('../../middleware/datetime');
const { trimUcaseJSON, cekNumber } = require('../../middleware/function');
const { dbServer } = require('../../middleware/connections');
const moment = require('moment');
const uuid = require('uuid');

// ===============================================================================Get JO (Pembuatan Lilin)
router.get('/no_job_order/:no_job_order', async (req, res) => {
  const strIdCluster = GenIdCluster("MDN", "CS01");
  if (strIdCluster[0] !== 200) return res.status(strIdCluster[0]).send(strIdCluster[1]);

  let resConn = await dbToko.createConnToko("MDN", strIdCluster[1])
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err] });
  if (resConn[0] === 500) return res.status(resConn[0]).send(resConn[1]);

  try {
    var dataParams = trimUcaseJSON(req.params, []);

    var sqlQueryCek = `SELECT no_job_order FROM tt_wax_buat_lilin_detail WHERE no_job_order='${dataParams[1].no_job_order}'`;
    const resultSelecta = await dbToko.SelectQuery(strIdCluster[1], sqlQueryCek)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err] });
    if (resultSelecta[1].length == 0) {
      // return res.send({
      //   "status": "gagal",
      //   "pesan": "No Job Order Sudah Dibuat Lilin !",
      //   "data": resultSelect[1]
      // });
    }else{
      return res.send({
        "status": "gagal",
        "pesan": "No Job Order Sudah Dibuat Lilin !",
      });
      return;
    }


    var sqlQuery = `SELECT a.no_job_order,a.kode_barang,b.nama_barang,a.kode_jenis_bahan,a.stock_order FROM tt_po_job_order a INNER JOIN tm_barang_master b
                    ON a.kode_barang = b.kode_barang WHERE a.no_job_order = '${dataParams[1].no_job_order}' AND a.status_job = 'DONE'`;
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
        "pesan": "No Jo tidak ditemukan !",
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

// ===============================================================================Simpan Ke Cart Lilin
router.post('/cart-lilin', async (req, res) => {
  const { error } = validateCartLilin(req.body);
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

  // Validasi Staff
  var sqlQuery = `SELECT kode_staff FROM tm_staff WHERE kode_staff = '${dataJson[1].kode_staff}' LIMIT 1`;
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
      "pesan": `Staff : ${dataJson[1].kode_staff} tidak ditemukan !`,
      "data": [{}]
    });
  }
  // End Validasi Staff

  // Validasi No JO
  var sqlQuery = `SELECT no_job_order FROM tt_po_job_order WHERE no_job_order = '${dataJson[1].no_job_order}' AND status_job = 'DONE' LIMIT 1`;
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
      "pesan": `No JO : ${dataJson[1].no_job_order} tidak ditemukan !`,
      "data": [{}]
    });
  }
  // End Validasi No JO

  // Validasi Berat Dan Jumlah
  resCek = cekNumber("berat", dataJson[1].berat);
  if (resCek[0] !== 200) return res.status(resCek[0]).send({
    "status": "error",
    "pesan": resCek[1],
    "data": []
  });

  resCek = cekNumber("jumlah", dataJson[1].jumlah);
  if (resCek[0] !== 200) return res.status(resCek[0]).send({
    "status": "error",
    "pesan": resCek[1],
    "data": []
  });
  // End Validasi Berat Dan Jumlah

  // Validasi Berdasar No JO dan Staff
  var sqlQuery = `SELECT no_job_order FROM tt_wax_buat_lilin_detail_cart WHERE no_job_order = '${dataJson[1].no_job_order}'
                AND kode_staff = '${dataJson[1].kode_staff}' LIMIT 1`;
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

  if (Object.keys(ResultSelect[1]).length !== 0) {
    await dbToko.RollBackTransaction(strIdCluster[1]);
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(400).send({
      "status": "error",
      "pesan": `No JO : ${dataJson[1].no_job_order} untuk staff : ${dataJson[1].kode_staff} sudah ada dalam daftar !`,
      "data": [{}]
    });
  }
  // End Validasi Berdasar No JO dan Staff

  // Simpan Ke Cart Lilin
  var sqlQuery = `SELECT no_job_order,no_po_marketing,kode_barang,ukuran,kode_jenis_bahan FROM tt_po_job_order
                WHERE no_job_order = '${dataJson[1].no_job_order}' AND status_job = 'DONE'`;
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

  sqlQuery = `INSERT INTO tt_wax_buat_lilin_detail_cart (kode_staff,no_job_order,no_po_marketing,kode_barang,ukuran,kode_jenis_bahan,stock_lilin,berat_lilin,status_ws) VALUES 
      ('${dataJson[1].kode_staff}','${dataJson[1].no_job_order}','${ResultSelect[1][0].no_po_marketing}','${ResultSelect[1][0].kode_barang}','${ResultSelect[1][0].ukuran}'
      ,'${ResultSelect[1][0].kode_jenis_bahan}','${dataJson[1].jumlah}','${dataJson[1].berat}'
      ,'${dataJson[1].status_ws}')`;

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
  // End Simpan Ke Cart Lilin

  await dbToko.CommitTransaction(strIdCluster[1]);
  dbToko.closeConnection(strIdCluster[1]);
  return res.send({
    "status": "berhasil",
    "pesan": `Tambah lilin berhasil disimpan.`,
    "data": [{}]
  });
})

// ===============================================================================Get Cart Lilin
router.get('/cart-lilin/:kode_staff', async (req, res) => {
  const strIdCluster = GenIdCluster("MDN", "CS01");
  if (strIdCluster[0] !== 200) return res.status(strIdCluster[0]).send(strIdCluster[1]);

  let resConn = await dbToko.createConnToko("MDN", strIdCluster[1])
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err] });
  if (resConn[0] === 500) return res.status(resConn[0]).send(resConn[1]);

  try {
    var dataParams = trimUcaseJSON(req.params, []);

    var sqlQuery = `SELECT no_job_order,no_po_marketing,kode_barang,ukuran,kode_jenis_bahan,stock_lilin,berat_lilin,status_lilin,status_ws,kode_staff
                   FROM tt_wax_buat_lilin_detail_cart WHERE kode_staff = '${dataParams[1].kode_staff}'`;

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
        "pesan": "Data tidak ditemukan !",
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

// ===============================================================================Get Delete Chart Lilin
router.get('/cart-lilin-del/:kode_staff', async (req, res) => {
  const strIdCluster = GenIdCluster("MDN", "CS01");
  if (strIdCluster[0] !== 200) return res.status(strIdCluster[0]).send(strIdCluster[1]);

  let resConn = await dbToko.createConnToko("MDN", strIdCluster[1])
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err] });
  if (resConn[0] === 500) return res.status(resConn[0]).send(resConn[1]);

  try {
    var dataParams = trimUcaseJSON(req.params, []);
    var sqlQuery = `DELETE FROM tt_wax_buat_lilin_detail_cart WHERE kode_staff = '${dataParams[1].kode_staff}'`;

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
        "status": "gagal",
        "pesan": "Data tidak ditemukan !",
        "data": resultSelect[1]
      });
    } else {
      return res.send({
        "status": "berhasil",
        "pesan": "Batal Pembuatan Lilin Berhasil",
        "data": resultSelect[1]
      });
    }

  } catch (error) {
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500, error.message);
  }
})


// ===============================================================================Simpan Pembuatan Lilin
router.post('/create-lilin/:kode_staff', async (req, res) => {
  let i = 0;
  var dataParams = trimUcaseJSON(req.params, []);

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

  // Validasi Staff
  var sqlQuery = `SELECT kode_staff FROM tm_staff WHERE kode_staff = '${dataParams[1].kode_staff}' LIMIT 1`;
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
      "pesan": `Staff : ${dataParams[1].kode_staff} tidak ditemukan !`,
      "data": [{}]
    });
  }
  // End Validasi Staff

  // Simpan Pembuatan Lilin
  var sqlQuery = `SELECT * FROM tt_wax_buat_lilin_detail_cart WHERE kode_staff = '${dataParams[1].kode_staff}'`;
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
      "pesan": `Data lilin untuk staff : ${dataParams[1].kode_staff} tidak ditemukan !`,
      "data": [{}]
    });
  }

  // No Transaksi
  const resGenKode = await GenNoTrxCreateLilin(strIdCluster[1]);
  if (resGenKode[0] !== 200) return resGenKode;
  const noTrx = resGenKode[1];

  let tmpTgl = moment(DateNow()).format('YYYY-MM-DD');
  let tmpTglJam = DateNow();

  // Generate a v4 (random) id
  uuid.v4(); // -> '110ec58a-a0f2-4ac4-8393-c866d813b8d1'
  var id = uuid.v4();

  var tmpData = ResultSelect[1];

  // End No Transaksi
  for (i in tmpData) {
    sqlQuery = `INSERT INTO tt_wax_buat_lilin_detail (no_transaksi,no_buat_lilin,no_job_order,no_po_marketing,kode_barang,ukuran,kode_jenis_bahan
              ,stock_lilin,berat_lilin,status_ws,kode_staff,tanggal) VALUES 
              ('${id}','${noTrx}','${tmpData[i].no_job_order}','${tmpData[i].no_po_marketing}','${tmpData[i].kode_barang}'
              ,'${tmpData[i].ukuran}','${tmpData[i].kode_jenis_bahan}','${tmpData[i].stock_lilin}'
              ,'${tmpData[i].berat_lilin}','${tmpData[i].status_ws}','${tmpData[i].kode_staff}','${tmpTgl}')`;

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
  }
  // End Simpan Pembuatan Lilin

  // Simpan Head
  sqlQuery = `INSERT INTO tt_wax_buat_lilin_head (no_transaksi,no_buat_lilin,tanggal,input_by,input_date) VALUES 
            ('${id}','${noTrx}','${tmpTgl}','-','${tmpTglJam}')`;
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
  // End Simpan Head

  // Hapus Cart Berdasar Staff
  var sqlQuery = `DELETE FROM tt_wax_buat_lilin_detail_cart WHERE kode_staff = '${dataParams[1].kode_staff}'`;
  var ResultSelect = await dbToko.DeleteQuery(strIdCluster[1], sqlQuery)
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
  // End Hapus Cart Berdasar Staff

  await dbToko.CommitTransaction(strIdCluster[1]);
  dbToko.closeConnection(strIdCluster[1]);
  return res.send({
    "status": "berhasil",
    "pesan": `Pembuatan lilin berhasil disimpan.`,
    "data": [{}]
  });
})

// ===============================================================================Laporan Pembuatan Lilin
router.post('/create/all', async (req, res) => {
  let sqlQuery = "";

  const { error } = validateGetCreateLilin(req.body);
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

  sqlQuery = `SELECT * FROM tt_wax_buat_lilin_detail WHERE (tanggal BETWEEN '${dataJson[1].tgl_awal}' AND '${dataJson[1].tgl_akhir}')`;
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

// ===============================================================================Get JO (Pembuatan Pohon Lilin)
router.get('/tree/no_job_order/:no_job_order', async (req, res) => {
  const strIdCluster = GenIdCluster("MDN", "CS01");
  if (strIdCluster[0] !== 200) return res.status(strIdCluster[0]).send(strIdCluster[1]);

  let resConn = await dbToko.createConnToko("MDN", strIdCluster[1])
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err] });
  if (resConn[0] === 500) return res.status(resConn[0]).send(resConn[1]);

  try {
    var dataParams = trimUcaseJSON(req.params, []);
    
    var sqlQueryCek = `SELECT no_job_order FROM tt_wax_buat_pohon_detail_cart WHERE no_job_order='${dataParams[1].no_job_order}'`;

    const resultSelecCek = await dbToko.SelectQuery(strIdCluster[1], sqlQueryCek)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err] });
    if (resultSelecCek[0] === 500) {
      dbToko.closeConnection(strIdCluster[1]);
      return res.status(500).send({
        "status": "error",
        "pesan": resultSelecCek[1],
        "data": [{}]
      });
    }
    
    if (resultSelecCek[1].length == 0) {
      
    } else {
      return res.send({
        "status": "gagal",
        "pesan": "Jo Sudah Masuk!",
        "data": resultSelecCek[1]
      });
    }

    var sqlQuery = `SELECT a.no_job_order,a.kode_barang,b.nama_barang,a.kode_jenis_bahan,a.stock_lilin,a.berat_lilin,berat_lilin_ganti
                  ,berat_lilin_pohon,stock_lilin_pohon FROM tt_wax_buat_lilin_detail a INNER JOIN tm_barang_master b
                    ON a.kode_barang = b.kode_barang WHERE a.no_job_order = '${dataParams[1].no_job_order}'`;

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
        "pesan": "No Jo tidak ditemukan !",
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

// ===============================================================================Simpan Ke Cart Pohon Lilin
router.post('/cart-tree', async (req, res) => {
  const { error } = validateCartTree(req.body);
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

  // Validasi Staff
  var sqlQuery = `SELECT kode_staff FROM tm_staff WHERE kode_staff = '${dataJson[1].kode_staff}' LIMIT 1`;
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
      "pesan": `Staff : ${dataJson[1].kode_staff} tidak ditemukan !`,
      "data": [{}]
    });
  }
  // End Validasi Staff

  // Validasi No JO
  var sqlQuery = `SELECT no_job_order FROM tt_wax_buat_lilin_detail WHERE no_job_order = '${dataJson[1].no_job_order}'`;
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
      "pesan": `No JO : ${dataJson[1].no_job_order} tidak ditemukan !`,
      "data": [{}]
    });
  }
  // End Validasi No JO

  // Validasi Berat Dan Jumlah
  resCek = cekNumber("berat_lilin", dataJson[1].berat_lilin);
  if (resCek[0] !== 200) return res.status(resCek[0]).send({
    "status": "error",
    "pesan": resCek[1],
    "data": []
  });

  resCek = cekNumber("jumlah_lilin", dataJson[1].jumlah_lilin);
  if (resCek[0] !== 200) return res.status(resCek[0]).send({
    "status": "error",
    "pesan": resCek[1],
    "data": []
  });

  resCek = cekNumber("berat_batu", dataJson[1].berat_batu);
  if (resCek[0] !== 200) return res.status(resCek[0]).send({
    "status": "error",
    "pesan": resCek[1],
    "data": []
  });

  resCek = cekNumber("jumlah_batu", dataJson[1].jumlah_batu);
  if (resCek[0] !== 200) return res.status(resCek[0]).send({
    "status": "error",
    "pesan": resCek[1],
    "data": []
  });
  // End Validasi Berat Dan Jumlah

  // Validasi Berdasar No JO dan Staff
  var sqlQuery = `SELECT no_job_order FROM tt_wax_buat_pohon_detail_cart WHERE no_job_order = '${dataJson[1].no_job_order}'
                AND kode_staff = '${dataJson[1].kode_staff}' LIMIT 1`;
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

  if (Object.keys(ResultSelect[1]).length !== 0) {
    await dbToko.RollBackTransaction(strIdCluster[1]);
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(400).send({
      "status": "error",
      "pesan": `No JO : ${dataJson[1].no_job_order} untuk staff : ${dataJson[1].kode_staff} sudah ada dalam daftar !`,
      "data": [{}]
    });
  }
  // End Validasi Berdasar No JO dan Staff

  // Simpan Ke Cart Pohon Lilin
  var sqlQuery = `SELECT no_job_order,kode_barang FROM tt_wax_buat_lilin_detail
                WHERE no_job_order = '${dataJson[1].no_job_order}'`;
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

  sqlQuery = `INSERT INTO tt_wax_buat_pohon_detail_cart (kode_staff,no_job_order,kode_barang,stock_lilin,berat_lilin,stock_batu_pasang,berat_batu_pasang) VALUES 
      ('${dataJson[1].kode_staff}','${dataJson[1].no_job_order}','${ResultSelect[1][0].kode_barang}','${dataJson[1].jumlah_lilin}'
      ,'${dataJson[1].berat_lilin}','${dataJson[1].jumlah_batu}','${dataJson[1].berat_batu}')`;

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
  // End Simpan Ke Cart Pohon Lilin

  await dbToko.CommitTransaction(strIdCluster[1]);
  dbToko.closeConnection(strIdCluster[1]);
  return res.send({
    "status": "berhasil",
    "pesan": `Tambah pohon lilin berhasil disimpan.`,
    "data": [{}]
  });
})


// ===============================================================================Get Delete Chart Lilin
router.get('/cart-pohon-del/:kode_staff', async (req, res) => {
  const strIdCluster = GenIdCluster("MDN", "CS01");
  if (strIdCluster[0] !== 200) return res.status(strIdCluster[0]).send(strIdCluster[1]);

  let resConn = await dbToko.createConnToko("MDN", strIdCluster[1])
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err] });
  if (resConn[0] === 500) return res.status(resConn[0]).send(resConn[1]);

  try {
    var dataParams = trimUcaseJSON(req.params, []);
    var sqlQuery = `DELETE FROM tt_wax_buat_pohon_detail_cart WHERE kode_staff = '${dataParams[1].kode_staff}'`;

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
        "status": "gagal",
        "pesan": "Data tidak ditemukan !",
        "data": resultSelect[1]
      });
    } else {
      return res.send({
        "status": "berhasil",
        "pesan": "Batal Pembuatan Pohon Lilin Berhasil",
        "data": resultSelect[1]
      });
    }

  } catch (error) {
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500, error.message);
  }
})

// ===============================================================================Get Cart Pohon Lilin
router.get('/cart-tree/:kode_staff', async (req, res) => {
  const strIdCluster = GenIdCluster("MDN", "CS01");
  if (strIdCluster[0] !== 200) return res.status(strIdCluster[0]).send(strIdCluster[1]);

  let resConn = await dbToko.createConnToko("MDN", strIdCluster[1])
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err] });
  if (resConn[0] === 500) return res.status(resConn[0]).send(resConn[1]);

  try {
    var dataParams = trimUcaseJSON(req.params, []);

    var sqlQuery = `SELECT * FROM tt_wax_buat_pohon_detail_cart WHERE kode_staff = '${dataParams[1].kode_staff}'`;

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
        "pesan": "Data tidak ditemukan !",
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

// ===============================================================================Simpan Pembuatan Pohon Lilin
router.post('/create-tree', async (req, res) => {
  let i = 0;
  const { error } = validateCOTree(req.body);
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

  // Validasi Staff
  var sqlQuery = `SELECT kode_staff FROM tm_staff WHERE kode_staff = '${dataJson[1].kode_staff}' LIMIT 1`;
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
      "pesan": `Staff : ${dataJson[1].kode_staff} tidak ditemukan !`,
      "data": [{}]
    });
  }
  // End Validasi Staff

  // Validasi Berat Batang
  resCek = cekNumber("berat_batang", dataJson[1].berat_batang);
  if (resCek[0] !== 200) return res.status(resCek[0]).send({
    "status": "error",
    "pesan": resCek[1],
    "data": []
  });
  // End Validasi Berat Batang

  // Simpan Pembuatan Pohon Lilin
  var sqlQuery = `SELECT * FROM tt_wax_buat_pohon_detail_cart WHERE kode_staff = '${dataJson[1].kode_staff}'`;
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
      "pesan": `Data pohon lilin untuk staff : ${dataJson[1].kode_staff} tidak ditemukan !`,
      "data": [{}]
    });
  }

  // No Transaksi
  const resGenKode = await GenNoTrxCreateTree(strIdCluster[1]);
  if (resGenKode[0] !== 200) return resGenKode;
  const noTrx = resGenKode[1];

  let tmpTgl = moment(DateNow()).format('YYYY-MM-DD');
  let tmpTglJam = DateNow();

  // Generate a v4 (random) id
  uuid.v4(); // -> '110ec58a-a0f2-4ac4-8393-c866d813b8d1'
  var id = uuid.v4();

  var tmpData = ResultSelect[1];

  // End No Transaksi
  for (i in tmpData) {
    sqlQuery = `INSERT INTO tt_wax_buat_pohon_detail (no_transaksi,no_buat_pohon,no_job_order,kode_barang,stock_lilin,berat_lilin
    ,stock_batu_pasang,berat_batu_pasang,berat_batang,kode_staff,tanggal) VALUES 
    ('${id}','${noTrx}','${tmpData[i].no_job_order}','${tmpData[i].kode_barang}','${tmpData[i].stock_lilin}','${tmpData[i].berat_lilin}'
    ,'${tmpData[i].stock_batu_pasang}','${tmpData[i].berat_batu_pasang}','${dataJson[1].berat_batang}','${tmpData[i].kode_staff}','${tmpTgl}')`;

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
  }
  // End Simpan Pembuatan Pohon Lilin

  // Simpan Head
  sqlQuery = `INSERT INTO tt_wax_buat_pohon_head (no_transaksi,no_buat_pohon,tanggal,input_by,input_date) VALUES 
            ('${id}','${noTrx}','${tmpTgl}','-','${tmpTglJam}')`;
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
  // End Simpan Head

  // Hapus Cart Berdasar Staff
  var sqlQuery = `DELETE FROM tt_wax_buat_pohon_detail_cart WHERE kode_staff = '${dataJson[1].kode_staff}'`;
  var ResultSelect = await dbToko.DeleteQuery(strIdCluster[1], sqlQuery)
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
  // End Hapus Cart Berdasar Staff

  await dbToko.CommitTransaction(strIdCluster[1]);
  dbToko.closeConnection(strIdCluster[1]);
  return res.send({
    "status": "berhasil",
    "pesan": `Pembuatan pohon lilin berhasil disimpan.`,
    "data": [{}]
  });
})

// ===============================================================================Laporan Pembuatan Pohon Lilin
router.post('/tree/all', async (req, res) => {
  let sqlQuery = "";

  const { error } = validateGetCreateLilin(req.body);
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

  sqlQuery = `SELECT * FROM tt_wax_buat_pohon_detail WHERE (tanggal BETWEEN '${dataJson[1].tgl_awal}' AND '${dataJson[1].tgl_akhir}')`;
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
function validateCartLilin(bahan) {
  const schema = Joi.object({
    kode_staff: Joi.string().min(1).max(30).required(),
    no_job_order: Joi.string().min(1).max(50).required(),
    jumlah: Joi.number().required(),
    berat: Joi.number().required(),
    status_ws: Joi.string().min(1).max(20).required()
  });
  return schema.validate(bahan);
}

function validateGetCreateLilin(bahan) {
  const schema = Joi.object({
    tgl_awal: Joi.date().required(),
    tgl_akhir: Joi.date().required()
  });
  return schema.validate(bahan);
}

function validateCartTree(bahan) {
  const schema = Joi.object({
    kode_staff: Joi.string().min(1).max(30).required(),
    size_tabung: Joi.string().min(1).max(30).required(),
    no_job_order: Joi.string().min(1).max(50).required(),
    jumlah_lilin: Joi.number().required(),
    berat_lilin: Joi.number().required(),
    jumlah_batu: Joi.number().required(),
    berat_batu: Joi.number().required()
  });
  return schema.validate(bahan);
}

function validateCOTree(bahan) {
  // Check Out
  const schema = Joi.object({
    kode_staff: Joi.string().min(1).max(30).required(),
    berat_batang: Joi.number().required()
  });
  return schema.validate(bahan);
}
module.exports = router;