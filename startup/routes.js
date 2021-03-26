const express = require(`express`);
const error = require(`../middleware/error`);

// Master
const bahan = require('../routes/masters/bahan');
const barang = require('../routes/masters/barang');
const batu = require('../routes/masters/batu');
const brand = require('../routes/masters/brand');
const customer = require('../routes/masters/customer');
const cuttingBatu = require('../routes/masters/cutting-batu');
const design = require('../routes/masters/design');
const divisi = require('../routes/masters/divisi');
const jenis = require('../routes/masters/jenis');
const jenisBahan = require('../routes/masters/jenis-bahan');
const jenisBatu = require('../routes/masters/jenis-batu');
const kondisi = require('../routes/masters/kondisi');
const marketing = require('../routes/masters/marketing');
const staff = require('../routes/masters/staff');
const stamp = require('../routes/masters/stamp');
const ukuran = require('../routes/masters/ukuran');
const user = require('../routes/masters/user');
const warna = require('../routes/masters/warna');

// Transaksi
const admHancur = require('../routes/transactions/adm-hancur');
const admKirimTambahan = require('../routes/transactions/adm-kirim-tambahan');
const admMutasiBatu = require('../routes/transactions/adm-mutasi-batu');
const gudangQC = require('../routes/transactions/gudang-qc');
const kirimJO = require('../routes/transactions/kirim-jo');
const mutasiBatu = require('../routes/transactions/mutasi-batu');
const po = require('../routes/transactions/po');
const produksi = require('../routes/transactions/produksi');
const saldoMurni = require('../routes/transactions/saldo-murni');
const saldoBahan = require('../routes/transactions/saldo-bahan');
const terimaJO = require('../routes/transactions/terima-jo');
const wax = require('../routes/transactions/wax');

// Report
const admCardJO = require('../routes/reports/adm-card-jo');
const admGabungan = require('../routes/reports/adm-gabungan');

// Tools
// const tools = require('../routes/utility/tools');

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
  app.use('/api/barang', barang);
  app.use('/api/batu', batu);
  app.use('/api/brand', brand);
  app.use('/api/customer',customer);
  app.use('/api/cutting-batu', cuttingBatu);
  app.use('/api/design', design);
  app.use('/api/divisi', divisi);
  app.use('/api/jenis', jenis);
  app.use('/api/jenis-bahan', jenisBahan);
  app.use('/api/jenis-batu', jenisBatu);
  app.use('/api/kondisi', kondisi);
  app.use('/api/marketing', marketing);
  app.use('/api/staff', staff);
  app.use('/api/stamp', stamp);
  app.use('/api/ukuran', ukuran);
  app.use('/api/user', user);
  app.use('/api/warna', warna);

  // Transaksi
  app.use('/api/adm-hancur', admHancur);
  app.use('/api/adm-kirim-tambahan', admKirimTambahan);
  app.use('/api/adm-mutasi-batu', admMutasiBatu);
  app.use('/api/gudang-qc', gudangQC);
  app.use('/api/kirim-jo', kirimJO);
  app.use('/api/mutasi-batu', mutasiBatu);
  app.use('/api/po', po);
  app.use('/api/produksi', produksi);
  app.use('/api/saldo-bahan', saldoBahan);
  app.use('/api/saldo-murni', saldoMurni);
  app.use('/api/terima-jo', terimaJO);
  app.use('/api/wax', wax);

  // Report
  app.use('/api/adm-card-jo', admCardJO);
  app.use('/api/adm-gabungan', admGabungan);

  // Tools
  // app.use('/api/tools', tools);

  app.use(error);
}