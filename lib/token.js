/**
 * Created by jason on 2016/3/9.
 */

var cipher = require("./cipher");
var cache = require('./cache');

var EXIST_TIME = 24 * 60 * 60 * 1000;

function generateToken(userId) {
    return cipher.md5(userId, [Date.now(), Math.random()]);
}

exports.createToken = function(userId) {
    if (!userId)
        return null;
    var token = generateToken(userId);
    cache.put(userId, token, EXIST_TIME);
    return token;
};

exports.removeToken = function (userId) {
    cache.del(userId);
};

exports.getToken = function(userId) {
    return cache.get(userId);
};

exports.updateToken = function(userId) {
    var token = exports.getToken(userId);
    if (token) {
        cache.put(userId, token, EXIST_TIME);
    }
};