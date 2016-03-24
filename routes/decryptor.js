/**
 * Created by jason on 2016/3/24.
 */

var cipher = require('../lib/cipher');

exports.decrypt = function (req, res, next) {
    if (req.method === 'GET') {
        if (typeof req.query !== 'undefined' && req.query !== null) {
            for (var key in req.query) {
                req.query[key] = cipher.aesDecrypt(req.query[key]);
            }
        }
    } else if (req.method === 'POST') {
        if (typeof req.body !== 'undefined' && req.body !== null) {
            for (var key in req.body) {
                req.body[key] = cipher.aesDecrypt(req.body[key]);
            }
        }
    }
    next();
};
