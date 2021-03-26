const mongoose = require('mongoose');

async function deleteBahan(session, dataUser, dataParams) {
    const chainType = await ChainType.findOneAndRemove({
        chain_type_code: encryptText(dataParams.chain_type_code)
    }, { session: session });
    if (!chainType) return [404, `Data Chain Type tidak di temukan!`];

    return [200, "Delete data Chain Type berhasil!"];
}

exports.deleteBahan = deleteBahan;

