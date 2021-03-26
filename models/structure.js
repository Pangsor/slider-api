const Table_Schema = [
  {
// tm_voucher
    "table_name" : "tm_voucher",
    "table_schema" : `CREATE TABLE IF NOT EXISTS tm_voucher (
      kode_kelompok VARCHAR(10), 
      nama_voucher VARCHAR(60), 
      type_voucher VARCHAR(30), 
      type_pot VARCHAR(30), 
      nominal INT(11), 
      deskripsi VARCHAR(255), 
      type_syarat VARCHAR(20), 
      syarat INT(11), 
      point INT(11), 
      status_active VARCHAR(10), 
      date_start DATETIME DEFAULT'2001-01-01 01:01:01', 
      date_end DATETIME DEFAULT'2001-01-01 01:01:01', 
      date_change DATETIME DEFAULT'2001-01-01 01:01:01', 
      PRIMARY KEY (kode_kelompok)) 
      ENGINE = InnoDB CHARSET=utf8 COLLATE utf8_general_ci`
  },
  {
// tm_voucher_customer
    "table_name" : "tm_voucher_customer",
    "table_schema" : `CREATE TABLE IF NOT EXISTS tm_voucher_customer (
      no_trx VARCHAR(20), 
      kode_kelompok VARCHAR(20),
      kode_customer VARCHAR(20),
      kode_voucher VARCHAR(20),
      nama_voucher VARCHAR(60),
      type_voucher VARCHAR(30),
      type_pot VARCHAR(30),
      nominal INT(11),
      deskripsi VARCHAR(255),
      type_syarat VARCHAR(20),
      syarat INT(11),
      point INT(11),
      status_active VARCHAR(10),
      date_start DATETIME DEFAULT'2001-01-01 01:01:01',
      date_end DATETIME DEFAULT'2001-01-01 01:01:01',
      date_change DATETIME DEFAULT'2001-01-01 01:01:01', 
    PRIMARY KEY (no_trx), UNIQUE kode_voucher (kode_voucher), INDEX kode(kode_customer, kode_kelompok)) 
    ENGINE = InnoDB CHARSET=utf8 COLLATE utf8_general_ci`
  },
  {
// tt_voucher
    "table_name" : "tt_voucher",
    "table_schema" : `CREATE TABLE IF NOT EXISTS tt_voucher (
      no_trx VARCHAR(20), 
      kode_kelompok VARCHAR(20),
      kode_customer VARCHAR(20),
      kode_voucher VARCHAR(20),
      nama_voucher VARCHAR(60),
      type_voucher VARCHAR(30),
      type_pot VARCHAR(30),
      nominal INT(11),
      deskripsi VARCHAR(255),
      type_syarat VARCHAR(20),
      syarat INT(11),
      point INT(11),
      status_active VARCHAR(10),
      date_start DATETIME DEFAULT'2001-01-01 01:01:01',
      date_end DATETIME DEFAULT'2001-01-01 01:01:01',
      date_change DATETIME DEFAULT'2001-01-01 01:01:01', 
    PRIMARY KEY (no_trx), UNIQUE kode_voucher (kode_voucher), INDEX kode(kode_customer, kode_kelompok)) 
    ENGINE = InnoDB CHARSET=utf8 COLLATE utf8_general_ci`
  },
  {
// tt_mutasi_head
    "table_name" : "tt_mutasi_head",
    "table_schema" : `CREATE TABLE IF NOT EXISTS tt_mutasi_head (
      no_mutasi VARCHAR(20),
      tanggal_mutasi DATE DEFAULT'2001-01-01',
      tanggal_validasi DATETIME DEFAULT'2001-01-01 01:01:01',
      PRIMARY KEY (no_mutasi)
    ) ENGINE = InnoDB CHARSET=utf8 COLLATE utf8_general_ci`
  },
  {
// tt_mutasi_detail
    "table_name" : "tt_mutasi_detail",
    "table_schema" : `CREATE TABLE IF NOT EXISTS tt_mutasi_detail (
      no_mutasi VARCHAR(20),
      no_urut INT(5),
      kode_barang VARCHAR(20),
      kode_barcode VARCHAR(20),
      nama_barang VARCHAR(60),
      qty_kirim DOUBLE(15,0),
      satuan_kirim VARCHAR(10),
      PRIMARY KEY (no_mutasi, kode_barang)
    ) ENGINE = InnoDB CHARSET=utf8 COLLATE utf8_general_ci`
  },
  {
// tt_mutasi_out_head
    "table_name" : "tt_mutasi_out_head",
    "table_schema" : `CREATE TABLE IF NOT EXISTS tt_mutasi_out_head (
      no_mutasi VARCHAR(20),
      tanggal_mutasi DATETIME DEFAULT'2001-01-01 01:01:01',
      PRIMARY KEY (no_mutasi)
    ) ENGINE = InnoDB CHARSET=utf8 COLLATE utf8_general_ci`
  },
  {
// tt_mutasi_out_detail
    "table_name" : "tt_mutasi_out_detail",
    "table_schema" : `CREATE TABLE IF NOT EXISTS tt_mutasi_out_detail (
      no_mutasi VARCHAR(20),
      no_urut INT(5),
      kode_barang VARCHAR(20),
      kode_barcode VARCHAR(20),
      nama_barang VARCHAR(60),
      qty_ambil DOUBLE(15,0),
      satuan_ambil VARCHAR(10),
      PRIMARY KEY (no_mutasi, kode_barang)
    ) ENGINE = InnoDB CHARSET=utf8 COLLATE utf8_general_ci`
  },
  {
// tm_varian_barang
    "table_name" : "tm_varian_barang",
    "table_schema" : `CREATE TABLE IF NOT EXISTS tm_varian_barang (
      kode_varian VARCHAR(20),
      kode_barang VARCHAR(20),
      input_by VARCHAR(30),
      input_date DATETIME DEFAULT'2001-01-01 01:01:01',
      edit_by VARCHAR(30),
      edit_date DATETIME DEFAULT'2001-01-01 01:01:01',
      PRIMARY KEY (kode_varian, kode_barang)
    ) ENGINE = InnoDB CHARSET=utf8 COLLATE utf8_general_ci`
  }
];

exports.Table_Schema = Table_Schema;