var qiniu = require("qiniu");

qiniu.conf.ACCESS_KEY = '';
qiniu.conf.SECRET_KEY = '';

var TYPE = {
    qiniu : 76
};

var DOMAIN = 'http://7xsy1k.com1.z0.glb.clouddn.com';
var BUCKET = 'secretmemory';
var client = new qiniu.rs.Client();

exports.dfsType = TYPE;

exports.getDefaultDfsType = function() {
    return TYPE.qiniu;
};

exports.genUploadToken = function(type, key) {
    if (!key) {
        return null;
    }
    if (type === TYPE.qiniu) {
        var putPolicy = new qiniu.rs.PutPolicy(BUCKET + ":" + key);
        //putPolicy.returnUrl = '';// 通常用于HTML Form上传
        //putPolicy.returnBody = '{"key": $(key), "hash": $(etag), "w": $(imageInfo.width), "h": $(imageInfo.height)}';
        //putPolicy.callbackUrl = 'http://your.domain.com/callback';
        //putPolicy.callbackBody = 'filename=$(fname)&filesize=$(fsize)';
        return putPolicy.token();
    } else {
        return null;
    }
};

exports.genDownloadUr = function(type, key) {
    if (!key) {
        return null;
    }
    if (type === TYPE.qiniu) {
        var baseUrl = DOMAIN + "/" + key;
        var policy = new qiniu.rs.GetPolicy();
        return policy.makeRequest(baseUrl);
    } else {
        return null;
    }
};

exports.delete = function(type, key, callback) {
    if (!key) {
        return null;
    }
    if (type === TYPE.qiniu) {
        client.remove(BUCKET, key, function (err, ret) {
            if (err) {
                console.log('[dfs]delete secret error!' + err);
                if (callback)
                    callback(err);
            } else {
                console.log('[dfs]delete secret success!' + ret);
                if (callback)
                    callback(null);
            }
        });
    } else {
        if (callback)
            callback('error! type illegal!');
    }
};