const cf = require('config');
// const jwt = require('jsonwebtoken');

function nsiAuth(req, res, next) {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).send('Access denied. No token provided.');
  
  console.log(token)
  req.user = {"kode_toko": token.slice(0,3)};
  if (token.slice(3,Number(token.length)) !== cf.get(`nsi_key`)) return res.status(401).send(`Access denied.`);

  next();
}

exports.nsiAuth = nsiAuth;