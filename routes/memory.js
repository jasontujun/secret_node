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
router.post('/add', decryptor.decrypt, users.checkTokenPost, function(req, res, next) {
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
router.get('/delete', decryptor.decrypt, users.checkTokenGet, function(req, res, next) {
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
router.post('/send', decryptor.decrypt, users.checkTokenPost, function(req, res, next) {
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
router.post('/receive', decryptor.decrypt, users.checkTokenPost, function(req, res, next) {
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
router.get('/inbox', decryptor.decrypt, users.checkTokenGet, function(req, res, next) {
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
router.get('/list', decryptor.decrypt, users.checkTokenGet, function(req, res, next) {
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
router.get('/detail', decryptor.decrypt, users.checkTokenGet, function(req, res, next) {
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
 * 添加secret
 */
router.post('/secret/add', decryptor.decrypt, users.checkTokenPost, function(req, res, next) {
    var userId = req.body.uid;
    var memoryId = req.body.mid;
    var secret = {
        url : req.body.surl,
        size : req.body.ss,
        width : req.body.sw,
        height : req.body.sh
    };
    dao.addSecretToMemory(memoryId, userId, secret, function (err, secretId) {
        if (err) {
            res.status(500)
                .set('err', err)
                .send('error! err=' + err);
            return;
        }
        res.send(JSON.stringify({sid : secretId}));
    });
});

/**
 * 删除secret
 */
router.get('/secret/delete', decryptor.decrypt, users.checkTokenGet, function(req, res, next) {
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
router.post('/secret/order', decryptor.decrypt, users.checkTokenPost, function(req, res, next) {
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

module.exports = router;