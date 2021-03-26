const cf = require('config');
const encKey = cf.get(`enc_key`);

function nsiAuth(strText) {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).send('Access denied. No token provided.');

  if (token !== cf.get(`nsi_key`)) return res.status(401).send(`Access denied.`);
  next();
}

function EncryptText(strText){
  var strResult = "";
  const arrKey = encKey.split('');
  const arrText = strText.split('');
  var countKey = 0;

  arrText.forEach(element => {
    strResult = strResult + (Number(element.charCodeAt(0)) + Number(arrKey[countKey].charCodeAt(0))).toString(16);
    countKey = Number(countKey) + 1;
    if((Number(countKey) + 1) > Number(arrKey.length)){
      countKey = 1;
    }
  });

  return strResult;
}

function DecryptText(strText){
  var strResult = "";
  const arrKey = encKey.split('');
  const arrText = String(strText).split('');
  var hexText = "";
  var countHex = 0;
  var countKey = 0;

  arrText.forEach(element => {
    hexText = String(hexText) + String(element);
    countHex = Number(countHex) + 1;
    if(countHex == 2){
      strResult = String(strResult) + String(String.fromCharCode(Number(parseInt(hexText, 16)) - Number(String(arrKey[countKey]).charCodeAt(0))));
      countKey = Number(countKey) + 1;
      if((Number(countKey) + 1) > Number(arrKey.length)){
        countKey = 1;
      }
      hexText = "";
      countHex = 0;
    }
  });

  return strResult;
}

exports.EncryptText = EncryptText;
exports.DecryptText = DecryptText;