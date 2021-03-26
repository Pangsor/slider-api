const moment = require('moment-timezone');

function DateNow(){
  const AsiaJkt = moment(new Date).tz("Asia/Jakarta");

  return moment(AsiaJkt).format("YYYY-MM-DD HH:mm:ss");
}

exports.DateNow = DateNow;