const crypto = require("crypto")
const data = require('./data')

decrypt(data)

async function decrypt (data) {
    const aesKey = await decryptStringWithRsaPrivateKey(data.encryptedKey, data.privateKey)
    const result = await decryptStringWithAesKey(data.encryptedData, aesKey)
    console.log(result)
}

async function decryptStringWithRsaPrivateKey(toDecrypt, privateKey) {
    var buffer = Buffer.from(toDecrypt, "base64");
    var decrypted = crypto.privateDecrypt(privateKey, buffer);
    return decrypted.toString();
};

async function decryptStringWithAesKey(text, pass) {
    var decipher = crypto.createDecipher("aes-256-ctr", pass)
    var dec = decipher.update(text, 'hex', 'utf8')
    dec += decipher.final('utf8');
    return dec;
}