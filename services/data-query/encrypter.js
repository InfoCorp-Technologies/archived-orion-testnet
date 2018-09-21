let forge = require('node-forge');

module.exports = {
    /**
     * @param {*} publicKey
     * @param {string} input
     * @returns {boolean|string} an encrypted string
     */
    rsaEncrypt: function (publicKey, input) {
        try {
            return publicKey.encrypt(input);
        } catch (e) {
            return false;
        }
    },
    /**
     * @param {*} privateKey
     * @param {string} input
     * @returns {boolean|string}
     */
    rsaDescrypt: function (privateKey, input) {
        try {
            return privateKey.decrypt(input);
        } catch (e) {
            return false;
        }
    },
    /**
     * @param {string} key a hexadecimal string.
     * @param {string} iv a hexadecimal string.
     * @param {string} input
     * @returns {boolean|string} a hexadecimal string
     */
    aesEncrypt: function (key, iv, input) {
        let cipher = forge.cipher.createCipher('AES-CBC', key);
        cipher.start({iv: iv});
        cipher.update(forge.util.createBuffer(input));
        if (cipher.finish()) {
            return cipher.output.data;
        } else {
            return false;
        }
    },

    /**
     * @param {string} key a hexadecimal string
     * @param {string} iv a hexadecimal string
     * @param {string} encrypted a hexadecimal string
     * @returns {boolean|string}
     */
    aesDecrypt: function (key, iv, encrypted) {
        let decipher = forge.cipher.createDecipher('AES-CBC', key);
        decipher.start({iv: iv});
        decipher.update(forge.util.createBuffer(encrypted));
        if (decipher.finish()) {
            return decipher.output.toString();
        } else {
            return false;
        }
    }
};
