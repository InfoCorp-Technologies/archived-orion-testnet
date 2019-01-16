const crypto = require('crypto')
const alert = require("./alert")

var lib = module.exports = {
    
    /**
     * 
     * @param {*} _len 
     */
    random_value_hex: function (_len) {
        try {
            const pass = crypto.randomBytes(_len)
                .toString('hex')
                .slice(0, _len).toUpperCase()
            return pass
        } catch (error) {
            alert.error(`catched on randomValueHex(${_len})`, error)
        }
    },
    
    /**
     * @function symetric AES encrypt _data with _pass and returns the
     * data string encrypted
     * @param {*} _data 
     * @param {*} _pass 
     */
    aes_encrypt: function (_data, _pass, _iv) {
        try {
            var cipher = crypto.createCipheriv("aes-256-ctr", _pass, _iv)
            var encrypted = cipher.update(_data, 'utf8', 'hex')
            encrypted += cipher.final('hex');
            return encrypted;
        } catch (error) {
            alert.error(`catched on AESencrypt(_data, _pass)`, error)
        }
    },
    
    /**
     * @function asymetric RSA encrypt _data with _pubkey, and returns
     * the data string encrypted
     * @param {*} _data 
     * @param {*} _pubkey 
     */
    rsa_encrypt:function (_data, _pubkey) {
        try {
            var buffer = Buffer.from(_data);
            var encrypted = crypto.publicEncrypt(_pubkey, buffer);
            return encrypted.toString("base64");
        } catch (error) {
            alert.error(`catched on RSAencrypt(_data, _pubkey)`, error)
        }
    },

    /**
     * @function Hybrid encryption, generates random pwd for simmetrically encrypt
     * _data, assimetrically encripts pwd with _pubKey
     * @param {*} _data 
     * @param {*} _pubKey 
     * @returns {object} {encryptedPass, encryptedData}
     */
    hybrid_encryption: function (_data, _pubKey) {
        try {
            const pass = lib.random_value_hex(32)
            const iv = lib.random_value_hex(16)            
            const encryptedData = lib.aes_encrypt(_data, pass, iv)
            const encryptedPass = lib.rsa_encrypt(pass, _pubKey)
            const encryptedIv = lib.rsa_encrypt(iv, _pubKey)
            const jsonDataEncrypted = {
                encryptedPass,
                encryptedIv,
                encryptedData,
            };          
            alert.success(
                `hybrid_encryption(${_data.substring(0,35)}...} , ` +
                `${_pubKey.substring(1,27)}\\n` +
                `${_pubKey.substring(29,35)}...` +
                `${_pubKey.substring(777,813)})`,
                `{encryptedPass: ` +
                `${jsonDataEncrypted.encryptedPass.substring(0,10)}... ,` +
                `{encryptedIv: ` +
                `${jsonDataEncrypted.encryptedIv.substring(0,10)}... ,` +
                ` encryptedData: ` +
                `${jsonDataEncrypted.encryptedData.substring(0,10)}... }`
            )
            return jsonDataEncrypted
        } catch (error) {
            alert.error(
                `catched on hybrid_encryption(${_data.substring(0,35)}... , ` +
                `${_pubKey.substring(1,27)}\\n` +
                `${_pubKey.substring(29,35)} ... ` +
                `${_pubKey.substring(777,813)})`, error
            )
            return null
        }
    },

    /**
     * @function decrypt data encrypted using hybrid encryption system
     * @param {*} _encryptedData 
     * @param {*} _encryptedPass 
     * @param {*} _privateKey 
     */
    hybrid_decrypt: function  (_encryptedData, _encryptedPass, _encryptedIv, _privateKey) {
        try {
            const password = lib.asymmetric_decrypt(_encryptedPass, _privateKey)
            const iv = lib.asymmetric_decrypt(_encryptedIv, _privateKey)
            const result = lib.symmetric_decrypt(_encryptedData, password, iv)
            alert.success(`hybrid_decrypt(`+
            `encryptedData, encryptedPass, encryptedIv, privatekey)`, result)
            return result
        } catch (error) {
            alert.error(`hybrid_decrypt(`+
            ` encryptedData: ${_encryptedData.substring(0,10)}... )`+
            `encryptedPass: ${_encryptedPass.substring(0,10)}... ,` +
            `encryptedIv: ${_encryptedIv.substring(0,10)}... ,` +
            `privatekey: ${_privateKey.substring(0,30)})`, error)
        }
    },
    
    /**
     * @function Decrypt data encrypted using asymmetric encryption
     * @param {*} _encryptedData 
     * @param {*} _privateKey 
     */
    asymmetric_decrypt: function (_encryptedData, _privateKey) {
        var buffer = Buffer.from(_encryptedData, "base64");
        var decrypted = crypto.privateDecrypt(_privateKey, buffer);
        return decrypted.toString();
    },

    /**
     * @function Decrypt data encrypted using symmetric encryption
     * @param {*} _data 
     * @param {*} _password 
     */
    symmetric_decrypt: function (_data, _password, _iv) {
        var decipher = crypto.createDecipheriv("aes-256-ctr", _password, _iv)
        var dec = decipher.update(_data, 'hex', 'utf8')
        dec += decipher.final('utf8');
        return dec;
    }
}

