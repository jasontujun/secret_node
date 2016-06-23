/**
 * Created by jason on 2016/3/3.
 */
var express = require('express');
var dao = require('../lib/dao');
var users = require('./users');
var router = express.Router();

/**
 * 获取Memory封面图片的上传token。
 * 返回：
 * {
 *      dfs: dfs供应商类型号(76=qiniu),
 *      token: 上传token凭证
 *      key: 上传文件的key值
 *  }
 */
router.post('/cover/uptoken', users.checkToken, function(req, res, next) {
    var userId = req.body.uid;
    var memoryId = req.body.mid;
    dao.uploadMemoryCover(userId, memoryId, function (err, dfsType, key, token) {
        if (err) {
            res.status(500)
                .set('err', err)
                .send('error! err=' + err);
            return;
        }
        res.send(JSON.stringify({dfs : dfsType, token : token, key : key}));
    });
});

/**
 * 创建memory
 */
router.post('/add', users.checkToken, function(req, res, next) {
    var userId = req.body.uid;
    var memory = {
        name : req.body.name,
        happen_start_time : req.body.hstart,
        happen_end_time : req.body.hend,
        cover_url : req.body.curl,
        cover_width : req.body.cw,
        cover_height : req.body.ch
    };
    dao.addMemory(userId, memory, function (err, memory) {
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
 * 更新Memory数据。可更新字段包括：
 *  name,
 *  cover_url + cover_width + cover_height,
 *  happen_start_time + happen_end_time,
 *  heritage
 */
router.post('/update', users.checkToken, function(req, res, next) {
    var userId = req.body.uid;
    var memoryId = req.body.mid;
    var info = {
        name : req.body.name,
        happen_start_time : req.body.hstart,
        happen_end_time : req.body.hend,
        cover_url : req.body.curl,
        cover_width : req.body.cw,
        cover_height : req.body.ch,
        heritage : req.body.heritage
    };
    dao.updateMemory(userId, memoryId, info, function(err) {
        if (err) {
            res.status(500)
                .set('err', err)
                .send('error! err=' + err);
            return;
        }
        res.status(200).send('success!');
    });
});

/**
 * 发送memory
 */
router.post('/post', users.checkToken, function(req, res, next) {
    var senderId = req.body.uid;
    var memoryId = req.body.mid;
    var receiverId = req.body.rid;
    var receiverName = req.body.rname;
    var receiverDescription = req.body.rdes;
    var question = req.body.question;
    var answer = req.body.answer;
    var scope = req.body.scope;
    var receiveTime = req.body.future;
    dao.postMemory(memoryId, senderId, receiverId, receiverName,
        receiverDescription, question, answer, scope, receiveTime,
        function (err, giftId) {
            if (err) {
                res.status(500)
                    .set('err', err)
                    .send('error! err=' + err);
                return;
            }
            res.send(JSON.stringify({gid : giftId}));
        });
});

/**
 * 确认接收memory
 */
router.post('/receive', users.checkToken, function(req, res, next) {
    var giftId = req.body.gid;
    var receiverId = req.body.uid;
    var answer = req.body.answer;
    var salt = req.body.sa;
    dao.receiveMemory(giftId, receiverId, answer, salt,
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
 * 接收者拒绝memory
 */
router.post('/reject', users.checkToken, function(req, res, next) {
    var giftId = req.body.gid;
    var receiverId = req.body.uid;
    dao.rejectMemory(giftId, receiverId, function (err) {
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
 * 赠送者撤销memory
 */
router.post('/cancel', users.checkToken, function(req, res, next) {
    var giftId = req.body.gid;
    var senderId = req.body.uid;
    dao.cancelMemory(giftId, senderId, function (err) {
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
 * 获取用户待接收的Memory列表。
 * 包括私密范围Memory和公开范围Memory。
 * 返回{ pa:私密范围Memory, pb:公开范围Memory}
 */
router.post('/in', users.checkToken, function(req, res, next) {
    var userId = req.body.uid;
    dao.getMemoryGift(userId, dao.SCOPE.PRIVATE, function (err, privateGiftItems) {
        if (err) {
            res.status(500)
                .set('err', err)
                .send('error! err=' + err);
            return;
        }
        dao.getMemoryGift(userId, dao.SCOPE.PUBLIC, function (err, publicGiftItems) {
            if (err) {
                res.status(500)
                    .set('err', err)
                    .send('error! err=' + err);
                return;
            }
            res.send(JSON.stringify({pa: privateGiftItems, pb: publicGiftItems}));
        });
    });
});

/**
 * 获取用户所拥有的Memory列表(不包括待接收的)。
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
 * 获取单个Memory的详情。
 * 如果获取成功，返回结果{
 *      secrets : [...],// secrets内容
 *      gifts : [...]// 赠送记录
 * }
 */
router.post('/detail', users.checkToken, function(req, res, next) {
    var userId = req.body.uid;
    var memoryId = req.body.mid;
    dao.getMemoryDetail(memoryId, userId,
        function (err, secrets, gifts) {
            if (err) {
                res.status(500)
                    .set('err', err)
                    .send('error! err=' + err);
                return;
            }
            var detail = {};
            detail.secrets = secrets;
            if (gifts) {
                detail.gifts = gifts;
            }
            res.send(JSON.stringify(detail));
        });
});

/**
 * 批量添加secret。
 * secret字段为json数组字符串。
 * secret = [{
        url : 第三方公开资源文件的url,
        order : 在所属memory中的索引位置,
        size : 资源文件大小,
        width : 资源文件宽度(主要针对图片类型),
        height : 资源文件高度(主要针对图片类型),
        mime : 资源文件的mime类型
    }, ...]
 * 如果secret对象的url字段不为空，则说明资源url已经存在，不需要后续上传资源文件，只返回：
 * {
 *      sid: secretId
 *  }
 * 如果secret对象的url字段为空，则说明后续要上传资源文件，会返回：
 * {
 *      sid: secretId，
 *      dfs: dfs供应商类型号(76=qiniu),
 *      token: 上传token凭证
 *      key: 上传文件的key值
 *  }
 */
router.post('/secret/add', users.checkToken, function(req, res, next) {
    var userId = req.body.uid;
    var memoryId = req.body.mid;
    var secretStr = req.body.secret;
    dao.addSecretToMemory(memoryId, userId, secretStr,
        function (err, list) {
            if (err) {
                res.status(500)
                    .set('err', err)
                    .send('error! err=' + err);
                return;
            }
            res.send(JSON.stringify(list));
        });
});

/**
 * 删除secret
 */
router.post('/secret/delete', users.checkToken, function(req, res, next) {
    var userId = req.body.uid;
    var memoryId = req.body.mid;
    var secretId = req.body.sid;
    dao.deleteSecretFromMemory(memoryId, userId, secretId, function (err) {
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