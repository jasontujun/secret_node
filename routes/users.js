var express = require('express');
var dao = require('../lib/dao');
var token = require('../lib/token');
var cipher = require('../lib/cipher');
var errCode = require('../lib/ecode');
var router = express.Router();


function login(userId, password, salt, callback) {
    dao.getAccount(userId, function(err, user) {
        if (err) {
            callback(err);
            return;
        }
        var pw = salt ? cipher.md5(user.password, salt) : user.password;
        if (pw !== password) {
            callback(errCode.USER_PASSWORD);
            return;
        }
        var t = token.getToken(userId);
        if (!t) {
            t = token.createToken(userId);
        }
        if (!t) {
            callback(errCode.USER_TOKEN_CREATE);
            return;
        }
        // 登录成功，更新用户的存活时间
        dao.keepAliveAccount(userId);
        callback(0, t, user);
    })
}

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
            .set('err', errCode.USER_TOKEN_CHECK)
            .send('Check token error! err=' + errCode.USER_TOKEN_CHECK);
    }
};


/**
 * 快速检验token的有效性。
 */
router.post('/check', function(req, res, next) {
    var userId = req.body.uid;
    var t = req.body.token;
    if (!userId || !t) {
        res.status(500)
            .set('err', errCode.COMMON_PARAM_ILLEGAL)
            .send('error! err=' + errCode.COMMON_PARAM_ILLEGAL);
        return
    }
    if (t && token.getToken(userId) === t) {
        dao.getAccount(userId, function(err, user) {
            if (err) {
                res.status(500)
                    .set('err', err)
                    .send('error! err=' + err);
                return;
            }
            res.status(200)
                .send(JSON.stringify({token : t, user : user}));
        });
    } else {
        res.status(500)
            .set('err', errCode.USER_TOKEN_CHECK)
            .send('error! err=' + errCode.USER_TOKEN_CHECK);
    }
});

/**
 * 登陆账号。
 */
router.post('/login', function(req, res, next) {
    var userId = req.body.uid;
    var password = req.body.password;
    var salt = req.body.sa;
    if (!userId || !password){
        res.status(500)
            .set('err', errCode.COMMON_PARAM_ILLEGAL)
            .send('error! err=' + errCode.COMMON_PARAM_ILLEGAL);
        return
    }
    login(userId, password, salt, function(err, token, user) {
        if (err) {
            res.status(500)
                .set('err', err)
                .send('error! err=' + err);
            return;
        }
        res.status(200).send(JSON.stringify({token : token, user : user}));
    });
});

/**
 * 登出账号。
 */
router.get('/logout', function(req, res, next) {
    var userId = req.query.uid;
    var t = req.query.token;
    if (!userId || !t){
        res.status(500)
            .set('err', errCode.COMMON_PARAM_ILLEGAL)
            .send('error! err=' + errCode.COMMON_PARAM_ILLEGAL);
        return
    }
    if (token.getToken(userId) === t) {
        token.removeToken(userId);
        res.status(200).send('logout success!');
    } else {
        res.status(500)
            .set('err', errCode.USER_TOKEN_CHECK)
            .send('error! err=' + errCode.USER_TOKEN_CHECK);
    }
});

/**
 * 更新账号数据。
 */
router.post('/update', router.checkToken, function(req, res, next) {
    var userId = req.body.uid;
    var info = {
        description : req.body.des,
        born_time : req.body.btime,
        email : req.body.email
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
router.post('/search', function(req, res, next) {
    var name = req.body.name;
    var description = req.body.des;
    var strict = req.body.strict;
    dao.searchAccount(name, description, strict, dao.USER_STATE.ACTIVE,
        function(err, result) {
            if (err) {
                res.status(500)
                    .set('err', err)
                    .send('error! err=' + err);
                return;
            }
            res.status(200).send(JSON.stringify(result));
        });
});


/**
 * 销毁账号及账号相关内容。
 */
router.get('/destroy', router.checkToken, function(req, res, next) {
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
 * 根据用户名和描述，搜索种子账号。
 */
router.post('/seed/search', function(req, res, next) {
    var name = req.body.name;
    var description = req.body.des;
    var strict = req.body.strict;
    dao.searchAccount(name, description, strict, dao.USER_STATE.SEED,
        function(err, result) {
            if (err) {
                res.status(500)
                    .set('err', err)
                    .send('error! err=' + err);
                return;
            }
            res.status(200).send(JSON.stringify(result));
        });
});

/**
 * 获取种子账号详情。
 */
router.get('/seed/detail', function(req, res, next) {
    var userId = req.query.uid;
    dao.getSeedAccountDetail(userId, function(err, result) {
        if (err) {
            res.status(500)
                .set('err', err)
                .send('error! err=' + err);
            return;
        }
        res.status(200).send(JSON.stringify(result));
    });
});

/**
 * 创建账号。
 * TODO TEST..
 */
router.post('/seed/create', function(req, res, next) {
    var name = req.body.name;
    var description = req.body.des;
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
            res.status(200).send(JSON.stringify({uid : result}));
        });
});

/**
 * 账号从种子状态变成激活状态的中间环节：测试问题的答案是否正确。
 */
router.post('/seed/answer', function(req, res, next) {
    var userId = req.body.uid;
    var boxId = req.body.bid;
    var answer = req.body.answer;
    var salt = req.body.sa;
    dao.answerSeedAccount(userId, boxId, answer, salt, function(err) {
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
router.post('/seed/activate', function(req, res, next) {
    var userId = req.body.uid;
    var boxId = req.body.bid;
    var password = req.body.password;
    var answer = req.body.answer;
    var salt = req.body.sa;
    var email = req.body.email;
    dao.activateAccount(userId, boxId, answer, salt, password, email, function(err) {
        if (err) {
            res.status(500)
                .set('err', err)
                .send('error! err=' + err);
            return;
        }
        // 激活成功后自动登录
        login(userId, cipher.md5(password, userId), null, function(err, token, user) {
            if (err) {
                res.status(200).send(JSON.stringify({}));// 如果自动登录失败，返回空对象
                return;
            }
            // 自动登录成功，领取Memory
            dao.receiveMemory(boxId, userId, answer, salt,
                function (err, memoryId) {
                    res.status(200).send(JSON.stringify({token : token, user : user}));
                });
        });
    });
});


module.exports = router;
