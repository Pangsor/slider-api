const express = require(`express`);
const router = express.Router();
const dbToko = require('../../middleware/sql-function')
const {nsiAuth} = require('../../middleware/auth');
const {GenIdCluster} = require('../../middleware/generator');
const Joi = require('@hapi/joi');
const {trimUcaseJSON} = require('../../middleware/function');
const { dbServer } = require('../../middleware/connections');

// ===============================================================================
router.post('/tgl/all', async(req, res) => {
  let sqlQuery = "";
  let i;
  let arrData = [];
  let statCari = false;
  let tmpDivisi = "";
  let tmpKdJnsBhn = "";

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

  sqlQuery = `SELECT tanggal,nama_divisi,kode_jenis_bahan,berat_awal,berat_saldo_bahan,berat_terima_batu,berat_kirim_batu
            ,berat_kirim_tambahan_produksi,berat_terima_tambahan,berat_kirim_jo,berat_terima_jo,berat_hancur,berat_gudang_qc,berat_akhir
             FROM tt_saldo_stock_admin WHERE tanggal = '${dataJson[1].tanggal}' ORDER BY nama_divisi`;
  
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

    if (resultSelect[1].length == 0){
      return res.send({
        "status":"berhasil",
        "pesan":"Data tidak ditemukan",
        "data":resultSelect[1]
      });
    }else{

      for (i in resultSelect[1]){
        arrData.push({
          tanggal: resultSelect[1][i].tanggal,
          nama_divisi: resultSelect[1][i].nama_divisi,
          kode_jenis_bahan: resultSelect[1][i].kode_jenis_bahan,
          berat_awal: resultSelect[1][i].berat_awal,
          berat_saldo_bahan: resultSelect[1][i].berat_saldo_bahan,
          berat_terima_batu: resultSelect[1][i].berat_terima_batu,
          berat_kirim_batu: resultSelect[1][i].berat_kirim_batu,
          berat_kirim_tambahan_produksi: resultSelect[1][i].berat_kirim_tambahan_produksi,
          berat_terima_tambahan: resultSelect[1][i].berat_terima_tambahan,
          berat_kirim_jo: resultSelect[1][i].berat_kirim_jo,
          berat_terima_jo: resultSelect[1][i].berat_terima_jo,
          berat_hancur: resultSelect[1][i].berat_hancur,
          berat_gudang_qc: resultSelect[1][i].berat_gudang_qc,
          berat_akhir: resultSelect[1][i].berat_akhir
        })
      }
      
      // Get Divisi And Jenis
      sqlQuery = `SELECT nama_divisi,kode_jenis_bahan FROM tt_saldo_stock_admin GROUP BY nama_divisi,kode_jenis_bahan ORDER BY nama_divisi,kode_jenis_bahan`;
      const resultList = await dbToko.SelectQuery(strIdCluster[1], sqlQuery)
        .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
      if (resultList[0] === 500) {
        dbToko.closeConnection(strIdCluster[1]);
        return res.status(500).send({
          "status":"error",
          "pesan":resultList[1],
          "data":[{}]
        });
      }
      // Get Divisi And Jenis

      // Loop List
      for (i in resultList[1]){
        tmpDivisi = resultList[1][i].nama_divisi;
        tmpKdJnsBhn = resultList[1][i].kode_jenis_bahan;

        statCari = false;
        var indexOf = arrData.findIndex(result => result.nama_divisi === tmpDivisi);
        if (indexOf != "-1"){
          var indexOf2 = arrData.findIndex(result => result.kode_jenis_bahan === tmpKdJnsBhn);
          if (indexOf2 != "-1"){
            statCari = false;
          }else{
            statCari = true;
          }
        }else{
          statCari = true;
        }

        if (statCari == true){
          statCari = false;
          // Push
          sqlQuery = `SELECT tanggal,nama_divisi,kode_jenis_bahan,berat_awal,berat_saldo_bahan,berat_terima_batu,berat_kirim_batu
            ,berat_kirim_tambahan_produksi,berat_terima_tambahan,berat_kirim_jo,berat_terima_jo,berat_hancur,berat_gudang_qc,berat_akhir
             FROM tt_saldo_stock_admin WHERE nama_divisi = '${tmpDivisi}' AND kode_jenis_bahan = '${tmpKdJnsBhn}' AND tanggal < '${dataJson[1].tanggal}' ORDER BY tanggal DESC LIMIT 1`;

          const resultSelect2 = await dbToko.SelectQuery(strIdCluster[1], sqlQuery)
            .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
          if (resultSelect2[0] === 500) {
            dbToko.closeConnection(strIdCluster[1]);
            return res.status(500).send({
              "status":"error",
              "pesan":resultSelect2[1],
              "data":[{}]
            });
          }

          if (resultSelect2[1].length == 0){
            
          }else{
            arrData.push({
              tanggal: resultSelect2[1][0].tanggal,
              nama_divisi: resultSelect2[1][0].nama_divisi,
              kode_jenis_bahan: resultSelect2[1][0].kode_jenis_bahan,
              berat_awal: resultSelect2[1][0].berat_awal,
              berat_saldo_bahan: resultSelect2[1][0].berat_saldo_bahan,
              berat_terima_batu: resultSelect2[1][0].berat_terima_batu,
              berat_kirim_batu: resultSelect2[1][0].berat_kirim_batu,
              berat_kirim_tambahan_produksi: resultSelect2[1][0].berat_kirim_tambahan_produksi,
              berat_terima_tambahan: resultSelect2[1][0].berat_terima_tambahan,
              berat_kirim_jo: resultSelect2[1][0].berat_kirim_jo,
              berat_terima_jo: resultSelect2[1][0].berat_terima_jo,
              berat_hancur: resultSelect2[1][0].berat_hancur,
              berat_gudang_qc: resultSelect2[1][0].berat_gudang_qc,
              berat_akhir: resultSelect2[1][0].berat_akhir
            })
          }
          // End Push
        }

      }
      // End Loop List
      
      return res.send({
        "status":"berhasil",
        "pesan":"berhasil22",
        "data":arrData
      });
    }
    
  }catch(error){
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500, error.message);
  }
})

// ===============================================================================Validasi
function validateReport(bahan){
  const schema = Joi.object({
    tanggal: Joi.date().required()
  });
  return schema.validate(bahan);
}

module.exports = router;