const express = require(`express`);
const router = express.Router();
const dbToko = require('../../middleware/sql-function')
const { nsiAuth } = require('../../middleware/auth');
const { GenIdCluster, GenAdmKirimTambahan } = require('../../middleware/generator');
const Joi = require('@hapi/joi');
const { DateNow } = require('../../middleware/datetime');
const { trimUcaseJSON, cekNumber, insertCardAdmin, saldoAdminKredit } = require('../../middleware/function');
const { dbServer } = require('../../middleware/connections');
const moment = require('moment');
const uuid = require('uuid');

// ===============================================================================Get Detail

// ===============================================================================Laporan
router.post('/no_job_order', async (req, res) => {
  const { error } = validateJo(req.body);
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

  var sqlQuery = `SELECT a.no_job_order,a.kode_barang,b.nama_barang,a.kode_jenis_bahan FROM tt_po_job_order a INNER JOIN tm_barang_master b
  ON a.kode_barang = b.kode_barang WHERE a.no_job_order = '${dataJson[1].no_job_order}' AND a.asal_divisi='${dataJson[1].nama_divisi}' AND a.tujuan_divisi='${dataJson[1].nama_divisi}' AND a.status_job='PROSES'`;
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

router.get('/no_job_order/:no_job_order', async (req, res) => {
  const strIdCluster = GenIdCluster("MDN", "CS01");
  if (strIdCluster[0] !== 200) return res.status(strIdCluster[0]).send(strIdCluster[1]);

  let resConn = await dbToko.createConnToko("MDN", strIdCluster[1])
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err] });
  if (resConn[0] === 500) return res.status(resConn[0]).send(resConn[1]);

  try {
    var dataParams = trimUcaseJSON(req.params, []);
    var sqlQuery = `SELECT a.no_job_order,a.kode_barang,b.nama_barang,a.kode_jenis_bahan FROM tt_po_job_order a INNER JOIN tm_barang_master b
                    ON a.kode_barang = b.kode_barang WHERE a.no_job_order = '${dataParams[1].no_job_order}' AND a.status_job='PROSES'`;
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
        "pesan": "No job order tidak ditemukan !",
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

// ===============================================================================Simpan Ke Cart
router.post('/cart', async (req, res) => {
  let tmpKdJnsBahan = "";

  const { error } = validateCart(req.body);
  if (error) return res.status(500).send({
    "status": "error",
    "pesan": error.details[0].message,
    "data": [{}]
  });
  var dataJson = trimUcaseJSON(req.body, []);

  resCek = cekNumber("jumlah", dataJson[1].jumlah);
  if (resCek[0] !== 200) return res.status(resCek[0]).send({
    "status": "error",
    "pesan": resCek[1],
    "data": []
  });
  resCek = cekNumber("berat", dataJson[1].berat);
  if (resCek[0] !== 200) return res.status(resCek[0]).send({
    "status": "error",
    "pesan": resCek[1],
    "data": []
  });

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
  var sqlQuery = `SELECT kode_divisi,nama_divisi FROM tm_divisi WHERE nama_divisi = '${dataJson[1].divisi}'`;
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
      "pesan": `Divisi : ${dataJson[1].divisi} tidak ditemukan !`,
      "data": [{}]
    });
  }
  // End Validasi Divisi
  
  // Validasi No JO
  var sqlQuery = `SELECT no_job_order,kode_jenis_bahan FROM tt_po_job_order WHERE no_job_order = '${dataJson[1].no_job_order}'
                 AND kode_barang = '${dataJson[1].kode_barang}' AND status_job = 'PROSES'`;
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

  // Validasi Bahan
  var sqlQuery = `SELECT nama_bahan FROM tm_bahan WHERE nama_bahan = '${dataJson[1].nama_bahan}'`;
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
      "pesan": `Bahan : ${dataJson[1].nama_bahan} tidak ditemukan !`,
      "data": [{}]
    });
  }
  // End Validasi Bahan

  // Validasi Cart
  var sqlQuery = `SELECT no_job_order FROM tt_admin_kirim_tambahan_cart WHERE divisi = '${dataJson[1].divisi}'
                AND no_job_order = '${dataJson[1].no_job_order}' AND tambahan='${dataJson[1].nama_bahan}'`;
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
      // "pesan": `No job order : ${dataJson[1].no_job_order} sudah ada di daftar !`,
      "pesan": `Bahan: ${dataJson[1].nama_bahan} sudah Masuk !`,
      "data": [{}]
    });
  }
  // End Validasi Cart

  // Simpan Ke Cart
  sqlQuery = `INSERT INTO tt_admin_kirim_tambahan_cart (divisi,no_job_order,kode_barang,kode_jenis_bahan,tambahan,stock_out,berat_out) VALUES 
        ('${dataJson[1].divisi}','${dataJson[1].no_job_order}','${dataJson[1].kode_barang}','${tmpKdJnsBahan}','${dataJson[1].nama_bahan}'
        ,'${dataJson[1].jumlah}','${dataJson[1].berat}')`;
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
  // End Simpan Ke Cart

  await dbToko.CommitTransaction(strIdCluster[1]);
  dbToko.closeConnection(strIdCluster[1]);
  return res.send({
    "status": "berhasil",
    "pesan": `Tambah kirim tambahan berhasil disimpan.`,
    "data": [{}]
  });
})

