var express = require('express');
var dao = require('../lib/dao');
var token = require('../lib/token');
var cipher = require('../lib/cipher');
var decryptor = require('./decryptor');
var router = express.Router();

var COMMON_ERROR_PARAM_ILLEGAL = -111;
var USER_ERROR_TOKEN_CHECK = -201;
var USER_ERROR_TOKEN_CREATE = -202;
var USER_ERROR_DUP_LOGIN = -211;
var USER_ERROR_PASSWORD_ERROR = -212;

/**
 * 检验登陆状态的filter
 */
router.checkToken = function(req, res, next) {
    var userId;
    var t;
    if (req.method === 'GET') {
        userId = req.query.uid;
        t = req.query.token;
    } else if (req.method === 'POST') {
        userId = req.body.uid;
        t = req.body.token;
    }
    if (userId && t && token.getToken(userId) === t) {
        next();
    } else {
        //res.redirect('/login');
        res.status(500)
            .set('err', USER_ERROR_TOKEN_CHECK)
            .send('Check token error! err=' + USER_ERROR_TOKEN_CHECK);
    }
};

/**
 * 登陆账号。
 */
router.post('/login', decryptor.decrypt, function(req, res, next) {
    var userId = req.body.uid;
    var password = req.body.password;
    var salt = req.body.sa;
    var t = req.body.token;
    if (!userId || !password){
        res.status(500)
            .set('err', COMMON_ERROR_PARAM_ILLEGAL)
            .send('error! err=' + COMMON_ERROR_PARAM_ILLEGAL);
        return
    }
    if (t && token.getToken(userId) === t) {
        token.updateToken(userId);
        res.status(200)
            .set('err', USER_ERROR_DUP_LOGIN)
            .send('error! err=' + USER_ERROR_DUP_LOGIN);
        return;
    }
    dao.getAccount(userId, function(err, user) {
        if (err) {
            res.status(500)
                .set('err', err)
                .send('error! err=' + err);
            return;
        }
        var pw = salt ? cipher.md5(user.password, salt) : user.password;
        if (pw !== password) {
            res.status(500)
                .set('err', USER_ERROR_PASSWORD_ERROR)
                .send('error! err=' + USER_ERROR_PASSWORD_ERROR);
            return;
        }
        var t = token.createToken(userId);
        if (!t) {
            res.status(500)
                .set('err', USER_ERROR_TOKEN_CREATE)
                .send('error! err=' + USER_ERROR_TOKEN_CREATE);
            return;
        }
        // 登录成功
        dao.keepAliveAccount(userId);
        res.status(200).send(JSON.stringify({token : t}));
    })
});

/**
 * 登出账号。
 */
router.get('/logout', decryptor.decrypt, function(req, res, next) {
    var userId = req.query.uid;
    var t = req.query.token;
    if (!userId || !t){
        res.status(500)
            .set('err', COMMON_ERROR_PARAM_ILLEGAL)
            .send('error! err=' + COMMON_ERROR_PARAM_ILLEGAL);
        return
    }
    if (token.getToken(userId) === t) {
        token.removeToken(userId);
        res.status(200).send('logout success!');
    } else {
        res.status(500)
            .set('err', USER_ERROR_TOKEN_CHECK)
            .send('error! err=' + USER_ERROR_TOKEN_CHECK);
    }
});

/**
 * 更新账号数据。
 */
router.post('/update', decryptor.decrypt, router.checkToken, function(req, res, next) {
    var userId = req.body.uid;
    var info = {
        description : req.body.description,
        born_time : req.body.born_time,
        head_url : req.body.head_url
    };
    dao.updateAccount(userId, info, function(err) {
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
 * 搜索账号。
 */
router.get('/search', decryptor.decrypt, function(req, res, next) {
    var name = req.query.name;
    var description = req.query.description;
    dao.searchAccount(name, description, 0, function(err, result) {
        if (err) {
            res.status(500)
                .set('err', err)
                .send('error! err=' + err);
            return;
        }
        res.send(JSON.stringify(result));
    });
});

/**
 * 存活检测。调用此接口会刷新存活时间戳。
 */
router.get('/alive', decryptor.decrypt, router.checkToken, function(req, res, next) {
    var userId = req.query.uid;
    dao.keepAliveAccount(userId, function(err) {
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
 * 账号变成死亡状态。
 */
router.get('/kill', decryptor.decrypt, router.checkToken, function(req, res, next) {
    var userId = req.query.uid;
    dao.killAccount(userId, function(err) {
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
 * 销毁账号及账号相关内容。
 */
router.get('/destroy', decryptor.decrypt, router.checkToken, function(req, res, next) {
    var userId = req.query.uid;
    dao.destroyAccount(userId, function(err) {
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
 * 获取种子账号详情。
 */
router.get('/seed/detail', decryptor.decrypt, function(req, res, next) {
    var userId = req.query.uid;
    dao.getSeedAccountDetail(userId, function(err, result) {
        if (err) {
            res.status(500)
                .set('err', err)
                .send('error! err=' + err);
            return;
        }
        res.send('success! result=' + result);
    });
});

/**
 * 创建种子账号。
 * TODO TEST..
 */
router.post('/seed/create', decryptor.decrypt, function(req, res, next) {
    var name = req.body.name;
    var description = req.body.description;
    var ancestorId = req.body.aid;
    var password = req.body.pw;
    dao.createSeedAccount(name, description, ancestorId, password,
        function(err, result) {
            if (err) {
                res.status(500)
                    .set('err', err)
                    .send('error! err=' + err);
                return;
            }
            res.send(JSON.stringify({uid : result}));
        });
});

/**
 * 账号从种子状态变成激活状态。
 */
router.post('/seed/answer', decryptor.decrypt, function(req, res, next) {
    var userId = req.body.uid;
    var boxId = req.body.bid;
    var answer = req.body.answer;
    dao.answerSeedAccount(userId, boxId, answer, function(err) {
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
 * 账号从种子状态变成激活状态。
 */
router.post('/seed/activate', decryptor.decrypt, function(req, res, next) {
    var userId = req.body.uid;
    var boxId = req.body.bid;
    var password = req.body.password;
    var answer = req.body.answer;
    var salt = req.body.sa;
    dao.activateAccount(userId, boxId, answer, password, salt, function(err) {
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
