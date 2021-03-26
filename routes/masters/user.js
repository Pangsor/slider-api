const express = require(`express`);
const router = express.Router();
const dbToko = require('../../middleware/sql-function')
const {nsiAuth} = require('../../middleware/auth');
const {GenIdCluster} = require('../../middleware/generator');
const Joi = require('@hapi/joi');
const {DateNow} = require('../../middleware/datetime');
const {trimUcaseJSON} = require('../../middleware/function');
const { dbServer } = require('../../middleware/connections');
const bcrypt = require('bcrypt');

// ===============================================================================Get
router.get('/all', async(req, res) => {
  const strIdCluster = GenIdCluster("MDN", "CS01");
  if (strIdCluster[0] !== 200) return res.status(strIdCluster[0]).send(strIdCluster[1]);

  let resConn = await dbToko.createConnToko("MDN", strIdCluster[1])
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resConn[0] === 500) return res.status(resConn[0]).send(resConn[1]);

  try{
    const sqlQuery = `SELECT user_id,nama_lkp,type FROM tm_user`;
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
        "pesan":"Data user tidak ditemukan",
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

// ===============================================================================Post
router.post('/', async(req, res) => {
  let tmpTgl = DateNow();

  const {error} = validateUserAdd(req.body);
  if (error) return res.status(500).send({
    "status":"error",
    "pesan":error.details[0].message,
    "data":[{}]
  });

  if (req.body.password != req.body.retype_password){
    return res.status(500).send({
      "status":"error",
      "pesan":"Password dan retype-password berbeda!",
      "data":[{}]
    })
  }

  const strIdCluster = GenIdCluster("MDN", "CS01");
  if (strIdCluster[0] !== 200) return res.status(strIdCluster[0]).send(strIdCluster[1]);

  let resConn = await dbToko.createConnToko("MDN", strIdCluster[1])
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resConn[0] === 500) return res.status(resConn[0]).send(resConn[1]);

  var dataJson = trimUcaseJSON(req.body,["user_id","password"]);
  var sqlQuery = `SELECT user_id FROM tm_user WHERE user_id = '${dataJson[1].user_id}' LIMIT 1`;
  
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
      "pesan":`User : ${dataJson[1].user_id} sudah ada !`,
      "data":[{}]
    });
  }

  const hashedPassword = await bcrypt.hash(dataJson[1].password,10);
  sqlQuery = `INSERT INTO tm_user (user_id,password,nama_lkp,type,input_by,input_date) VALUES 
    ('${dataJson[1].user_id}','${hashedPassword}','${dataJson[1].nama_lkp}','${dataJson[1].type}','-','${tmpTgl}')`;

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

  dbToko.closeConnection(strIdCluster[1]);
  return res.send({
    "status":"berhasil",
    "pesan":"Data user berhasil disimpan.",
    "data":[{}]
  });
})

