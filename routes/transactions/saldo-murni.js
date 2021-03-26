const express = require(`express`);
const router = express.Router();
const dbToko = require('../../middleware/sql-function')
const {nsiAuth} = require('../../middleware/auth');
const {GenIdCluster, GenNoTrxAddSaldoMurni,GenNoTrxCreateSaldoBahan} = require('../../middleware/generator');
const Joi = require('@hapi/joi');
const {DateNow} = require('../../middleware/datetime');
const {trimUcaseJSON,cekNumber} = require('../../middleware/function');
const { dbServer } = require('../../middleware/connections');
const moment = require('moment');
const uuid = require('uuid');

// ===============================================================================Tambah Saldo Murni
router.post('/', async(req, res) => {
  let tmpDetail = "";
  let arrBahan = [];
  let statCari = false;
  let tmpBeratAk = 0;
  let tmpNamaBahan = "";
  let tmpNamaBahan2 = "";
  var i;

  const {error} = validateAdd(req.body);
  if (error) return res.status(500).send({
    "status":"error",
    "pesan":error.details[0].message,
    "data":[{}]
  });

  var dataJson = trimUcaseJSON(req.body,[]);
  tmpDetail = dataJson[1].data;

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
  for (i in tmpDetail){
    tmpNamaBahan = tmpDetail[i].kode_bahan;
    tmpNamaBahan2 = tmpNamaBahan.toUpperCase();

    var sqlQuery = `SELECT nama_bahan FROM tm_bahan WHERE nama_bahan = '${tmpNamaBahan2}' LIMIT 1`;
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
        "pesan":`Bahan : ${tmpNamaBahan2} tidak ditemukan !`,
        "data":[{}]
      });
    }

    resCek = cekNumber("berat", tmpDetail[i].berat);
    if(resCek[0] !== 200) return res.status(resCek[0]).send({
      "status":"error",
      "pesan":resCek[1],
      "data":[]
    });

    // Cek Duplicate
    statCari = arrBahan.includes(tmpNamaBahan2)
    if (statCari === false){
        arrBahan.push(tmpNamaBahan2)
    }else{
      return res.status(500).send({
        "status":"error",
        "pesan":`Bahan : ${tmpNamaBahan2} sudah ada dalam daftar !`,
        "data":[]
      });
    }
    // End Cek Duplicate

  }
  // End Validasi
  
  // No Transaksi
  const resGenKode = await GenNoTrxAddSaldoMurni(strIdCluster[1]);
  if  (resGenKode[0] !== 200) return resGenKode;
  const noTrx = resGenKode[1];
  // End No Transaksi

  let tmpTgl = DateNow();
  let tmpTglTrx = moment(DateNow()).format('YYYY-MM-DD');

  // Generate a v4 (random) id
  uuid.v4(); // -> '110ec58a-a0f2-4ac4-8393-c866d813b8d1'
  var id = uuid.v4();

  // Simpan
  for (i in tmpDetail){
    tmpNamaBahan = tmpDetail[i].kode_bahan;
    tmpNamaBahan2 = tmpNamaBahan.toUpperCase();

    // Simpan Detail
    sqlQuery = `INSERT INTO tt_mutasi_saldo_murni (no_transaksi,no_mutasi,tgl_mutasi,kategori,keterangan,nama_bahan,berat,input_by,input_date) VALUES 
          ('${id}','${noTrx}','${tmpTglTrx}','TAMBAH','-','${tmpNamaBahan2}','${tmpDetail[i].berat}','-','${tmpTgl}')`;
       
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
    // End Simpan Detail

    var sqlQuery = `SELECT nama_bahan,berat FROM tt_saldo_stock_murni WHERE nama_bahan = '${tmpNamaBahan2}' LIMIT 1`;
    var ResultSelect = await dbToko.SelectQuery(strIdCluster[1], sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if (ResultSelect[0] === 500) {
      await dbToko.RollBackTransaction(strIdCluster[1]);
      dbToko.closeConnection(strIdCluster[1]);
      return res.status(500).send("Internal Server Error !");
    }
    if (Object.keys(ResultSelect[1]).length === 0){
      // Simpan Saldo
      sqlQuery = `INSERT INTO tt_saldo_stock_murni (nama_bahan,berat,input_by,input_date) VALUES 
      ('${tmpNamaBahan2}','${tmpDetail[i].berat}','-','${tmpTgl}')`;
      
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
      // End Simpan Saldo
    }else{
      tmpBeratAk = Number(ResultSelect[1][0].berat) + Number(tmpDetail[i].berat);
      sqlQuery = `UPDATE tt_saldo_stock_murni SET berat = '${tmpBeratAk}' WHERE nama_bahan = '${tmpNamaBahan2}' LIMIT 1`;
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

  }
  // End Simpan

  await dbToko.CommitTransaction(strIdCluster[1]);
  dbToko.closeConnection(strIdCluster[1]);
  return res.send({
    "status":"berhasil",
    "pesan":`Tambah saldo bahan murni berhasil disimpan.`,
    "data":[{}]
  });
})

// ===============================================================================Laporan Tambah Saldo Murni
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

  sqlQuery = `SELECT no_transaksi,no_mutasi,tgl_mutasi,nama_bahan,berat,input_by,input_date
              FROM tt_mutasi_saldo_murni WHERE (tgl_mutasi BETWEEN '${req.body.tgl_awal}' AND '${req.body.tgl_akhir}') AND kategori = 'TAMBAH'
               ORDER BY no_mutasi,nama_bahan`;
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
    kode_bahan: Joi.string().min(1).max(30).required(),
    berat: Joi.number().required()
  }).required();

  const schema = Joi.object({
    data: Joi.array().items(bahan).required()
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
