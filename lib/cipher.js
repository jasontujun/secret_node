/**
 * Created by jason on 2016/3/24.
 */

var crypto = require('crypto');

var ALGORITHM = 'aes-128-ecb';
var CLEAR_ENCODING = 'utf8';
var CIPHER_ENCODING = 'hex';

exports.aesEncrypt = function (data, key) {
    if (typeof data !== 'string' || data.length === 0) {
        return data;
    }
    try {
        var cipher = crypto.createCipheriv(ALGORITHM, key, '');
        cipher.setAutoPadding(true);
        return cipher.update(data, CLEAR_ENCODING, CIPHER_ENCODING) + cipher.final('hex');
    } catch(e){
        return undefined;
    }
};

exports.aesDecrypt = function (encrypted, key) {
    if (typeof encrypted !== 'string' || encrypted.length === 0) {
        return encrypted;
    }
    try {
        var decipher = crypto.createDecipheriv(ALGORITHM, key, '');
        decipher.setAutoPadding(true);
        return decipher.update(encrypted, CIPHER_ENCODING, CLEAR_ENCODING) + decipher.final('utf8');
    } catch(e){
        return undefined;
    }
};

exports.md5 = function (data, salt) {
    if (typeof data !== 'string' || data.length === 0) {
        return undefined;
    }
    var str = data;
    if (typeof salt === 'string') {
        str = str + salt;
    } else if (salt instanceof Array) {
        for (var i = 0; i < salt.length; i++) {
            str = str + salt[i];
        }
    }
    return crypto.createHash("md5").update(str, 'utf8').digest("hex");
};