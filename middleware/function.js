const moment = require('moment');
const {DateNow} = require('./datetime');
const dbToko = require('./sql-function');

function trimUcaseJSON(dataJSON, arrIgnor) {
  try{
    if(Array.isArray(dataJSON) === false){
      // This for non array JSON
      let encJSON = {};
      for(let i in dataJSON){
        if(typeof dataJSON[i] === "string"){
          if(moment(dataJSON[i],['YYYY-MM-DD', 'YYYY-MM-DD HH:mm:ss'], true).isValid() === false){
            let resCek = arrIgnor.find((element) => {
              return String(element).toUpperCase().trim() === String(i).toUpperCase().trim();
            });
            if (!resCek){
              encJSON[i] = String(dataJSON[i]).toUpperCase().trim();
            }else{
              encJSON[i] = dataJSON[i];
            }
          }else{
            encJSON[i] = dataJSON[i];
          }
        }else{
          encJSON[i] = dataJSON[i];
        }
      }
      return ([200, encJSON]);
    }else{
      // This For array JSON
      let aEncJSON = [];
      for(let b in dataJSON){
        let aDataJSON = dataJSON[b];
        let encJSON2 = {};

        for(let i in aDataJSON){
          if(typeof aDataJSON[i] === "string"){
            if(moment(aDataJSON[i],['YYYY-MM-DD', 'YYYY-MM-DD HH:mm:ss'], true).isValid() === false){
              let resCek = arrIgnor.find((element) => {
                return String(element).toUpperCase().trim() === String(i).toUpperCase().trim();
              });
              if (!resCek){
                encJSON2[i] = String(aDataJSON[i]).toUpperCase().trim();
              }else{
                encJSON2[i] = aDataJSON[i];
              }
            }else{
              encJSON2[i] = aDataJSON[i];
            }
          }else{
            encJSON2[i] = aDataJSON[i];
          }
        }
        aEncJSON.push(encJSON2);
      }
      return ([200, aEncJSON]);
    }
  }catch(err){
    return([500, err.message]);
  }
};

function cekNumber(namaObject, dataObject) {
  if (typeof dataObject !== "number") return [400, `${namaObject} harus di isi dengan number!`]
  return [200, 'valid.'];
}

async function insertCardAdmin(idCluster,no_transaksi,tanggal,divisi,kategori,keterangan,no_job_order,kdJnsBhn,berat,inputBy,jenisTrx){
  try{
    let tmpTgl = DateNow();
    if (jenisTrx === "IN"){
      sqlQuery = `INSERT INTO tt_stock_card_admin (no_transaksi,tanggal,nama_divisi,kategori,keterangan,no_job_order,kode_jenis_bahan,berat_in,input_by,input_date) VALUES 
              ('${no_transaksi}','${tanggal}','${divisi}','${kategori}','${keterangan}','${no_job_order}','${kdJnsBhn}','${berat}','${inputBy}','${tmpTgl}')`;
    }else{
      sqlQuery = `INSERT INTO tt_stock_card_admin (no_transaksi,tanggal,nama_divisi,kategori,keterangan,no_job_order,kode_jenis_bahan,berat_out,input_by,input_date) VALUES 
              ('${no_transaksi}','${tanggal}','${divisi}','${kategori}','${keterangan}','${no_job_order}','${kdJnsBhn}','${berat}','${inputBy}','${tmpTgl}')`;
    }
             
    ResultInsert = await dbToko.InsertQuery(idCluster, sqlQuery)
    .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    
    return [200, `sukes`];
  }catch(err){
    return [500, err.message];
  }
}

