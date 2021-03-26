const config = require(`config`);

module.exports = function() {
  if (!config.get(`db_host`)) {
    throw new Error(`FATAL ERROR: Database Host is not defined.`);
  }

  if (!config.get(`db_name`)) {
    throw new Error(`FATAL ERROR: DataBase Name is not defined.`);
  }

  if (!config.get(`db_user`)) {
    throw new Error(`FATAL ERROR: DataBase User is not defined.`);
  }

  if (!config.get(`db_pass`)) {
    throw new Error(`FATAL ERROR: Database Password is not defined.`);
  }

  if (!config.get(`nsi_key`)) {
    throw new Error(`FATAL ERROR: Nagatech Key is not defined.`);
  }

  if (!config.get(`enc_key`)) {
    throw new Error(`FATAL ERROR: Enc Key is not defined.`);
  }
}