// ===============================================================================Get Cart
router.get('/cart/:divisi', async (req, res) => {
  const strIdCluster = GenIdCluster("MDN", "CS01");
  if (strIdCluster[0] !== 200) return res.status(strIdCluster[0]).send(strIdCluster[1]);

  let resConn = await dbToko.createConnToko("MDN", strIdCluster[1])
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err] });
  if (resConn[0] === 500) return res.status(resConn[0]).send(resConn[1]);

  try {
    var dataParams = trimUcaseJSON(req.params, []);
    var sqlQuery = `SELECT a.divisi,a.no_job_order,a.kode_barang,b.nama_barang,a.kode_jenis_bahan,a.tambahan,a.stock_out,a.berat_out
                    FROM tt_admin_kirim_tambahan_cart a INNER JOIN tm_barang_master b
                    ON a.kode_barang = b.kode_barang WHERE a.divisi = '${dataParams[1].divisi}'`;
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
        "pesan": "No job order tidak ditemukan !",
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

// ===============================================================================Check Out
router.post('/check-out/:divisi', async (req, res) => {
  var i = 0;

  let tmpNoJO = "";
  let tmpKdBrg = "";
  let tmpKdJnsBahan = "";
  let tmpTambahan = "";
  let tmpStock = 0;
  let tmpBerat = 0;
  let tmpTotBeratBatu = 0;
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

  // Validasi Divisi
  var sqlQuery = `SELECT kode_divisi FROM tm_divisi WHERE nama_divisi = '${dataParams[1].divisi}'`;
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
      "pesan": `Divisi : ${dataParams[1].divisi} tidak ditemukan !`,
      "data": [{}]
    });
  }
  // End Validasi Divisi

  // Simpan
  var sqlQuery = `SELECT * FROM tt_admin_kirim_tambahan_cart WHERE divisi = '${dataParams[1].divisi}'`;
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
      "pesan": `Data untuk divisi : ${dataParams[1].divisi} tidak ditemukan !`,
      "data": [{}]
    });
  }

  // No Transaksi
  const resGenKode = await GenAdmKirimTambahan(strIdCluster[1]);
  if (resGenKode[0] !== 200) return resGenKode;
  const noTrx = resGenKode[1];

  // Generate a v4 (random) id
  uuid.v4(); // -> '110ec58a-a0f2-4ac4-8393-c866d813b8d1'
  var id = uuid.v4();

  let tmpTgl = moment(DateNow()).format('YYYY-MM-DD');
  let tmpTglJam = DateNow();

  for (i in ResultSelect[1]) {
    tmpNoJO = ResultSelect[1][i].no_job_order;
    tmpKdBrg = ResultSelect[1][i].kode_barang;
    tmpKdJnsBahan = ResultSelect[1][i].kode_jenis_bahan;
    tmpTambahan = ResultSelect[1][i].tambahan;
    tmpStock = ResultSelect[1][i].stock_out;
    tmpBerat = ResultSelect[1][i].berat_out;

    tmpTotBeratBatu += Number(tmpBerat);

    sqlQuery = `INSERT INTO tt_admin_kirim_tambahan (no_transaksi,no_kirim,tgl_kirim,no_job_order,kode_barang,kode_jenis_bahan,tambahan,stock_out,berat_out,divisi
              ,input_by,input_date) VALUES 
              ('${id}','${noTrx}','${tmpTgl}','${tmpNoJO}','${tmpKdBrg}','${tmpKdJnsBahan}','${tmpTambahan}','${tmpStock}','${tmpBerat}','${dataParams[1].divisi}'
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

  // Simpan Card
  const resCard = await insertCardAdmin(strIdCluster[1], id, tmpTgl, dataParams[1].divisi, "KIRIM TAMBAHAN PRODUKSI", "KIRIM TAMBAHAN PRODUKSI", tmpNoJO, tmpKdJnsBahan, tmpTotBeratBatu, "-", "OUT");
  if (resCard[0] !== 200) {
    await dbToko.RollBackTransaction(strIdCluster[1]);
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send("Internal Server Error !");
  }
  // End Simpan Card

  // Update Saldo
  const resSaldo = await saldoAdminKredit(strIdCluster[1], tmpTgl, dataParams[1].divisi, tmpKdJnsBahan, tmpTotBeratBatu, "-", "berat_kirim_tambahan_produksi");
  if (resSaldo[0] !== 200) {
    await dbToko.RollBackTransaction(strIdCluster[1]);
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send("Internal Server Error !");
  }
  // End Update Saldo

  // Simpan Head
  sqlQuery = `INSERT INTO tt_admin_kirim_tambahan_head (no_transaksi,no_kirim,tgl_kirim,input_by,input_date) VALUES ('${id}','${noTrx}','${tmpTgl}','-','${tmpTglJam}')`;
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
  // Simpan Head

  // Hapus Cart
  sqlQuery = `DELETE FROM tt_admin_kirim_tambahan_cart WHERE divisi = '${dataParams[1].divisi}'`;
  ResultInsert = await dbToko.DeleteQuery(strIdCluster[1], sqlQuery)
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
  // End Hapus Cart

  // End Simpan

  await dbToko.CommitTransaction(strIdCluster[1]);
  dbToko.closeConnection(strIdCluster[1]);
  return res.send({
    "status": "berhasil",
    "pesan": `Kirim tambahan berhasil disimpan.`,
    "data": [{}]
  });
})

// ===============================================================================Laporan
router.post('/tgl/all', async (req, res) => {
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

  sqlQuery = `SELECT * FROM tt_admin_kirim_tambahan WHERE (tgl_kirim BETWEEN '${dataJson[1].tgl_awal}' AND '${dataJson[1].tgl_akhir}')`;
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
function validateReport(bahan) {
  const schema = Joi.object({
    tgl_awal: Joi.date().required(),
    tgl_akhir: Joi.date().required()
  });
  return schema.validate(bahan);
}
function validateJo(bahan) {
  const schema = Joi.object({
    nama_divisi: Joi.string().min(1).max(30).required(),
    no_job_order: Joi.string().min(1).max(30).required()
  });
  return schema.validate(bahan);
}

function validateCart(bahan) {
  const schema = Joi.object({
    divisi: Joi.string().min(1).max(60).required(),
    no_job_order: Joi.string().min(1).max(30).required(),
    kode_barang: Joi.string().min(1).max(30).required(),
    nama_bahan: Joi.string().min(1).max(100).required(),
    jumlah: Joi.number().required(),
    berat: Joi.number().required()
  });
  return schema.validate(bahan);
}

module.exports = router;