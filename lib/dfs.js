var qiniu = require("qiniu");

qiniu.conf.ACCESS_KEY = '29tBiMnDU4dwqlHlM8Zmnvo3uTMcz0jw1pZkesKh';
qiniu.conf.SECRET_KEY = 'AqqRMIg1jMmOCAJoyTr4EseeSf18vpDx-k1j_vUP';

var TYPE = {
    qiniu : 76
};

var DOMAIN = 'http://7xsy1k.com1.z0.glb.clouddn.com';
var BUCKET_SECRET = 'secretmemory-secret';
var BUCKET_PUBLIC = 'secretmemory-public';
var client = new qiniu.rs.Client();

exports.dfsType = TYPE;

exports.getDefaultDfsType = function() {
    return TYPE.qiniu;
};

exports.genPublicUploadToken = function(type, key) {
    if (!key) {
        return null;
    }
    if (type === TYPE.qiniu) {
        var putPolicy = new qiniu.rs.PutPolicy(BUCKET_PUBLIC + ":" + key);
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
        var putPolicy = new qiniu.rs.PutPolicy(BUCKET_SECRET + ":" + key);
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
        var baseUrl = DOMAIN + "/" + key;
        var policy = new qiniu.rs.GetPolicy();
        return policy.makeRequest(baseUrl);
    } else {
        return null;
    }
};

exports.delete = function(type, key, callback) {
    if (!key) {
        callback('error! key is null!');
    }
    if (type === TYPE.qiniu) {
        client.remove(BUCKET_SECRET, key, function (err, ret) {
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