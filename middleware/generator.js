const moment = require('moment')
const {SelectQuery, InsertQuery, UpdateQuery} = require('./sql-function');
const dbToko = require('./sql-function');
const {DateNow} = require('./datetime');

let idCluster = [];

Number.prototype.pad = function(size) {
  var s = String(this);
  while (s.length < (size || 2)) {s = "0" + s;}
  return s;
}

function GenIdCluster(kodeToko, idProses){
  try{
    let strNoTrx = kodeToko + idProses + moment(DateNow()).format('YYMMDDHHmmss') + '001';

    for (let x = 1; x < 100; x++) {
      let cekIdCluster = idCluster.filter((idClus) => {
        return idClus === strNoTrx;
      });
      if(Object.keys(cekIdCluster).length === 0) break;
      strNoTrx = kodeToko + idProses + moment(DateNow()).format('YYMMDDHHmmss') + Number(x).pad(3);
    }

    idCluster.push(strNoTrx);
    return [200, strNoTrx];
  }catch(err){
    return [500, err.message];
  }
}

async function GenNoTrxMutasi(idCluster){
  var noTrxMutasi = "";
  let tmpTgl = moment(DateNow()).format('YYYY-MM-DD')

  var sqlQuery = `SELECT no_mutasi_batu FROM tt_mutasi_batu WHERE tgl_mutasi = '${tmpTgl}' ORDER BY no_mutasi_batu DESC LIMIT 1`;
  var ResultQuery = await dbToko.SelectQuery(idCluster,sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if(ResultQuery[0] === 500) return ResultQuery;
  if (Object.keys(ResultQuery[1]).length === 0){
    noTrxMutasi = "MTS-" + moment(DateNow()).format('DDMMYY') + "-0001";
  }else{
    noTrxMutasi = "MTS-" + moment(DateNow()).format('DDMMYY') + "-" + Number(Number(String(ResultQuery[1][0].no_mutasi_batu).slice(ResultQuery[1][0].no_mutasi_batu.length - 4)) + 1).pad(4);
  }

  for (i = 1; i <= 30; i++) {
    var sqlQuery = `SELECT no_mutasi_batu FROM tt_mutasi_batu WHERE no_mutasi_batu = '${noTrxMutasi}' ORDER BY no_mutasi_batu DESC LIMIT 1`
    ResultQuery = await dbToko.SelectQuery(idCluster,sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if(ResultQuery[0] === 500) return ResultQuery;

    if (Object.keys(ResultQuery[1]).length === 0){
      break;
    }else{
      noTrxMutasi = "MTS-" + moment(DateNow()).format('DDMMYY') + "-" + Number(Number(String(ResultQuery[1][0].no_mutasi_batu).slice(ResultQuery[1][0].no_mutasi_batu.length - 4)) + 1).pad(4);
    }
  }
  
  return [200, noTrxMutasi];
}

async function GenNoTrxKirimBatu(idCluster){
  var noTrxKirim = "";
  let tmpTgl = moment(DateNow()).format('YYYY-MM-DD')

  var sqlQuery = `SELECT no_batu_kirim FROM tt_admbatu_kirim_batu WHERE tgl_kirim = '${tmpTgl}' GROUP BY no_batu_kirim ORDER BY no_batu_kirim DESC LIMIT 1`;
  var ResultQuery = await dbToko.SelectQuery(idCluster,sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if(ResultQuery[0] === 500) return ResultQuery;
  if (Object.keys(ResultQuery[1]).length === 0){
    noTrxKirim = "KRB-" + moment(DateNow()).format('DDMMYY') + "-0001";
  }else{
    noTrxKirim = "KRB-" + moment(DateNow()).format('DDMMYY') + "-" + Number(Number(String(ResultQuery[1][0].no_batu_kirim).slice(ResultQuery[1][0].no_batu_kirim.length - 4)) + 1).pad(4);
  }

  for (i = 1; i <= 30; i++) {
    var sqlQuery = `SELECT no_batu_kirim FROM tt_admbatu_kirim_batu WHERE no_batu_kirim = '${noTrxKirim}' GROUP BY no_batu_kirim ORDER BY no_batu_kirim DESC LIMIT 1`
    ResultQuery = await dbToko.SelectQuery(idCluster,sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if(ResultQuery[0] === 500) return ResultQuery;

    if (Object.keys(ResultQuery[1]).length === 0){
      break;
    }else{
      noTrxKirim = "KRB-" + moment(DateNow()).format('DDMMYY') + "-" + Number(Number(String(ResultQuery[1][0].no_batu_kirim).slice(ResultQuery[1][0].no_batu_kirim.length - 4)) + 1).pad(4);
    }
  }
  
  return [200, noTrxKirim];
}

async function GenNoTrxPO(idCluster){
  var noTrxPO = "";
  let tmpTgl = moment(DateNow()).format('YYYY-MM-DD')

  var sqlQuery = `SELECT no_po_marketing FROM tt_po_marketing_head WHERE LEFT(input_date,10) = '${tmpTgl}' ORDER BY no_po_marketing DESC LIMIT 1`;
  var ResultQuery = await dbToko.SelectQuery(idCluster,sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if(ResultQuery[0] === 500) return ResultQuery;
  if (Object.keys(ResultQuery[1]).length === 0){
    noTrxPO = "PO-" + moment(DateNow()).format('DDMMYY') + "-0001";
  }else{
    noTrxPO = "PO-" + moment(DateNow()).format('DDMMYY') + "-" + Number(Number(String(ResultQuery[1][0].no_po_marketing).slice(ResultQuery[1][0].no_po_marketing.length - 4)) + 1).pad(4);
  }

  for (i = 1; i <= 30; i++) {
    var sqlQuery = `SELECT no_po_marketing FROM tt_po_marketing_head WHERE no_po_marketing = '${noTrxPO}' ORDER BY no_po_marketing DESC LIMIT 1`
    ResultQuery = await dbToko.SelectQuery(idCluster,sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if(ResultQuery[0] === 500) return ResultQuery;

    if (Object.keys(ResultQuery[1]).length === 0){
      break;
    }else{
      noTrxPO = "PO-" + moment(DateNow()).format('DDMMYY') + "-" + Number(Number(String(ResultQuery[1][0].no_po_marketing).slice(ResultQuery[1][0].no_po_marketing.length - 4)) + 1).pad(4);
    }
  }
  
  return [200, noTrxPO];
}

async function GenNoJO(idCluster){
  var noJO = "";
  let tmpTgl = moment(DateNow()).format('YYYY-MM-DD')

  var sqlQuery = `SELECT no_job_order FROM tt_po_job_order WHERE LEFT(input_date,10) = '${tmpTgl}' ORDER BY no_job_order DESC LIMIT 1`;
  var ResultQuery = await dbToko.SelectQuery(idCluster,sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if(ResultQuery[0] === 500) return ResultQuery;
  if (Object.keys(ResultQuery[1]).length === 0){
    noJO = "JO-" + moment(DateNow()).format('DDMMYY') + "-00001";
  }else{
    noJO = "JO-" + moment(DateNow()).format('DDMMYY') + "-" + Number(Number(String(ResultQuery[1][0].no_job_order).slice(ResultQuery[1][0].no_job_order.length - 5)) + 1).pad(5);
  }

  for (i = 1; i <= 30; i++) {
    var sqlQuery = `SELECT no_job_order FROM tt_po_job_order WHERE no_job_order = '${noJO}' ORDER BY no_job_order DESC LIMIT 1`
    ResultQuery = await dbToko.SelectQuery(idCluster,sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if(ResultQuery[0] === 500) return ResultQuery;

    if (Object.keys(ResultQuery[1]).length === 0){
      break;
    }else{
      noJO = "JO-" + moment(DateNow()).format('DDMMYY') + "-" + Number(Number(String(ResultQuery[1][0].no_job_order).slice(ResultQuery[1][0].no_job_order.length - 5)) + 1).pad(5);
    }
  }
  
  return [200, noJO];
}

async function GenNoTrxAddSaldoMurni(idCluster){
  var noTrx = "";
  let tmpTgl = moment(DateNow()).format('YYYY-MM-DD')

  var sqlQuery = `SELECT no_mutasi FROM tt_mutasi_saldo_murni WHERE tgl_mutasi = '${tmpTgl}' ORDER BY no_mutasi DESC LIMIT 1`;
  var ResultQuery = await dbToko.SelectQuery(idCluster,sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if(ResultQuery[0] === 500) return ResultQuery;
  if (Object.keys(ResultQuery[1]).length === 0){
    noTrx = "TBH-" + moment(DateNow()).format('DDMMYY') + "-0001";
  }else{
    noTrx = "TBH-" + moment(DateNow()).format('DDMMYY') + "-" + Number(Number(String(ResultQuery[1][0].no_mutasi).slice(ResultQuery[1][0].no_mutasi.length - 4)) + 1).pad(4);
  }

  for (i = 1; i <= 30; i++) {
    var sqlQuery = `SELECT no_mutasi FROM tt_mutasi_saldo_murni WHERE no_mutasi = '${noTrx}' ORDER BY no_mutasi DESC LIMIT 1`
    ResultQuery = await dbToko.SelectQuery(idCluster,sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if(ResultQuery[0] === 500) return ResultQuery;

    if (Object.keys(ResultQuery[1]).length === 0){
      break;
    }else{
      noTrx = "TBH-" + moment(DateNow()).format('DDMMYY') + "-" + Number(Number(String(ResultQuery[1][0].no_mutasi).slice(ResultQuery[1][0].no_mutasi.length - 4)) + 1).pad(4);
    }
  }
  
  return [200, noTrx];
}

async function GenNoTrxCreateSaldoBahan(idCluster){
  var noTrx = "";
  let tmpTgl = moment(DateNow()).format('YYYY-MM-DD')

  var sqlQuery = `SELECT no_mutasi FROM tt_mutasi_saldo_bahan WHERE tgl_mutasi = '${tmpTgl}' ORDER BY no_mutasi DESC LIMIT 1`;
  var ResultQuery = await dbToko.SelectQuery(idCluster,sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if(ResultQuery[0] === 500) return ResultQuery;
  if (Object.keys(ResultQuery[1]).length === 0){
    noTrx = "SLD-" + moment(DateNow()).format('DDMMYY') + "-0001";
  }else{
    noTrx = "SLD-" + moment(DateNow()).format('DDMMYY') + "-" + Number(Number(String(ResultQuery[1][0].no_mutasi).slice(ResultQuery[1][0].no_mutasi.length - 4)) + 1).pad(4);
  }

  for (i = 1; i <= 30; i++) {
    var sqlQuery = `SELECT no_mutasi FROM tt_mutasi_saldo_bahan WHERE no_mutasi = '${noTrx}' ORDER BY no_mutasi DESC LIMIT 1`
    ResultQuery = await dbToko.SelectQuery(idCluster,sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if(ResultQuery[0] === 500) return ResultQuery;

    if (Object.keys(ResultQuery[1]).length === 0){
      break;
    }else{
      noTrx = "SLD-" + moment(DateNow()).format('DDMMYY') + "-" + Number(Number(String(ResultQuery[1][0].no_mutasi).slice(ResultQuery[1][0].no_mutasi.length - 4)) + 1).pad(4);
    }
  }
  
  return [200, noTrx];
}

async function GenNoTrxCreateLilin(idCluster){
  var noTrx = "";
  let tmpTgl = moment(DateNow()).format('YYYY-MM-DD')

  var sqlQuery = `SELECT no_buat_lilin FROM tt_wax_buat_lilin_head WHERE tanggal = '${tmpTgl}' ORDER BY no_buat_lilin DESC LIMIT 1`;
  var ResultQuery = await dbToko.SelectQuery(idCluster,sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if(ResultQuery[0] === 500) return ResultQuery;
  if (Object.keys(ResultQuery[1]).length === 0){
    noTrx = "WB-" + moment(DateNow()).format('DDMMYY') + "-0001";
  }else{
    noTrx = "WB-" + moment(DateNow()).format('DDMMYY') + "-" + Number(Number(String(ResultQuery[1][0].no_buat_lilin).slice(ResultQuery[1][0].no_buat_lilin.length - 4)) + 1).pad(4);
  }

  for (i = 1; i <= 30; i++) {
    var sqlQuery = `SELECT no_buat_lilin FROM tt_wax_buat_lilin_detail WHERE no_buat_lilin = '${noTrx}' ORDER BY no_buat_lilin DESC LIMIT 1`
    ResultQuery = await dbToko.SelectQuery(idCluster,sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if(ResultQuery[0] === 500) return ResultQuery;

    if (Object.keys(ResultQuery[1]).length === 0){
      break;
    }else{
      noTrx = "WB-" + moment(DateNow()).format('DDMMYY') + "-" + Number(Number(String(ResultQuery[1][0].no_buat_lilin).slice(ResultQuery[1][0].no_buat_lilin.length - 4)) + 1).pad(4);
    }
  }
  
  return [200, noTrx];
}

async function GenNoTrxCreateTree(idCluster){
  var noTrx = "";
  let tmpTgl = moment(DateNow()).format('YYYY-MM-DD')

  var sqlQuery = `SELECT no_buat_pohon FROM tt_wax_buat_pohon_head WHERE tanggal = '${tmpTgl}' ORDER BY no_buat_pohon DESC LIMIT 1`;
  var ResultQuery = await dbToko.SelectQuery(idCluster,sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if(ResultQuery[0] === 500) return ResultQuery;
  if (Object.keys(ResultQuery[1]).length === 0){
    noTrx = "PH-" + moment(DateNow()).format('DDMMYY') + "-0001";
  }else{
    noTrx = "PH-" + moment(DateNow()).format('DDMMYY') + "-" + Number(Number(String(ResultQuery[1][0].no_buat_pohon).slice(ResultQuery[1][0].no_buat_pohon.length - 4)) + 1).pad(4);
  }

  for (i = 1; i <= 30; i++) {
    var sqlQuery = `SELECT no_buat_pohon FROM tt_wax_buat_pohon_detail WHERE no_buat_pohon = '${noTrx}' GROUP BY no_buat_pohon ORDER BY no_buat_pohon DESC LIMIT 1`
    ResultQuery = await dbToko.SelectQuery(idCluster,sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if(ResultQuery[0] === 500) return ResultQuery;

    if (Object.keys(ResultQuery[1]).length === 0){
      break;
    }else{
      noTrx = "PH-" + moment(DateNow()).format('DDMMYY') + "-" + Number(Number(String(ResultQuery[1][0].no_buat_pohon).slice(ResultQuery[1][0].no_buat_pohon.length - 4)) + 1).pad(4);
    }
  }
  
  return [200, noTrx];
}

async function GenAdmTerimaBatu(idCluster){
  var noTrx = "";
  let tmpTgl = moment(DateNow()).format('YYYY-MM-DD')

  var sqlQuery = `SELECT no_admin_terima_batu FROM tt_admin_terima_batu_head WHERE tgl_terima_batu = '${tmpTgl}' ORDER BY no_admin_terima_batu DESC LIMIT 1`;
  var ResultQuery = await dbToko.SelectQuery(idCluster,sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if(ResultQuery[0] === 500) return ResultQuery;
  if (Object.keys(ResultQuery[1]).length === 0){
    noTrx = "TBA-" + moment(DateNow()).format('DDMMYY') + "-0001";
  }else{
    noTrx = "TBA-" + moment(DateNow()).format('DDMMYY') + "-" + Number(Number(String(ResultQuery[1][0].no_admin_terima_batu).slice(ResultQuery[1][0].no_admin_terima_batu.length - 4)) + 1).pad(4);
  }

  for (i = 1; i <= 30; i++) {
    var sqlQuery = `SELECT no_admin_terima_batu FROM tt_admin_terima_batu_detail WHERE no_admin_terima_batu = '${noTrx}' ORDER BY no_admin_terima_batu DESC LIMIT 1`
    ResultQuery = await dbToko.SelectQuery(idCluster,sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if(ResultQuery[0] === 500) return ResultQuery;

    if (Object.keys(ResultQuery[1]).length === 0){
      break;
    }else{
      noTrx = "TBA-" + moment(DateNow()).format('DDMMYY') + "-" + Number(Number(String(ResultQuery[1][0].no_admin_terima_batu).slice(ResultQuery[1][0].no_admin_terima_batu.length - 4)) + 1).pad(4);
    }
  }
  
  return [200, noTrx];
}

async function GenAdmKirimBatu(idCluster){
  var noTrx = "";
  let tmpTgl = moment(DateNow()).format('YYYY-MM-DD')

  var sqlQuery = `SELECT no_batu_kirim FROM tt_admin_kirim_batu_head WHERE tgl_batu_kirim = '${tmpTgl}' ORDER BY no_batu_kirim DESC LIMIT 1`;
  var ResultQuery = await dbToko.SelectQuery(idCluster,sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if(ResultQuery[0] === 500) return ResultQuery;
  if (Object.keys(ResultQuery[1]).length === 0){
    noTrx = "AK-" + moment(DateNow()).format('DDMMYY') + "-0001";
  }else{
    noTrx = "AK-" + moment(DateNow()).format('DDMMYY') + "-" + Number(Number(String(ResultQuery[1][0].no_batu_kirim).slice(ResultQuery[1][0].no_batu_kirim.length - 4)) + 1).pad(4);
  }

  for (i = 1; i <= 30; i++) {
    var sqlQuery = `SELECT no_batu_kirim FROM tt_admin_kirim_batu WHERE no_batu_kirim = '${noTrx}' ORDER BY no_batu_kirim DESC LIMIT 1`
    ResultQuery = await dbToko.SelectQuery(idCluster,sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if(ResultQuery[0] === 500) return ResultQuery;

    if (Object.keys(ResultQuery[1]).length === 0){
      break;
    }else{
      noTrx = "AK-" + moment(DateNow()).format('DDMMYY') + "-" + Number(Number(String(ResultQuery[1][0].no_batu_kirim).slice(ResultQuery[1][0].no_batu_kirim.length - 4)) + 1).pad(4);
    }
  }
  
  return [200, noTrx];
}

async function GenAdmKirimTambahan(idCluster){
  var noTrx = "";
  let tmpTgl = moment(DateNow()).format('YYYY-MM-DD')

  var sqlQuery = `SELECT no_kirim FROM tt_admin_kirim_tambahan_head WHERE tgl_kirim = '${tmpTgl}' ORDER BY no_kirim DESC LIMIT 1`;
  var ResultQuery = await dbToko.SelectQuery(idCluster,sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if(ResultQuery[0] === 500) return ResultQuery;
  if (Object.keys(ResultQuery[1]).length === 0){
    noTrx = "AK-" + moment(DateNow()).format('DDMMYY') + "-0001";
  }else{
    noTrx = "AK-" + moment(DateNow()).format('DDMMYY') + "-" + Number(Number(String(ResultQuery[1][0].no_kirim).slice(ResultQuery[1][0].no_kirim.length - 4)) + 1).pad(4);
  }

  for (i = 1; i <= 30; i++) {
    var sqlQuery = `SELECT no_kirim FROM tt_admin_kirim_tambahan WHERE no_kirim = '${noTrx}' ORDER BY no_kirim DESC LIMIT 1`
    ResultQuery = await dbToko.SelectQuery(idCluster,sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if(ResultQuery[0] === 500) return ResultQuery;

    if (Object.keys(ResultQuery[1]).length === 0){
      break;
    }else{
      noTrx = "AK-" + moment(DateNow()).format('DDMMYY') + "-" + Number(Number(String(ResultQuery[1][0].no_kirim).slice(ResultQuery[1][0].no_kirim.length - 4)) + 1).pad(4);
    }
  }
  
  return [200, noTrx];
}

async function GenProduksiTerimaBatu(idCluster){
  var noTrx = "";
  let tmpTgl = moment(DateNow()).format('YYYY-MM-DD')

  var sqlQuery = `SELECT no_terima FROM tt_produksi_batu_head WHERE tgl_terima = '${tmpTgl}' ORDER BY no_terima DESC LIMIT 1`;
  var ResultQuery = await dbToko.SelectQuery(idCluster,sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if(ResultQuery[0] === 500) return ResultQuery;
  if (Object.keys(ResultQuery[1]).length === 0){
    noTrx = "HT-" + moment(DateNow()).format('DDMMYY') + "-0001";
  }else{
    noTrx = "HT-" + moment(DateNow()).format('DDMMYY') + "-" + Number(Number(String(ResultQuery[1][0].no_terima).slice(ResultQuery[1][0].no_terima.length - 4)) + 1).pad(4);
  }

  for (i = 1; i <= 30; i++) {
    var sqlQuery = `SELECT no_terima FROM tt_produksi_batu WHERE no_terima = '${noTrx}' ORDER BY no_terima DESC LIMIT 1`
    ResultQuery = await dbToko.SelectQuery(idCluster,sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if(ResultQuery[0] === 500) return ResultQuery;

    if (Object.keys(ResultQuery[1]).length === 0){
      break;
    }else{
      noTrx = "HT-" + moment(DateNow()).format('DDMMYY') + "-" + Number(Number(String(ResultQuery[1][0].no_terima).slice(ResultQuery[1][0].no_terima.length - 4)) + 1).pad(4);
    }
  }
  
  return [200, noTrx];
}

async function GenProduksiTerimaTambahan(idCluster){
  var noTrx = "";
  let tmpTgl = moment(DateNow()).format('YYYY-MM-DD')

  var sqlQuery = `SELECT no_terima FROM tt_produksi_tambahan_head WHERE tgl_terima = '${tmpTgl}' ORDER BY no_terima DESC LIMIT 1`;
  var ResultQuery = await dbToko.SelectQuery(idCluster,sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if(ResultQuery[0] === 500) return ResultQuery;
  if (Object.keys(ResultQuery[1]).length === 0){
    noTrx = "HT-" + moment(DateNow()).format('DDMMYY') + "-0001";
  }else{
    noTrx = "HT-" + moment(DateNow()).format('DDMMYY') + "-" + Number(Number(String(ResultQuery[1][0].no_terima).slice(ResultQuery[1][0].no_terima.length - 4)) + 1).pad(4);
  }

  for (i = 1; i <= 30; i++) {
    var sqlQuery = `SELECT no_terima FROM tt_produksi_tambahan WHERE no_terima = '${noTrx}' ORDER BY no_terima DESC LIMIT 1`
    ResultQuery = await dbToko.SelectQuery(idCluster,sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if(ResultQuery[0] === 500) return ResultQuery;

    if (Object.keys(ResultQuery[1]).length === 0){
      break;
    }else{
      noTrx = "HT-" + moment(DateNow()).format('DDMMYY') + "-" + Number(Number(String(ResultQuery[1][0].no_terima).slice(ResultQuery[1][0].no_terima.length - 4)) + 1).pad(4);
    }
  }
  
  return [200, noTrx];
}

async function GenKirimJO(idCluster){
  var noTrx = "";
  let tmpTgl = moment(DateNow()).format('YYYY-MM-DD')

  var sqlQuery = `SELECT no_kirim FROM tt_admin_kirim_head WHERE tgl_kirim = '${tmpTgl}' ORDER BY no_kirim DESC LIMIT 1`;
  var ResultQuery = await dbToko.SelectQuery(idCluster,sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if(ResultQuery[0] === 500) return ResultQuery;
  if (Object.keys(ResultQuery[1]).length === 0){
    noTrx = "AK-" + moment(DateNow()).format('DDMMYY') + "-0001";
  }else{
    noTrx = "AK-" + moment(DateNow()).format('DDMMYY') + "-" + Number(Number(String(ResultQuery[1][0].no_kirim).slice(ResultQuery[1][0].no_kirim.length - 4)) + 1).pad(4);
  }

  for (i = 1; i <= 30; i++) {
    var sqlQuery = `SELECT no_kirim FROM tt_admin_kirim_detail WHERE no_kirim = '${noTrx}' GROUP BY no_kirim ORDER BY no_kirim DESC LIMIT 1`
    ResultQuery = await dbToko.SelectQuery(idCluster,sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if(ResultQuery[0] === 500) return ResultQuery;

    if (Object.keys(ResultQuery[1]).length === 0){
      break;
    }else{
      noTrx = "AK-" + moment(DateNow()).format('DDMMYY') + "-" + Number(Number(String(ResultQuery[1][0].no_kirim).slice(ResultQuery[1][0].no_kirim.length - 4)) + 1).pad(4);
    }
  }
  
  return [200, noTrx];
}

async function GenTerimaJO(idCluster){
  var noTrx = "";
  let tmpTgl = moment(DateNow()).format('YYYY-MM-DD')

  var sqlQuery = `SELECT no_terima FROM tt_admin_terima_head WHERE tgl_terima = '${tmpTgl}' ORDER BY no_terima DESC LIMIT 1`;
  var ResultQuery = await dbToko.SelectQuery(idCluster,sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if(ResultQuery[0] === 500) return ResultQuery;
  if (Object.keys(ResultQuery[1]).length === 0){
    noTrx = "AT-" + moment(DateNow()).format('DDMMYY') + "-0001";
  }else{
    noTrx = "AT-" + moment(DateNow()).format('DDMMYY') + "-" + Number(Number(String(ResultQuery[1][0].no_terima).slice(ResultQuery[1][0].no_terima.length - 4)) + 1).pad(4);
  }

  for (i = 1; i <= 30; i++) {
    var sqlQuery = `SELECT no_terima FROM tt_admin_terima_detail WHERE no_terima = '${noTrx}' GROUP BY no_terima ORDER BY no_terima DESC LIMIT 1`
    ResultQuery = await dbToko.SelectQuery(idCluster,sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if(ResultQuery[0] === 500) return ResultQuery;

    if (Object.keys(ResultQuery[1]).length === 0){
      break;
    }else{
      noTrx = "AT-" + moment(DateNow()).format('DDMMYY') + "-" + Number(Number(String(ResultQuery[1][0].no_terima).slice(ResultQuery[1][0].no_terima.length - 4)) + 1).pad(4);
    }
  }
  
  return [200, noTrx];
}

async function GenHancurSusut(idCluster){
  var noTrx = "";
  let tmpTgl = moment(DateNow()).format('YYYY-MM-DD')

  var sqlQuery = `SELECT no_hancur FROM tt_admin_hancur_susut WHERE tgl_hancur = '${tmpTgl}' ORDER BY no_hancur DESC LIMIT 1`;
  var ResultQuery = await dbToko.SelectQuery(idCluster,sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
  if(ResultQuery[0] === 500) return ResultQuery;
  if (Object.keys(ResultQuery[1]).length === 0){
    noTrx = "AHS-" + moment(DateNow()).format('DDMMYY') + "-0001";
  }else{
    noTrx = "AHS-" + moment(DateNow()).format('DDMMYY') + "-" + Number(Number(String(ResultQuery[1][0].no_hancur).slice(ResultQuery[1][0].no_hancur.length - 4)) + 1).pad(4);
  }

  for (i = 1; i <= 30; i++) {
    var sqlQuery = `SELECT no_hancur FROM tt_admin_hancur_susut WHERE no_hancur = '${noTrx}' ORDER BY no_hancur DESC LIMIT 1`
    ResultQuery = await dbToko.SelectQuery(idCluster,sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if(ResultQuery[0] === 500) return ResultQuery;

    if (Object.keys(ResultQuery[1]).length === 0){
      break;
    }else{
      noTrx = "AHS-" + moment(DateNow()).format('DDMMYY') + "-" + Number(Number(String(ResultQuery[1][0].no_hancur).slice(ResultQuery[1][0].no_hancur.length - 4)) + 1).pad(4);
    }
  }
  
  return [200, noTrx];
}

exports.GenIdCluster = GenIdCluster;
exports.idCluster = idCluster;
exports.GenNoTrxMutasi = GenNoTrxMutasi;
exports.GenNoTrxKirimBatu = GenNoTrxKirimBatu;
exports.GenNoTrxPO = GenNoTrxPO;
exports.GenNoJO = GenNoJO;
exports.GenNoTrxAddSaldoMurni = GenNoTrxAddSaldoMurni;
exports.GenNoTrxCreateSaldoBahan = GenNoTrxCreateSaldoBahan;
exports.GenNoTrxCreateLilin = GenNoTrxCreateLilin;
exports.GenNoTrxCreateTree = GenNoTrxCreateTree;
exports.GenAdmTerimaBatu = GenAdmTerimaBatu;
exports.GenAdmKirimBatu = GenAdmKirimBatu;
exports.GenAdmKirimTambahan = GenAdmKirimTambahan;
exports.GenProduksiTerimaBatu = GenProduksiTerimaBatu;
exports.GenProduksiTerimaTambahan = GenProduksiTerimaTambahan;
exports.GenKirimJO = GenKirimJO;
exports.GenTerimaJO = GenTerimaJO;
exports.GenHancurSusut = GenHancurSusut;