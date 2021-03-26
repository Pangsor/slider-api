const express = require(`express`);
const router = express.Router();
const dbToko = require('../../middleware/sql-function')
const {nsiAuth} = require('../../middleware/auth');
const {GenIdCluster} = require('../../middleware/generator');
const Joi = require('@hapi/joi');
const {DateNow} = require('../../middleware/datetime');
const {trimUcaseJSON,cekNumber} = require('../../middleware/function');
const { dbServer } = require('../../middleware/connections');

// ===============================================================================Get All
router.get('/all', async(req, res) => {
  const strIdCluster = GenIdCluster("MDN", "CS01");
  if (strIdCluster[0] !== 200) return res.status(strIdCluster[0]).send(strIdCluster[1]);

  let resConn = await dbToko.createConnToko("MDN", strIdCluster[1])
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resConn[0] === 500) return res.status(resConn[0]).send(resConn[1]);

  try{
    const sqlQuery = `SELECT a.kode_barang,a.nama_barang,a.kode_jenis,c.nama_jenis,a.kode_design,d.nama_design,a.urutan_kerja,a.lokasi_gambar
                      ,b.ukuran,b.brt_original FROM tm_barang_master a INNER JOIN tm_barang_master_detail b
                      ON a.kode_barang = b.kode_barang INNER JOIN tm_jenis c ON a.kode_jenis = c.kode_jenis
                      INNER JOIN tm_design d ON a.kode_design = d.kode_design `;
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
        "pesan":"Data barang tidak ditemukan",
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

// ===============================================================================Get Detail By Kode Barang
router.get('/1/kode_barang/:kode_barang', async(req, res) => {
  var dataParams= trimUcaseJSON(req.params,[])
  
  const strIdCluster = GenIdCluster("MDN", "CS01");
  if (strIdCluster[0] !== 200) return res.status(strIdCluster[0]).send(strIdCluster[1]);

  let resConn = await dbToko.createConnToko("MDN", strIdCluster[1])
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resConn[0] === 500) return res.status(resConn[0]).send(resConn[1]);

  try{
    const sqlQuery = `SELECT kode_barang,nama_barang,kode_jenis,kode_design,urutan_kerja,lokasi_gambar FROM tm_barang_master WHERE kode_barang = '${dataParams[1].kode_barang}'`;
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
        "pesan":"Data barang tidak ditemukan",
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

// ===============================================================================Get Detail Batu By Kode Barang
router.get('/1/kode_batu/:kode_barang', async(req, res) => {
  var dataParams= trimUcaseJSON(req.params,[])
  
  const strIdCluster = GenIdCluster("MDN", "CS01");
  if (strIdCluster[0] !== 200) return res.status(strIdCluster[0]).send(strIdCluster[1]);

  let resConn = await dbToko.createConnToko("MDN", strIdCluster[1])
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resConn[0] === 500) return res.status(resConn[0]).send(resConn[1]);

  try{
    const sqlQuery = `SELECT kode_barang,ukuran,kode_batu,stock_batu,berat_batu,tot_berat_batu,divisi FROM tm_barang_batu WHERE kode_barang = '${dataParams[1].kode_barang}'`;
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
        "pesan":"Data barang tidak ditemukan",
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
  let tmpTgl = DateNow();
  let tmpDetailBatu = "";

  const {error} = validateBarangAdd(req.body);
  if (error) return res.status(400).send({
    "status":"error",
    "pesan":error.details[0].message,
    "data":[{}]
  });

  const strIdCluster = GenIdCluster("MDN", "CS01");
  if (strIdCluster[0] !== 200) return res.status(strIdCluster[0]).send(strIdCluster[1]);

  let resConn = await dbToko.createConnToko("MDN", strIdCluster[1])
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resConn[0] === 500) return res.status(resConn[0]).send(resConn[1]);

  var dataJson = trimUcaseJSON(req.body,["lokasi_gambar"]);
  tmpDetailBatu = dataJson[1].detail_batu;

  // Validasi Number
  resCek = cekNumber("berat_barang", req.body.berat_barang);
  if(resCek[0] !== 200) return res.status(resCek[0]).send({
      "status":"error",
      "pesan":resCek[1],
      "data":[]
  });

  resCek = cekNumber("total_berat_batu", req.body.total_berat_batu);
  if(resCek[0] !== 200) return res.status(resCek[0]).send({
      "status":"error",
      "pesan":resCek[1],
      "data":[]
  });

  for (let i in tmpDetailBatu){
    resCek = cekNumber("berat_batu", tmpDetailBatu[i].berat_batu);
    if(resCek[0] !== 200) return res.status(resCek[0]).send({
        "status":"error",
        "pesan":resCek[1],
        "data":[]
    });

    resCek = cekNumber("stock_batu", tmpDetailBatu[i].stock_batu);
    if(resCek[0] !== 200) return res.status(resCek[0]).send({
        "status":"error",
        "pesan":resCek[1],
        "data":[]
    });

    resCek = cekNumber("tot_berat_batu", tmpDetailBatu[i].tot_berat_batu);
    if(resCek[0] !== 200) return res.status(resCek[0]).send({
        "status":"error",
        "pesan":resCek[1],
        "data":[]
    });
  }
  // End Validasi Number

  // Validasi Jenis
  var sqlQuery = `SELECT kode_jenis FROM tm_jenis WHERE kode_jenis = '${dataJson[1].kode_jenis}' LIMIT 1`;
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
      return res.status(400).send({
      "status":"error",
      "pesan":`Kode jenis : ${dataJson[1].kode_jenis} tidak ditemukan !`,
      "data":[{}]
      });
  }
  // End Validasi Jenis

  // Validasi Design
  var sqlQuery = `SELECT kode_design FROM tm_design WHERE kode_design = '${dataJson[1].kode_design}' LIMIT 1`;
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
      return res.status(400).send({
      "status":"error",
      "pesan":`Kode design : ${dataJson[1].kode_design} tidak ditemukan !`,
      "data":[{}]
      });
  }
  // End Validasi Design

  // Cek Ukuran
  var sqlQuery = `SELECT kode_barang FROM tm_barang_master_detail WHERE kode_barang = '${dataJson[1].kode_barang}' AND ukuran = '${dataJson[1].ukuran}' LIMIT 1`;
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
        "pesan":`Ukuran : ${dataJson[1].ukuran} sudah ada !`,
        "data":[{}]
      });
    }
  // End Cek Ukuran

  // Simpan Master Barang
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
    sqlQuery = `INSERT INTO tm_barang_master (kode_barang,nama_barang,kode_jenis,kode_design,urutan_kerja,lokasi_gambar,berat_barang,total_berat_batu,input_by,input_date) VALUES
                ('${dataJson[1].kode_barang}','${dataJson[1].nama_barang}','${dataJson[1].kode_jenis}','${dataJson[1].kode_design}','${dataJson[1].urutan_kerja}'
                ,'${dataJson[1].lokasi_gambar}','${dataJson[1].berat_barang}','${dataJson[1].total_berat_batu}','-','${tmpTgl}')`;
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
  }
  // End Simpan Master Barang

  // Simpan Master Detail
  var sqlQuery = `SELECT kode_barang FROM tm_barang_master_detail WHERE kode_barang = '${dataJson[1].kode_barang}' AND ukuran = '${dataJson[1].ukuran}' LIMIT 1`;
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

  if (Object.keys(ResultSelect[1]).length === 0){
    sqlQuery = `INSERT INTO tm_barang_master_detail (kode_barang,ukuran,brt_original) VALUES
      ('${dataJson[1].kode_barang}','${dataJson[1].ukuran}','${dataJson[1].berat_barang}')`;
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
  }
  // Simpan Master Detail

  // Simpan Master Batu
  for (let i in tmpDetailBatu){
    var sqlQuery = `SELECT kode_barang FROM tm_barang_batu WHERE kode_barang = '${dataJson[1].kode_barang}' AND ukuran = '${dataJson[1].ukuran}'
                   AND kode_batu = '${tmpDetailBatu[i].kode_batu}' LIMIT 1`;
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
      sqlQuery = `INSERT INTO tm_barang_batu (kode_barang,ukuran,kode_batu,stock_batu,berat_batu,tot_berat_batu,ukuran_batu,divisi,input_by,input_date) VALUES
                ('${dataJson[1].kode_barang}','${dataJson[1].ukuran}','${tmpDetailBatu[i].kode_batu}','${tmpDetailBatu[i].stock_batu}'
                ,'${tmpDetailBatu[i].berat_batu}','${tmpDetailBatu[i].tot_berat_batu}','${tmpDetailBatu[i].ukuran_batu}'
                ,'${tmpDetailBatu[i].divisi}','-','${tmpTgl}')`;
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
      dbToko.closeConnection(strIdCluster[1]);
      return res.status(500).send({
        "status":"error",
        "pesan":`Kode Batu : ${tmpDetailBatu[i].kode_batu} sudah ada!`,
        "data":[{}]
      });
    }
  }  
  // End Simpan Master Batu

  dbToko.closeConnection(strIdCluster[1]);
  return res.send({
    "status":"berhasil",
    "pesan":"Data master original berhasil disimpan.",
    "data":[{}]
  });
})

