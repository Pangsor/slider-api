const express = require(`express`);
const error = require(`../middleware/error`);

// Master
const bahan = require('../routes/masters/bahan');
const user = require('../routes/masters/user');

module.exports = function(app) {
  app.use(express.json({ limit: '30mb' }));
  app.use(express.urlencoded({ limit: '30mb', extended: true }))

  app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    // res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-auth-token");
    res.header("Access-Control-Allow-Headers", "*");
    res.header("Access-Control-Allow-Methods","POST,GET,PUT,DELETE");
    next();
  });

  // Master
  app.use('/api/bahan', bahan);
  app.use('/api/user', user);

  app.use(error);
}