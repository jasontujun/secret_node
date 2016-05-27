/**
 * Created by jason on 2016/3/3.
 */
var express = require('express');
var dao = require('../lib/dao');
var users = require('./users');
var router = express.Router();

/**
 * 创建memory
 */
router.post('/add', users.checkToken, function(req, res, next) {
    var userId = req.body.uid;
    var name = req.body.name;
    var happenTime = req.body.ha;
    dao.addMemory(name, userId, happenTime, function (err, memory) {
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
 * 删除memory
 */
router.post('/delete', users.checkToken, function(req, res, next) {
    var userId = req.body.uid;
    var memoryId = req.body.mid;
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
router.post('/send', users.checkToken, function(req, res, next) {
    var senderId = req.body.uid;
    var memoryId = req.body.mid;
    var receiverId = req.body.rid;
    var receiverName = req.body.rname;
    var receiverDescription = req.body.rdes;
    var question = req.body.question;
    var answer = req.body.answer;
    var scope = req.body.scope;
    var takeTime = req.body.take;
    dao.sendMemory(memoryId, senderId, receiverId, receiverName,
        receiverDescription, question, answer, scope, takeTime,
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
router.post('/receive', users.checkToken, function(req, res, next) {
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
 * 获取用户待接收的Memory列表。
 * 包括私密范围Memory和公开范围Memory。
 * 返回{ pa:私密范围Memory, pb:公开范围Memory}
 */
router.post('/inbox', users.checkToken, function(req, res, next) {
    var userId = req.body.uid;
    dao.viewMemoryBox(userId, dao.SCOPE.PRIVATE, function (err, privateBoxItems) {
        if (err) {
            res.status(500)
                .set('err', err)
                .send('error! err=' + err);
            return;
        }
        dao.viewMemoryBox(userId, dao.SCOPE.PUBLIC, function (err, publicBoxItems) {
            if (err) {
                res.status(500)
                    .set('err', err)
                    .send('error! err=' + err);
                return;
            }
            res.send(JSON.stringify({pa: privateBoxItems, pb: publicBoxItems}));
        });
    });
});

/**
 * 获取用户所有的Memory
 */
router.post('/list', users.checkToken, function(req, res, next) {
    var userId = req.body.uid;
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
router.post('/detail', users.checkToken, function(req, res, next) {
    var userId = req.body.uid;
    var memoryId = req.body.mid;
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
router.post('/secret/add', users.checkToken, function(req, res, next) {
    var userId = req.body.uid;
    var memoryId = req.body.mid;
    var secret = {
        url : req.body.surl,
        size : req.body.ss,
        width : req.body.sw,
        height : req.body.sh,
        mime : req.body.mime
    };
    dao.addSecretToMemory(memoryId, userId, secret,
        function (err, secretId, dfsType, key, token) {
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
                    key : key,
                    token: token
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
router.post('/secret/delete', users.checkToken, function(req, res, next) {
    var userId = req.body.uid;
    var memoryId = req.body.mid;
    var secretId = req.body.sid;
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
router.post('/secret/order', users.checkToken, function(req, res, next) {
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
router.post('/secret/uptoken', users.checkToken, function(req, res, next) {
    var userId = req.body.uid;
    var memoryId = req.body.mid;
    var secretId = req.body.sid;
    dao.getSecretUploadToken(memoryId, userId, secretId, function(err, token, key) {
        if (err) {
            res.status(500)
                .set('err', err)
                .send('error! err=' + err);
            return;
        }
        res.send(JSON.stringify({token : token, key : key}));
    });
});



/**
 * 获取文件下载的url。
 */
router.post('/secret/downurl', users.checkToken, function(req, res, next) {
    var memoryId = req.body.mid;
    var secretId = req.body.sid;
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
 * dfs供应商的回调接口。
 */
router.post('/secret/callback', users.checkToken, function(req, res, next) {
    var userId = req.body.uid;
    var memoryId = req.body.mid;
    var secretId = req.body.sid;
    var key = req.body.key;
    var dfs = req.body.dfs;
    dao.secretUploadFinish(secretId, memoryId, userId, dfs, key, function(err) {
        if (err) {
            res.status(500)
                .set('err', err)
                .send('error! err=' + err);
            return;
        }
        res.send('success!');
    })
});

module.exports = router;