// ===============================================================================Edit
router.put('/', async(req, res) => {
  const {error} = validateBatuEdit(req.body);
  if (error) return res.status(400).send({
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
  resCek = cekNumber("berat_batu", req.body.berat_batu);
  if(resCek[0] !== 200) return res.status(resCek[0]).send({
      "status":"error",
      "pesan":resCek[1],
      "data":[]
  });

    // Cek Jenis Batu
    var sqlQuery = `SELECT kode_jenis_batu FROM tm_jenis_batu WHERE kode_jenis_batu = '${dataJson[1].kode_jenis_batu}' LIMIT 1`;
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
        return res.status(400).send({
        "status":"error",
        "pesan":`Kode jenis batu : ${dataJson[1].kode_jenis_batu} tidak ditemukan !`,
        "data":[{}]
        });
    }
    // End Cek Jenis Batu

    // Cek Cutting Batu
    var sqlQuery = `SELECT kode_cutting_batu FROM tm_cutting_batu WHERE kode_cutting_batu = '${dataJson[1].kode_cutting_batu}' LIMIT 1`;
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
        return res.status(400).send({
        "status":"error",
        "pesan":`Kode cutting batu : ${dataJson[1].kode_cutting_batu} tidak ditemukan !`,
        "data":[{}]
        });
    }
    // End Cek Cutting Batu
    
  // Cek Kode
  var sqlQuery = `SELECT kode_batu FROM tm_barang_master WHERE kode_batu = '${dataJson[1].kode_batu}' LIMIT 1`;
  var ResultSelect = await dbToko.SelectQuery(strIdCluster[1], sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (ResultSelect[0] === 500) {
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send("Internal Server Error !");
  }

  if (Object.keys(ResultSelect[1]).length === 0) {
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(400).send({
      "status":"error",
      "pesan":`Kode batu : ${dataJson[1].kode_batu} tidak di temukan !`,
      "data":[{}]
    });
  }
  // End Cek Kode

  sqlQuery = `UPDATE tm_barang_master SET ukuran = '${dataJson[1].ukuran}',nama_batu = '${dataJson[1].nama_batu}'
            ,kode_jenis_batu = '${dataJson[1].kode_jenis_batu}',kode_cutting_batu = '${dataJson[1].kode_cutting_batu}',berat_batu = '${dataJson[1].berat_batu}'
             WHERE kode_batu = '${dataJson[1].kode_batu}'`
  ResultSelect = await dbToko.UpdateQuery(strIdCluster[1], sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (ResultSelect[0] === 500) {
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send("Internal Server Error !");
  }

  dbToko.closeConnection(strIdCluster[1]);
  return res.send({
    "status":"berhasil",
    "pesan":"Data batu berhasil diedit.",
    "data":[{}]
  });
})

// ===============================================================================Delete
router.delete('/', async(req, res) => {
  const {error} = validateBarangDelete(req.body);
  if (error) return res.status(400).send({
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
  var sqlQuery = `SELECT kode_barang FROM tm_barang_master_detail WHERE kode_barang = '${dataJson[1].kode_barang}' AND ukuran = '${dataJson[1].ukuran}' LIMIT 1`;
  var ResultSelect = await dbToko.SelectQuery(strIdCluster[1], sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (ResultSelect[0] === 500) {
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send("Internal Server Error !");
  }

  if (Object.keys(ResultSelect[1]).length === 0) {
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(400).send({
      "status":"error",
      "pesan":`Kode barang : ${dataJson[1].kode_barang}, ukuran : ${dataJson[1].ukuran} tidak di temukan !`,
      "data":[{}]
    });
  }
  // End Cek Kode

  // Hapus Barang Detail
  sqlQuery = `DELETE FROM tm_barang_master_detail WHERE kode_barang = '${dataJson[1].kode_barang}' AND ukuran = '${dataJson[1].ukuran}'`
  ResultSelect = await dbToko.DeleteQuery(strIdCluster[1], sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (ResultSelect[0] === 500) {
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send("Internal Server Error !");
  }
  // End Hapus Barang Detail

  // Hapus Barang Batu
  sqlQuery = `DELETE FROM tm_barang_batu WHERE kode_barang = '${dataJson[1].kode_barang}' AND ukuran = '${dataJson[1].ukuran}'`
  ResultSelect = await dbToko.DeleteQuery(strIdCluster[1], sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (ResultSelect[0] === 500) {
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send("Internal Server Error !");
  }
  // End Hapus Barang Batu

  // Hapus Barang
  var sqlQuery = `SELECT kode_barang FROM tm_barang_master_detail WHERE kode_barang = '${dataJson[1].kode_barang}'`;
  var ResultSelect = await dbToko.SelectQuery(strIdCluster[1], sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (ResultSelect[0] === 500) {
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send("Internal Server Error !");
  }

  if (Object.keys(ResultSelect[1]).length === 0) {
    sqlQuery = `DELETE FROM tm_barang_master WHERE kode_barang = '${dataJson[1].kode_barang}' LIMIT 1`
    ResultSelect = await dbToko.DeleteQuery(strIdCluster[1], sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if (ResultSelect[0] === 500) {
      dbToko.closeConnection(strIdCluster[1]);
      return res.status(500).send("Internal Server Error !");
    }
  }
  // End Hapus Barang

  dbToko.closeConnection(strIdCluster[1]);
  return res.send({
    "status":"berhasil",
    "pesan":"Data master original berhasil dihapus2",
    "data":[{}]
  });
})

// ===============================================================================Validasi
function validateBarangAdd(bahan){
  const batu = Joi.object({
    kode_batu: Joi.string().min(1).max(30).required(),
    berat_batu: Joi.number().required(),
    stock_batu: Joi.number().required(),
    tot_berat_batu: Joi.number().required(),
    ukuran_batu: Joi.string().min(1).max(30).required(),
    divisi: Joi.string().min(1).max(50).required()
  }).required();

  const schema = Joi.object({
    kode_barang: Joi.string().min(1).max(30).required(),
    nama_barang: Joi.string().min(1).max(100).required(),
    kode_jenis: Joi.string().min(1).max(30).required(),
    kode_design: Joi.string().min(1).max(30).required(),
    urutan_kerja: Joi.string().min(1).max(255).required(),
    lokasi_gambar: Joi.string().min(1).max(255).required(),
    berat_barang: Joi.number().required(),
    total_berat_batu: Joi.number().required(),
    ukuran: Joi.string().min(1).max(100).required(),
    detail_batu: Joi.array().items(batu).required()
  });
  return schema.validate(bahan);
}

function validateBatuEdit(bahan){
  const schema = Joi.object({
    kode_barang: Joi.string().min(1).max(30).required(),
    nama_barang: Joi.string().min(1).max(100).required(),
    kode_jenis: Joi.string().min(1).max(30).required(),
    kode_design: Joi.string().min(1).max(30).required(),
    urutan_kerja: Joi.string().min(1).max(255).required(),
    lokasi_gambar: Joi.string().min(1).max(255).required(),
    berat_barang: Joi.number().required(),
    tot_berat_batu: Joi.number().required()
  });
  return schema.validate(bahan);
}

function validateBarangDelete(bahan){
  const schema = Joi.object({
    kode_barang: Joi.string().min(1).max(30).required(),
    ukuran: Joi.string().min(1).max(100).required()
  });
  return schema.validate(bahan);
}

module.exports = router;