// ===============================================================================Put
router.put('/', async(req, res) => {
  const {error} = validateUserEdit(req.body);
  if (error) return res.status(500).send({
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

  var dataJson = trimUcaseJSON(req.body,["user_id"]);

  // Cek Kode
  var sqlQuery = `SELECT user_id FROM tm_user WHERE user_id = '${dataJson[1].user_id}' LIMIT 1`;
  var ResultSelect = await dbToko.SelectQuery(strIdCluster[1], sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (ResultSelect[0] === 500) {
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send("Internal Server Error !");
  }

  if (Object.keys(ResultSelect[1]).length === 0) {
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send({
      "status":"error",
      "pesan":`User : ${dataJson[1].user_id} tidak di temukan !`,
      "data":[{}]
    });
  }
  // End Cek Kode

  sqlQuery = `UPDATE tm_user SET nama_lkp = '${dataJson[1].nama_lkp}',type = '${dataJson[1].type}' WHERE user_id = '${dataJson[1].user_id}' LIMIT 1`;
  ResultSelect = await dbToko.UpdateQuery(strIdCluster[1], sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (ResultSelect[0] === 500) {
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send("Internal Server Error !");
  }

  dbToko.closeConnection(strIdCluster[1]);
  return res.send({
    "status":"berhasil",
    "pesan":"Data user berhasil diedit.",
    "data":[{}]
  });
})

// ===============================================================================Delete
router.delete('/', async(req, res) => {
  const {error} = validateUserDelete(req.body);
  if (error) return res.status(500).send({
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

  // Cek Kode
  var sqlQuery = `SELECT user_id FROM tm_user WHERE user_id = '${req.body.user_id}' LIMIT 1`;
  var ResultSelect = await dbToko.SelectQuery(strIdCluster[1], sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (ResultSelect[0] === 500) {
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send("Internal Server Error !");
  }

  if (Object.keys(ResultSelect[1]).length === 0) {
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send({
      "status":"error",
      "pesan":`User : ${req.body.user_id} tidak di temukan !`,
      "data":[{}]
    });
  }
  // End Cek Kode

  sqlQuery = `DELETE FROM tm_user WHERE user_id = '${req.body.user_id}' LIMIT 1`;
  ResultSelect = await dbToko.DeleteQuery(strIdCluster[1], sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (ResultSelect[0] === 500) {
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send("Internal Server Error !");
  }

  dbToko.closeConnection(strIdCluster[1]);
  return res.send({
    "status":"berhasil",
    "pesan":"Data user berhasil dihapus.",
    "data":[{}]
  });
})

// ===============================================================================Login
router.post('/login', async(req, res) => {
  let tmpPassword = "";
  let tmpNamaLkp = "";
  let tmpType = "";

  const {error} = validateUserLogin(req.body);
      if (error) return res.status(500).send({
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

  // Cek User
  var sqlQuery = `SELECT user_id,password,nama_lkp,type FROM tm_user WHERE user_id = '${req.body.user_id}' LIMIT 1`;
  var ResultSelect = await dbToko.SelectQuery(strIdCluster[1], sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (ResultSelect[0] === 500) {
      dbToko.closeConnection(strIdCluster[1]);
      return res.status(500).send("Internal Server Error !");
  }

  if (Object.keys(ResultSelect[1]).length === 0) {
      dbToko.closeConnection(strIdCluster[1]);
      return res.status(500).send({
      "status":"error",
      "pesan":`User : ${req.body.user_id} tidak di temukan !`,
      "data":[{}]
      });
  }else{
      tmpPassword = ResultSelect[1][0].password;
      tmpNamaLkp = ResultSelect[1][0].nama_lkp;
      tmpType = ResultSelect[1][0].type;
  }
  // End Cek User

  const validPassword = await bcrypt.compare(req.body.password, tmpPassword);
  if (!validPassword){
      return res.status(500).send({
        "status":"error",
        "pesan":`User id atau password salah`,
        "data":[]
      })
  }
  
  // const token = generateAuthToken();

  return res.send({
    "token" : "token",
    "user_id" : req.body.user_id,
    "nama_lkp" : tmpNamaLkp,
    "type" : tmpType
  });

});

// ===============================================================================Change Password
router.put('/password', async(req, res) => {
  let tmpPassword = "";
  let tmpNamaLkp = "";
  let tmpType = "";

  const {error} = validateChangePassword(req.body);
      if (error) return res.status(500).send({
      "status":"error",
      "pesan":error.details[0].message,
      "data":[{}]
  });

  if (req.body.password === req.body.new_password){
    return res.status(500).send({
      "status":"error",
      "pesan":"Password lama dan password baru tidak boleh sama!",
      "data":[{}]
    })
  }

  if (req.body.new_password != req.body.retype_password){
    return res.status(500).send({
      "status":"error",
      "pesan":"Password baru dan retype-password berbeda!",
      "data":[{}]
    })
  }

  const strIdCluster = GenIdCluster("MDN", "CS01");
  if (strIdCluster[0] !== 200) return res.status(strIdCluster[0]).send({
      "status":"error",
      "pesan":strIdCluster[1],
      "data":[{}]
  });

  let resConn = await dbToko.createConnToko("MDN", strIdCluster[1])
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (resConn[0] === 500) return res.status(resConn[0]).send(resConn[1]);

  // Cek User
  var sqlQuery = `SELECT user_id,password,nama_lkp,type FROM tm_user WHERE user_id = '${req.body.user_id}' LIMIT 1`;
  var ResultSelect = await dbToko.SelectQuery(strIdCluster[1], sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (ResultSelect[0] === 500) {
      dbToko.closeConnection(strIdCluster[1]);
      return res.status(500).send("Internal Server Error !");
  }

  if (Object.keys(ResultSelect[1]).length === 0) {
      dbToko.closeConnection(strIdCluster[1]);
      return res.status(500).send({
      "status":"error",
      "pesan":`User : ${req.body.user_id} tidak di temukan !`,
      "data":[{}]
      });
  }else{
      tmpPassword = ResultSelect[1][0].password;
      tmpNamaLkp = ResultSelect[1][0].nama_lkp;
      tmpType = ResultSelect[1][0].type;
  }
  // End Cek User

  const validPassword = await bcrypt.compare(req.body.password, tmpPassword);
  if (!validPassword){
      return res.status(500).send({
        "status":"error",
        "pesan":`User id atau password salah`,
        "data":[]
      })
  }
  
  const hashedPassword = await bcrypt.hash(req.body.new_password,10);
  sqlQuery = `UPDATE tm_user SET password = '${hashedPassword}' WHERE user_id = '${req.body.user_id}' LIMIT 1`;
  ResultSelect = await dbToko.UpdateQuery(strIdCluster[1], sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if (ResultSelect[0] === 500) {
    dbToko.closeConnection(strIdCluster[1]);
    return res.status(500).send("Internal Server Error !");
  }

  

  return res.send({
    "token" : "token",
    "user_id" : req.body.user_id,
    "nama_lkp" : tmpNamaLkp,
    "type" : tmpType
  });

});

// ===============================================================================Validasi
function validateUserAdd(bahan){
  const schema = Joi.object({
    user_id: Joi.string().min(1).max(30).required(),
    password: Joi.string().min(1).max(100).required(),
    retype_password: Joi.string().min(1).max(100).required(),
    nama_lkp: Joi.string().min(1).max(100).required(),
    type: Joi.string().min(1).max(20).required()
  });
  return schema.validate(bahan);
}

function validateUserEdit(bahan){
  const schema = Joi.object({
    user_id: Joi.string().min(1).max(30).required(),
    nama_lkp: Joi.string().min(1).max(100).required(),
    type: Joi.string().min(1).max(20).required()
  });
  return schema.validate(bahan);
}

function validateUserDelete(bahan){
  const schema = Joi.object({
    user_id: Joi.string().min(1).max(30).required()
  });
  return schema.validate(bahan);
}

function validateUserLogin(bahan){
  const schema = Joi.object({
    user_id: Joi.string().min(1).max(30).required(),
    password: Joi.string().min(1).max(100).required()
  });
  return schema.validate(bahan);
}

function validateChangePassword(bahan){
  const schema = Joi.object({
    user_id: Joi.string().min(1).max(30).required(),
    password: Joi.string().min(1).max(100).required(),
    new_password: Joi.string().min(1).max(100).required(),
    retype_password: Joi.string().min(1).max(100).required()
  });
  return schema.validate(bahan);
}

module.exports = router;