var qiniu = require('qiniu');
var config = require('../config.json');

qiniu.conf.ACCESS_KEY = config.qiniuAccessKey;
qiniu.conf.SECRET_KEY = config.qiniuSecretKey;


var client = new qiniu.rs.Client();

var TYPE = {
    qiniu : 76
};
exports.dfsType = TYPE;

exports.getDefaultDfsType = function() {
    return TYPE.qiniu;
};

exports.genPublicUploadToken = function(type, key) {
    if (!key) {
        return null;
    }
    if (type === TYPE.qiniu) {
        var putPolicy = new qiniu.rs.PutPolicy(config.dfsPublicBucket + ':' + key);
        return putPolicy.token();
    } else {
        return null;
    }
};

exports.genSecretUploadToken = function(type, key) {
    if (!key) {
        return null;
    }
    if (type === TYPE.qiniu) {
        var putPolicy = new qiniu.rs.PutPolicy(config.dfsSecretBucket + ':' + key);
        //putPolicy.returnUrl = '';// 通常用于HTML Form上传
        //putPolicy.returnBody = '{"key": $(key), "hash": $(etag), "w": $(imageInfo.width), "h": $(imageInfo.height)}';
        //putPolicy.callbackUrl = 'http://your.domain.com/callback';
        //putPolicy.callbackBody = 'filename=$(fname)&filesize=$(fsize)';
        return putPolicy.token();
    } else {
        return null;
    }
};

exports.genSecretDownloadUr = function(type, key) {
    if (!key) {
        return null;
    }
    if (type === TYPE.qiniu) {
        var baseUrl = config.dfsSecretDomain + key;
        var policy = new qiniu.rs.GetPolicy();
        return policy.makeRequest(baseUrl);
    } else {
        return null;
    }
};

exports.deleteSecret = function(type, key, callback) {
    if (!key) {
        callback('error! key is null!', key);
    }
    if (type === TYPE.qiniu) {
        client.remove(config.dfsSecretBucket, key, function (err, ret) {
            if (callback)
                callback(err, key);
        });
    } else {
        if (callback)
            callback('error! type illegal!', key);
    }
};

exports.deletePublic = function(type, key, callback) {
    if (!key) {
        callback('error! key is null!', key);
    }
    if (type === TYPE.qiniu) {
        client.remove(config.dfsPublicBucket, key, function (err, ret) {
            if (callback)
                callback(err, key);
        });
    } else {
        if (callback)
            callback('error! type illegal!', key);
    }
};