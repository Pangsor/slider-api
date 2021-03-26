const express = require(`express`);
const router = express.Router();
const dbToko = require('../../middleware/sql-function')
const {nsiAuth} = require('../../middleware/auth');
const {GenIdCluster} = require('../../middleware/generator');
const Joi = require('@hapi/joi');
const {trimUcaseJSON} = require('../../middleware/function');
const { dbServer } = require('../../middleware/connections');

// ===============================================================================
router.post('/no_job_order/all', async(req, res) => {
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

  sqlQuery = `SELECT tanggal,nama_divisi,kategori,no_job_order,kode_jenis_bahan,berat_in,berat_out,input_date FROM tt_stock_card_admin
             WHERE no_job_order = '${dataJson[1].no_job_order}' ORDER BY input_date`;
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
function validateReport(bahan){
  const schema = Joi.object({
    no_job_order: Joi.string().min(1).max(60).required()
  });
  return schema.validate(bahan);
}

module.exports = router;