async function saldoAdminDebit(idCluster,tgl,divisi,kdJnsBhn,berat,inputBy,sField){
  try{
    let tmpTglInput = DateNow();
    let tmpTgl;
    let saldoAwal = 0;
    let saldoAkhir = 0;

    var sqlQuery = `SELECT tanggal,kode_jenis_bahan,berat_akhir FROM tt_saldo_stock_admin WHERE tanggal <= '${tgl}' AND nama_divisi = '${divisi}'
                   AND kode_jenis_bahan = '${kdJnsBhn}' ORDER BY tanggal DESC LIMIT 1`;
    var ResultSelect = await dbToko.SelectQuery(idCluster, sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if (Object.keys(ResultSelect[1]).length === 0){
      sqlQuery = `INSERT INTO tt_saldo_stock_admin (tanggal,nama_divisi,kode_jenis_bahan,berat_awal,${sField},berat_akhir,input_by,input_date) VALUES 
                ('${tgl}','${divisi}','${kdJnsBhn}','0','${berat}','${berat}','${inputBy}','${tmpTglInput}')`;
      ResultInsert = await dbToko.InsertQuery(idCluster, sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    }else{
      tmpTgl = ResultSelect[1][0].tanggal;
      saldoAwal = ResultSelect[1][0].berat_akhir;
      saldoAkhir = Number(ResultSelect[1][0].berat_akhir) + Number(berat);
      
      if (tmpTgl == tgl){
        sqlQuery = `UPDATE tt_saldo_stock_admin SET ${sField} = ${sField} + '${berat}', berat_akhir = '${saldoAkhir}' WHERE tanggal = '${tgl}' AND nama_divisi = '${divisi}'
                  AND kode_jenis_bahan = '${kdJnsBhn}' LIMIT 1`;
        ResultUpdate = await dbToko.UpdateQuery(idCluster, sqlQuery)
        .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
      }else{
        sqlQuery = `INSERT INTO tt_saldo_stock_admin (tanggal,nama_divisi,kode_jenis_bahan,berat_awal,${sField},berat_akhir,input_by,input_date) VALUES 
                  ('${tgl}','${divisi}','${kdJnsBhn}','${saldoAwal}','${berat}','${saldoAkhir}','${inputBy}','${tmpTglInput}')`;
        ResultInsert = await dbToko.InsertQuery(idCluster, sqlQuery)
        .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
      }
    }
    
    return [200, `sukes`];
  }catch(err){
    return [500, err.message];
  }
}

async function saldoAdminKredit(idCluster,tgl,divisi,kdJnsBhn,berat,inputBy,sField){
  try{
    let tmpTglInput = DateNow();
    let tmpTgl;
    let saldoAwal = 0;
    let saldoAkhir = 0;

    var sqlQuery = `SELECT tanggal,kode_jenis_bahan,berat_akhir FROM tt_saldo_stock_admin WHERE tanggal <= '${tgl}' AND nama_divisi = '${divisi}'
                   AND kode_jenis_bahan = '${kdJnsBhn}' ORDER BY tanggal DESC LIMIT 1`;
    var ResultSelect = await dbToko.SelectQuery(idCluster, sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    if (Object.keys(ResultSelect[1]).length === 0){
      saldoAkhir = berat * -1;
      sqlQuery = `INSERT INTO tt_saldo_stock_admin (tanggal,nama_divisi,kode_jenis_bahan,berat_awal,${sField},berat_akhir,input_by,input_date) VALUES 
                ('${tgl}','${divisi}','${kdJnsBhn}','0','${berat}','${saldoAkhir}','${inputBy}','${tmpTglInput}')`;
      ResultInsert = await dbToko.InsertQuery(idCluster, sqlQuery)
      .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
    }else{
      tmpTgl = ResultSelect[1][0].tanggal;
      saldoAwal = ResultSelect[1][0].berat_akhir;
      saldoAkhir = Number(ResultSelect[1][0].berat_akhir) - Number(berat);

      if (tmpTgl == tgl){
        sqlQuery = `UPDATE tt_saldo_stock_admin SET ${sField} = ${sField} + '${berat}', berat_akhir = '${saldoAkhir}' WHERE tanggal = '${tgl}' AND nama_divisi = '${divisi}'
                  AND kode_jenis_bahan = '${kdJnsBhn}' LIMIT 1`;
        ResultUpdate = await dbToko.UpdateQuery(idCluster, sqlQuery)
        .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
      }else{
        sqlQuery = `INSERT INTO tt_saldo_stock_admin (tanggal,nama_divisi,kode_jenis_bahan,berat_awal,${sField},berat_akhir,input_by,input_date) VALUES 
                  ('${tgl}','${divisi}','${kdJnsBhn}','${saldoAwal}','${berat}','${saldoAkhir}','${inputBy}','${tmpTglInput}')`;
        ResultInsert = await dbToko.InsertQuery(idCluster, sqlQuery)
        .then(result => { return [200, result[0]] }).catch(err => { return [500, err]});
      }
    }
    
    return [200, `sukes`];
  }catch(err){
    return [500, err.message];
  }
}

exports.trimUcaseJSON = trimUcaseJSON;
exports.cekNumber = cekNumber;
exports.insertCardAdmin = insertCardAdmin;
exports.saldoAdminDebit = saldoAdminDebit;
exports.saldoAdminKredit = saldoAdminKredit;