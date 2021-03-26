const express = require(`express`);
const router = express.Router();
const {nsiAuth} = require('../../middleware/auth');
const {RunQuery} = require('../../middleware/sql-function');
const {GenIdCluster} = require('../../middleware/generator');
const {Table_Schema} = require('../../models/structure');
const dbToko = require('../../middleware/sql-function');
const Joi = require('@hapi/joi');

router.get('/check-db-server', nsiAuth, async(req, res) => {
  const strIdCluster = GenIdCluster(req.user.kode_toko, "CS01");
  if (strIdCluster[0] !== 200) return res.status(strIdCluster[0]).send(strIdCluster[1]);

  let resConn = await dbToko.createConnToko(req.user.kode_toko, strIdCluster[1])
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resConn[0] === 500) return res.status(resConn[0]).send(resConn[1]);

  const sqlQuery = "SELECT database() as db_name";
  const resultSelect = await dbToko.SelectQuery(strIdCluster[1], sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resultSelect[0] === 500) {
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send("Internal Server Error !");
  }

  dbToko.closeConnection(strIdCluster[1]);
  return res.send(resultSelect[1]);
})

router.get('/test-code', nsiAuth, async(req, res) => {
  res.send(req.user);
})

router.post('/run-patch', nsiAuth, async(req, res) => {
  return res.status(400).send("This feature is disable!");
  var arrResult = [];

  for(var i = 0; i < Table_Schema.length; i++){
    var sqlQuery = Table_Schema[i].table_schema;
    var ResultQuery = await RunQuery(sqlQuery, req.user.kode_toko)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if (ResultQuery[0] === 500) {
      arrResult.push({
        "proses": "Create " + Table_Schema[i].table_name,
        "status": "Failed"
      });
    }else{
      arrResult.push({
        "proses": "Create " + Table_Schema[i].table_name,
        "status": "Success"
      });
    }
  }
  return res.send(arrResult);
})

router.post('/cek-login', nsiAuth, async(req, res) => {
  const {error} = validateCheckLogin(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const strIdCluster = GenIdCluster(req.user.kode_toko, "CS01");
  if (strIdCluster[0] !== 200) return res.status(strIdCluster[0]).send(strIdCluster[1]);

  let resConn = await dbToko.createConnToko(req.user.kode_toko, strIdCluster[1])
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resConn[0] === 500) return res.status(resConn[0]).send(resConn[1]);

  var sqlQuery = `SELECT token FROM tt_login WHERE kode_customer = '${req.body.kode_customer}' ORDER BY tgl_login DESC, jam_login DESC`
  var resultSelect = await dbToko.SelectQuery(strIdCluster[1], sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resultSelect[0] === 500) {
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send('Internal Server Error !');
  }

  dbToko.closeConnection(strIdCluster[1]);
  if(Object.keys(resultSelect[1]).length !== 0){
    if (req.body.token === resultSelect[1][0].token){
      return res.send([{"kode_customer": req.body.kode_customer, "status": "login"}]);
    }else{
      return res.send([{"kode_customer": req.body.kode_customer, "status": "logout"}]);
    }
  }else{
    return res.send([{"kode_customer": req.body.kode_customer, "status": "logout"}]);
  }
})

function validateCheckLogin(user){
  const schema = Joi.object({
    kode_customer: Joi.string().min(1).max(20).required(), 
    token: Joi.string().min(1).max(255).required()
  });
  return schema.validate(user);
}

module.exports = router;