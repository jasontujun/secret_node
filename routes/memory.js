/**
 * Created by jason on 2016/3/3.
 */
var express = require('express');
var dao = require('../lib/dao');
var users = require('./users');
var decryptor = require('./decryptor');
var router = express.Router();

/**
 * 创建memory
 */
router.post('/add', decryptor.decrypt, users.checkToken, function(req, res, next) {
    var userId = req.body.uid;
    var name = req.body.name;
    var happenTime = req.body.ha;
    dao.addMemory(name, userId, happenTime, function (err, memoryId) {
        if (err) {
            res.status(500)
                .set('err', err)
                .send('error! err=' + err);
            return;
        }
        res.send(JSON.stringify({mid : memoryId}));
    });
});

/**
 * 删除memory
 */
router.get('/delete', decryptor.decrypt, users.checkToken, function(req, res, next) {
    var userId = req.query.uid;
    var memoryId = req.query.mid;
    dao.deleteMemory(memoryId, userId, function (err) {
        if (err) {
            res.status(500)
                .set('err', err)
                .send('error! err=' + err);
            return;
        }
        res.send('success!');
    });
});

/**
 * 发送memory
 */
router.post('/send', decryptor.decrypt, users.checkToken, function(req, res, next) {
    var senderId = req.body.uid;
    var memoryId = req.body.mid;
    var receiverId = req.body.rid;
    var receiverName = req.body.rname;
    var receiverDescription = req.body.rdes;
    var question = req.body.question;
    var answer = req.body.answer;
    dao.sendMemory(memoryId, senderId, receiverId,
        receiverName, receiverDescription, question, answer,
        function (err, boxId) {
            if (err) {
                res.status(500)
                    .set('err', err)
                    .send('error! err=' + err);
                return;
            }
            res.send(JSON.stringify({bid : boxId}));
        });
});

/**
 * 确认接收memory
 */
router.post('/receive', decryptor.decrypt, users.checkToken, function(req, res, next) {
    var boxId = req.body.bid;
    var receiverId = req.body.uid;
    var answer = req.body.answer;
    var salt = req.body.sa;
    dao.receiveMemory(boxId, receiverId, answer, salt,
        function (err, memoryId) {
            if (err) {
                res.status(500)
                    .set('err', err)
                    .send('error! err=' + err);
                return;
            }
            res.send(JSON.stringify({mid : memoryId}));
        });
});

/**
 * 获取用户待接收的Memory列表
 */
router.get('/inbox', decryptor.decrypt, users.checkToken, function(req, res, next) {
    var userId = req.query.uid;
    dao.viewMemoryBox(userId, function (err, boxItems) {
            if (err) {
                res.status(500)
                    .set('err', err)
                    .send('error! err=' + err);
                return;
            }
            res.send(JSON.stringify(boxItems));
        });
});

/**
 * 获取用户所有的Memory
 */
router.get('/list', decryptor.decrypt, users.checkToken, function(req, res, next) {
    var userId = req.query.uid;
    dao.getMemoryList(userId, function (err, memorys) {
        if (err) {
            res.status(500)
                .set('err', err)
                .send('error! err=' + err);
            return;
        }
        res.send(JSON.stringify(memorys));
    });
});

/**
 * 获取单个Memory的详情(其所包含的secret列表)
 */
router.get('/detail', decryptor.decrypt, users.checkToken, function(req, res, next) {
    var userId = req.query.uid;
    var memoryId = req.query.mid;
    dao.getMemoryDetail(memoryId, userId, function (err, memory) {
        if (err) {
            res.status(500)
                .set('err', err)
                .send('error! err=' + err);
            return;
        }
        res.send(JSON.stringify(memory));
    });
});

/**
 * 添加secret。
 * 如果参数surl字段不为空，则说明资源url已经存在，不需要后续上传资源文件，只返回：
 * {
 *      sid: secretId
 *  }
 * 如果参数surl字段为空，则说明后续要上传资源文件，会返回：
 * {
 *      sid: secretId，
 *      dfs: dfs供应商类型号(1=qiniu),
 *      up: 上传token凭证
 *  }
 */
router.post('/secret/add', decryptor.decrypt, users.checkToken, function(req, res, next) {
    var userId = req.body.uid;
    var memoryId = req.body.mid;
    var secret = {
        url : req.body.surl,
        size : req.body.ss,
        width : req.body.sw,
        height : req.body.sh,
        mime : req.body.mime
    };
    dao.addSecretToMemory(memoryId, userId, secret, function (err, secretId, dfsType, uploadToken) {
        if (err) {
            res.status(500)
                .set('err', err)
                .send('error! err=' + err);
            return;
        }
        if (dfsType) {
            res.send(JSON.stringify({
                sid: secretId,
                dfs: dfsType,
                up: uploadToken
            }));
        } else {
            res.send(JSON.stringify({
                sid: secretId
            }));
        }
    });
});

/**
 * 删除secret
 */
router.get('/secret/delete', decryptor.decrypt, users.checkToken, function(req, res, next) {
    var userId = req.query.uid;
    var memoryId = req.query.mid;
    var secretId = req.query.sid;
    dao.addSecretToMemory(memoryId, userId, secretId, function (err) {
        if (err) {
            res.status(500)
                .set('err', err)
                .send('error! err=' + err);
            return;
        }
        res.send('success!');
    });
});

/**
 * 调整secret顺序
 */
router.post('/secret/order', decryptor.decrypt, users.checkToken, function(req, res, next) {
    var userId = req.body.uid;
    var memoryId = req.body.mid;
    var order = req.body.order;
    dao.orderSecret(memoryId, userId, order, function (err) {
        if (err) {
            res.status(500)
                .set('err', err)
                .send('error! err=' + err);
            return;
        }
        res.send('success!');
    });
});

/**
 * 获取secret资源上传的token。
 * 主要用于上传过程中断点续传的情形，重新获取上传token。
 */
router.get('/secret/uptoken', function(req, res, next) {
    var userId = req.query.uid;
    var memoryId = req.query.mid;
    var secretId = req.query.sid;
    dao.getSecretUploadToken(memoryId, userId, secretId, function(err, token) {
        if (err) {
            res.status(500)
                .set('err', err)
                .send('error! err=' + err);
            return;
        }
        res.send(JSON.stringify({token : token}));
    });
});

/**
 * 获取文件下载的url。
 */
router.get('/secret/downurl', function(req, res, next) {
    var memoryId = req.query.mid;
    var secretId = req.query.sid;
    dao.getSecretDownloadUrl(memoryId, secretId, function(err, url) {
        if (err) {
            res.status(500)
                .set('err', err)
                .send('error! err=' + err);
            return;
        }
        res.send(JSON.stringify({url : url}));
    });
});

/**
 * TODO dfs供应商的回调接口。
 */
router.get('/secret/callback', function(req, res, next) {
    var sid = req.query.sid;
    var dfs = req.query.dfs;
});

module.exports = router;