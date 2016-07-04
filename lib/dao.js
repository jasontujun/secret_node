/**
 * Created by jason on 2016/3/3.
 */
var util = require('util');
var mysql = require('mysql');
var EventProxy = require('eventproxy');
var cipher = require('./cipher');
var dfs = require('./dfs');
var errCode = require('./ecode');
var config = require('../config.json');

var pool = mysql.createPool({
    connectionLimit : config.dbConnectionLimit,
    host     : config.dbHost,
    port     : config.dbPort,
    user     : config.dbUser,
    password : config.dbPassword,
    database : config.dbDatabase,
    multipleStatements: true // 初始化数据库表时，需要支持多条sql语句
});


var USER_STATE_SEED = 0;
var USER_STATE_ACTIVE = 1;
var USER_STATE_DEAD = 10;

var SCOPE_PRIVATE = 1;
var SCOPE_PUBLIC = 10;

var HERITAGE_DEFAULT = 'h_default';
var HERITAGE_DESTROY = 'h_destroy';
var HERITAGE_PUBLIC = 'h_public';

exports.USER_STATE = {
    SEED : USER_STATE_SEED,
    ACTIVE : USER_STATE_ACTIVE,
    DEAD : USER_STATE_DEAD
};

exports.SCOPE = {
    PRIVATE : SCOPE_PRIVATE,
    PUBLIC : SCOPE_PUBLIC
};

exports.HERITAGE = {
    DEFAULT : HERITAGE_DEFAULT,
    DESTROY : HERITAGE_DESTROY,
    PUBLIC : HERITAGE_PUBLIC
};

var TABLE_USER = 'user';
var TABLE_RELATION = 'user_relation';
var TABLE_MEMORY = 'memory';
var TABLE_GIFT = 'memory_gift';
var TABLE_IGNORE = 'memory_ignore';
var TABLE_SECRET = 'secret';

var createTableUser = "CREATE TABLE IF NOT EXISTS `user` (\
  `Id` bigint(20) NOT NULL AUTO_INCREMENT,\
    `logic_id` varchar(33) NOT NULL DEFAULT '',\
    `state` tinyint(3) NOT NULL DEFAULT '0',\
    `name` varchar(64) NOT NULL DEFAULT '',\
    `description` varchar(200) NOT NULL DEFAULT '',\
    `password` varchar(32) DEFAULT NULL,\
    `ancestor_id` varchar(33) DEFAULT NULL,\
    `born_time` bigint(13) DEFAULT NULL,\
    `create_time` bigint(13) NOT NULL DEFAULT '0',\
    `activate_time` bigint(13) DEFAULT '0',\
    `alive_time` bigint(13) DEFAULT '0',\
    `email` varchar(128) DEFAULT NULL,\
    `heritage` varchar(33) NOT NULL DEFAULT '" + HERITAGE_DESTROY + "',\
    `death_threshold` bigint(13) NOT NULL DEFAULT '31536000000',\
    PRIMARY KEY (`Id`),\
    UNIQUE KEY `logic_id` (`logic_id`),\
    UNIQUE KEY `des_id` (`name`,`description`),\
    KEY `name` (`name`)\
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;";
var createTableUserRelation = "CREATE TABLE IF NOT EXISTS `user_relation` (\
  `Id` bigint(20) NOT NULL AUTO_INCREMENT,\
    `logic_id` varchar(66) NOT NULL DEFAULT '',\
    `u1_id` varchar(33) NOT NULL DEFAULT '',\
    `u1_name` varchar(64) NOT NULL DEFAULT '',\
    `u2_id` varchar(33) NOT NULL DEFAULT '',\
    `u2_name` varchar(64) NOT NULL DEFAULT '',\
    `create_time` bigint(13) NOT NULL DEFAULT '0',\
    PRIMARY KEY (`Id`),\
    UNIQUE KEY `logic_id` (`logic_id`)\
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;";
var createTableMemory = "CREATE TABLE IF NOT EXISTS `memory` (\
  `Id` bigint(20) NOT NULL AUTO_INCREMENT,\
    `logic_id` varchar(33) NOT NULL DEFAULT '',\
    `name` varchar(255) NOT NULL DEFAULT '',\
    `author_id` varchar(33) NOT NULL DEFAULT '',\
    `author_name` varchar(64) NOT NULL DEFAULT '',\
    `owner_id` varchar(33) NOT NULL DEFAULT '',\
    `owner_name` varchar(64) NOT NULL DEFAULT '',\
    `happen_start_time` bigint(13) NOT NULL DEFAULT '0',\
    `happen_end_time` bigint(13) NOT NULL DEFAULT '0',\
    `create_time` bigint(13) NOT NULL DEFAULT '0',\
    `editable` tinyint(3) NOT NULL DEFAULT '1',\
    `cover_url` varchar(1024) DEFAULT NULL,\
    `cover_width` int(11) DEFAULT '0',\
    `cover_height` int(11) DEFAULT '0',\
    `heritage` varchar(33) NOT NULL DEFAULT '" + HERITAGE_DEFAULT + "',\
    PRIMARY KEY (`Id`),\
    UNIQUE KEY `logic_id` (`logic_id`),\
    KEY `owner_id` (`owner_id`)\
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;";
var createTableMemoryGift = "CREATE TABLE IF NOT EXISTS `memory_gift` (\
  `Id` bigint(20) NOT NULL AUTO_INCREMENT,\
    `logic_id` varchar(33) NOT NULL DEFAULT '',\
    `memory_id` varchar(33) NOT NULL DEFAULT '',\
    `sender_id` varchar(33) NOT NULL DEFAULT '',\
    `sender_name` varchar(64) DEFAULT NULL,\
    `receiver_id` varchar(33) NOT NULL DEFAULT '',\
    `receiver_name` varchar(64) DEFAULT NULL,\
    `receiver_description` varchar(200) DEFAULT NULL,\
    `question` varchar(255) DEFAULT NULL,\
    `answer` varchar(32) DEFAULT NULL,\
    `scope` tinyint(3) NOT NULL DEFAULT '0',\
    `create_time` bigint(13) NOT NULL DEFAULT '0',\
    `receive_time` bigint(13) DEFAULT '0',\
    `take_time` bigint(13) NOT NULL DEFAULT '0',\
    PRIMARY KEY (`Id`),\
    UNIQUE KEY `logic_id` (`logic_id`),\
    UNIQUE KEY `uni_id` (`memory_id`,`sender_id`,`receiver_id`),\
    KEY `receiver_id` (`receiver_id`),\
    KEY `receiver_name` (`receiver_name`),\
    KEY `sender_id` (`sender_id`)\
    KEY `memory_id` (`memory_id`)\
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;";
var createTableSecret = "CREATE TABLE `secret` (\
  `Id` bigint(20) NOT NULL AUTO_INCREMENT,\
    `logic_id` varchar(33) NOT NULL DEFAULT '',\
    `memory_id` varchar(33) NOT NULL DEFAULT '',\
    `s_order` int(11) NOT NULL DEFAULT '0',\
    `dfs` tinyint(3) DEFAULT '0',\
    `dfs_key` varchar(128) DEFAULT NULL,\
    `url` varchar(1024) DEFAULT NULL,\
    `width` int(11) DEFAULT '0',\
    `height` int(11) DEFAULT '0',\
    `size` bigint(13) DEFAULT '0',\
    `create_time` bigint(13) NOT NULL DEFAULT '0',\
    `upload_time` bigint(13) DEFAULT '0',\
    `mime` varchar(128) DEFAULT NULL,\
    PRIMARY KEY (`Id`),\
    UNIQUE KEY `uni_id` (`logic_id`,`memory_id`),\
    KEY `memory_id` (`memory_id`),\
    KEY `logic_id` (`logic_id`)\
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;";
var createTableIgnore = "CREATE TABLE `memory_ignore` (\
    `Id` int(11) NOT NULL AUTO_INCREMENT,\
    `logic_id` varchar(33) NOT NULL DEFAULT '',\
    `gift_id` varchar(33) NOT NULL DEFAULT '',\
    `receiver_id` varchar(33) NOT NULL DEFAULT '',\
    `memory_id` varchar(33) NOT NULL DEFAULT '',\
    `create_time` bigint(13) NOT NULL DEFAULT '0',\
    PRIMARY KEY (`Id`),\
    UNIQUE KEY `logic_id` (`logic_id`),\
    UNIQUE KEY `uni_id` (`gift_id`,`receiver_id`)\
    KEY `memory_id` (`memory_id`)\
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;";


function createMd5Id(prefix) {
    return prefix + cipher.md5('' + Date.now() + '' + Math.random())
}

function createUuid(conn, prefix, callback) {
    var fun = function (err, rows, fields) {
        if (err) {
            if (callback)
                callback(errCode.COMMON_DB);
            return;
        }
        var uuid = rows[0]['uuid()'];
        uuid = prefix + uuid.replace(new RegExp(/(-)/g), '');
        if (callback)
            callback(errCode.COMMON_OK, uuid);
    };
    if (conn) {
        conn.query( 'SELECT uuid()', fun);
    } else {
        pool.getConnection(function(err, connection) {
            if (err) {
                if (callback)
                    callback(errCode.COMMON_DB, null);
                return;
            }
            connection.query( 'SELECT uuid()',function(err, rows, fields) {
                connection.release();
                fun(err, rows, fields);
            });
        });

    }
}

function getTableItems (conn, tableName, fieldName, fieldValue, callback) {
    if (fieldValue === null || fieldValue === undefined) {
        if (callback)
            callback(errCode.COMMON_PARAM_ILLEGAL);
        return;
    }
    var fun = function (err, rows, fields) {
        if (err) {
            if (callback)
                callback(errCode.COMMON_DB);
            return;
        }
        if (callback)
            callback(errCode.COMMON_OK, rows)
    };
    var baseSql = 'SELECT * FROM ' + tableName;
    if (fieldName instanceof Array) {
        var farray = [];
        for (var i = 0; i < fieldName.length; i++) {
            farray.push(fieldName[i] + ' = ?')
        }
        if (farray.length > 0) {
            baseSql = baseSql + ' WHERE ' + farray.join(' AND ')
        }
    } else {
        baseSql = baseSql + ' WHERE ' + fieldName + ' = ?'
    }
    var fieldValueArr;
    if (fieldValue instanceof Array) {
        fieldValueArr = fieldValue;
    } else {
        fieldValueArr = [fieldValue];
    }
    if (conn) {
        conn.query(baseSql, fieldValueArr, fun);
    } else {
        pool.getConnection(function(err, connection) {
            if (err) {
                if (callback)
                    callback(errCode.COMMON_DB);
                return;
            }
            connection.query(baseSql, fieldValueArr,
                function (err, rows, fields) {
                    connection.release();
                    fun(err, rows, fields);
                });
        });
    }
}

function getTableItem (conn, tableName, fieldName, fieldValue, callback) {
    getTableItems(conn, tableName, fieldName, fieldValue, function(err, result) {
        if (err) {
            if (callback)
                callback(err);
            return;
        }
        if (!result || result.length === 0) {
            if (callback)
                callback(errCode.COMMON_DATA_NOT_EXIST);
            return;
        }
        if (callback)
            callback(errCode.COMMON_OK, result[0])
    });
}

function parseJsonArray(data) {
    var arr = null;
    if (data instanceof Array) {
        arr = data;
    } else if (typeof data === 'string') {
        try {
            arr = JSON.parse(data);
        } catch (e) {
            return null;
        }
    }
    if (!(arr instanceof Array)) {
        return null;
    } else {
        return arr;
    }
}

function concatId(id1, id2) {
    var idArr = [id1, id2];
    idArr.sort();
    return idArr.join('');
}

function createUser(conn, user, callback) {
    if (!user.name || !user.description) {
        if (callback)
            callback(errCode.COMMON_PARAM_ILLEGAL);
        return;
    }
    var desArray = parseJsonArray(user.description);
    if (!desArray || desArray.length === 0) {
        if (callback)
            callback(errCode.COMMON_PARAM_ILLEGAL);
        return;
    }
    if (desArray.length < config.userDesMin) {
        if (callback)
            callback(errCode.USER_DES_TOO_SHORT);
        return;
    }
    if (desArray.length > config.userDesMax) {
        if (callback)
            callback(errCode.USER_DES_TOO_LONG);
        return;
    }
    var fun = function(connection, callback) {
        // 先将descriptions排序，再转化成字符串
        desArray.sort();
        var desStr = JSON.stringify(desArray);
        var logicId = createMd5Id('u');
        // 添加时，依赖数据库的name+description组合索引的唯一性约束，来防止重复添加
        connection.query( 'INSERT INTO ' + TABLE_USER + ' SET ?',
            {
                logic_id : logicId,
                name : user.name,
                state : user.state,
                description : desStr,
                ancestor_id : user.ancestorId,
                password : cipher.md5(user.password, logicId),
                create_time: Date.now()
            },
            function(err, result) {
                if (err) {
                    if (callback)
                        callback(err.code === 'ER_DUP_ENTRY' ? errCode.COMMON_DATA_DUP : errCode.COMMON_DB);
                    return;
                }
                console.log('[user] insert a row. logicId=' + logicId + ',name=' + user.name);
                if (callback)
                    callback(errCode.COMMON_OK, logicId)
            });
    };
    if (conn) {
        fun(conn, callback);
    } else {
        pool.getConnection(function(err, connection) {
            if (err) {
                if (callback)
                    callback(errCode.COMMON_DB);
                return;
            }
            fun(connection, function(err, result) {
                connection.release();
                callback(err, result);
            });
        });
    }
}

function createOrGetUser(conn, name, description, ancestorId, callback) {
    var fun = function(connection, callback) {
        // 先尝试添加
        var user = {
            name : name,
            description : description,
            ancestorId : ancestorId,
            state : USER_STATE_SEED
        };
        createUser(connection, user, function (err, userId) {
            if (err === errCode.COMMON_DATA_DUP) {
                // 重复添加，则说明该账号已经存在，直接返回该账号id
                var desArray = parseJsonArray(description);
                desArray.sort();
                var desStr = JSON.stringify(desArray);
                connection.query('SELECT * FROM ' + TABLE_USER + ' WHERE name = ? AND description = ?',
                    [name, desStr], function (err, rows, fields) {
                        if (err) {
                            if (callback)
                                callback(errCode.COMMON_DB);
                            return;
                        }
                        if (!rows || rows.length === 0) {
                            if (callback)
                                callback(errCode.COMMON_DATA_NOT_EXIST);
                            return;
                        }
                        if (callback)
                            callback(errCode.COMMON_OK, rows[0].logic_id)
                    });
            } else {
                if (callback)
                    callback(err, userId);
            }
        });
    };
    if (conn) {
        fun(conn, callback);
    } else {
        pool.getConnection(function(err, connection) {
            if (err) {
                if (callback)
                    callback(errCode.COMMON_DB);
                return;
            }
            fun(connection, function(err, result) {
                connection.release();
                callback(err, result);
            });
        });
    }
}

function createSecretDfsKey(sid) {
    return sid ? 'secret/' + cipher.aesEncrypt(sid, config.aesKeyForSid) : null;
}

// ================== 初始化数据库(start) ================== //
function initDatabase(callback) {
    pool.getConnection(function(err, connection) {
        if (err) {
            if (callback)
                callback(errCode.COMMON_DB);
            return;
        }
        var tableArray = [createTableUser, createTableUserRelation, createTableMemory,
            createTableMemoryGift, createTableSecret, createTableIgnore];
        connection.query(tableArray.join('\n'),
            function (err, results) {
                connection.release();
                if (err) {
                    if (callback)
                        callback(errCode.COMMON_DB);
                    return;
                }
                if (callback)
                    callback(errCode.COMMON_OK, rows)
            });
    });
}
initDatabase();
// ================== 初始化数据库(end) ================== //


// ================== user(start) ================== //
/**
 * 精确获取账号。
 * @param userId
 * @param callback
 */
exports.getAccount = function (userId, callback) {
    getTableItem(null, TABLE_USER, 'logic_id', userId, callback);
};

/**
 * 搜索账号(支持模糊/严格两种模式)。
 * @param name
 * @param descriptions 必须是JSON数组字符串，数组可以为空
 * @param strict 是否严格匹配
 * @param state 用户状态(传入小于0的值表示查询所有用户)
 * @param callback
 */
exports.searchAccount = function(name, descriptions, strict, state, callback) {
    if (!name) {
        if (callback)
            callback(errCode.COMMON_PARAM_ILLEGAL);
        return;
    }
    var desArray = parseJsonArray(descriptions);
    if (descriptions) {
        if (!desArray) {
            if (callback)
                callback(errCode.COMMON_PARAM_ILLEGAL);
            return;
        }
    }
    pool.getConnection(function(err, connection) {
        if (err) {
            if (callback)
                callback(errCode.COMMON_DB);
            return;
        }
        var sql = 'SELECT * FROM ' + TABLE_USER + ' WHERE name = ' + mysql.escape(name);
        if (state >= USER_STATE_SEED) {
            sql = sql + ' AND state = ' + mysql.escape(state);
        }
        if (desArray && desArray.length > 0) {
            if (strict) {
                // 严格匹配description(一模一样)
                desArray.sort();
                sql = sql + ' AND description = ' + mysql.escape(JSON.stringify(desArray));
            } else {
                // 模糊匹配description(包含即可)
                for (var i = 0; i < desArray.length; i++) {
                    sql = sql + ' AND description LIKE ' + mysql.escape('%' + desArray[i] + '%');
                }
            }
        }
        connection.query(sql, function (err, rows, fields) {
            connection.release();
            if (err) {
                if (callback)
                    callback(errCode.COMMON_DB);
                return;
            }
            if (callback)
                callback(errCode.COMMON_OK, rows)
        });
    });
};

/**
 * 用于激活时获取种子账号详情和对应的托管Memory。
 * @param userId
 * @param callback
 */
exports.getSeedAccountDetail = function (userId, callback) {
    if (!userId) {
        if (callback)
            callback(errCode.COMMON_PARAM_ILLEGAL);
        return;
    }
    pool.getConnection(function(err, connection) {
        if (err) {
            if (callback)
                callback(errCode.COMMON_DB);
            return;
        }
        getTableItem(connection, TABLE_USER, 'logic_id', userId, function(err, user) {
            if (err) {
                connection.release();
                if (callback)
                    callback(err);
                return;
            }
            // 验证账号状态
            if (user.state !== USER_STATE_SEED) {
                connection.release();
                if (callback)
                    callback(errCode.COMMON_DENY);
                return;
            }
            getTableItems(connection, TABLE_GIFT, 'receiver_id', userId, function(err, giftItems) {
                if (err) {
                    connection.release();
                    if (callback)
                        callback(err);
                    return;
                }
                // 找不到对应的托管Memory
                if (!giftItems || giftItems.length === 0) {
                    // TODO 删除该种子账号
                    connection.release();
                    if (callback)
                        callback(errCode.COMMON_DATA_NOT_EXIST);
                    return;
                }
                connection.release();
                if (callback)
                    callback(errCode.COMMON_OK, giftItems);
            })
        })
    });
};

/**
 * 创建种子账号。
 * 通过数据库的name+descriptions唯一性约束，来避免重复。
 * TODO TEST..
 * @param name
 * @param description 必须是JSON数组字符串，且数组不能为空
 * @param ancestorId
 * @param password
 * @param callback
 */
exports.createSeedAccount = function (name, description, ancestorId, password, callback) {
    createUser(null,
        {
            name : name,
            description : description,
            ancestorId : ancestorId,
            state : USER_STATE_ACTIVE,
            password : password
        }, callback);
};

/**
 * 验证种子账号的答案(相当于activateAccount的前半部分，但未真正激活)。
 * @param userId
 * @param giftId
 * @param answer 不能为空
 * @param salt answer进行md5时用的salt
 * @param callback
 */
exports.answerSeedAccount = function (userId, giftId, answer, salt, callback) {
    if (!userId || !answer) {
        if (callback)
            callback(errCode.COMMON_PARAM_ILLEGAL);
        return;
    }
    pool.getConnection(function(err, connection) {
        if (err) {
            if (callback)
                callback(errCode.COMMON_DB);
            return;
        }
        getTableItem(connection, TABLE_USER, 'logic_id', userId, function(err, user) {
            if (err) {
                connection.release();
                if (callback)
                    callback(err);
                return;
            }
            // 验证账号状态
            if (user.state !== USER_STATE_SEED) {
                connection.release();
                if (callback)
                    callback(errCode.COMMON_DENY);
                return;
            }
            getTableItem(connection, TABLE_GIFT, 'logic_id', giftId, function(err, giftItem) {
                if (err) {
                    connection.release();
                    if (callback)
                        callback(err);
                    return;
                }
                // 验证托管memory的接收者就是这个种子账号
                if (giftItem.receiver_id !== userId) {
                    connection.release();
                    if (callback)
                        callback(errCode.COMMON_DENY);
                    return;
                }
                // 验证答案
                var giftAnswer = salt ? cipher.md5(giftItem.answer, salt) : giftItem.answer;
                if (!giftAnswer || giftAnswer !== answer) {
                    connection.release();
                    if (callback)
                        callback(errCode.GIFT_ERROR_ANSWER);
                    return;
                }
                connection.release();
                callback(errCode.COMMON_OK);
            });
        });
    });
};

/**
 * 激活种子账号，验证答案并设置密码。
 * @param userId
 * @param giftId
 * @param answer 不能为空
 * @param salt answer进行md5时用的salt
 * @param password
 * @param email
 * @param callback
 */
exports.activateAccount = function (userId, giftId, answer, salt, password, email, callback) {
    if (!userId || !giftId || !password || !answer || !email) {
        if (callback)
            callback(errCode.COMMON_PARAM_ILLEGAL);
        return;
    }
    pool.getConnection(function(err, connection) {
        if (err) {
            if (callback)
                callback(errCode.COMMON_DB);
            return;
        }
        getTableItem(connection, TABLE_GIFT, 'logic_id', giftId, function(err, giftItem){
            if (err) {
                connection.release();
                if (callback)
                    callback(err);
                return;
            }
            // 验证托管memory的接收者就是这个种子账号
            if (giftItem.receiver_id !== userId) {
                connection.release();
                if (callback)
                    callback(errCode.COMMON_DENY);
                return;
            }
            // 验证答案
            var giftAnswer = salt ? cipher.md5(giftItem.answer, salt) : giftItem.answer;
            if (!giftAnswer || giftAnswer !== answer) {
                connection.release();
                if (callback)
                    callback(errCode.GIFT_ERROR_ANSWER);
                return;
            }
            // 更新账号state时，通过sql的写锁来保证账号不会重复激活
            connection.query('UPDATE ' + TABLE_USER + ' SET ? WHERE logic_id = ? AND state = ?',
                [{
                    state : 1,
                    activate_time : Date.now(),
                    email : email,
                    password : cipher.md5(password, userId)
                }, userId, USER_STATE_SEED],
                function (err, results) {
                    connection.release();
                    if (err) {
                        if (callback)
                            callback(errCode.COMMON_DB);
                        return;
                    }
                    if (results.affectedRows === 0) {
                        if (callback)
                            callback(errCode.COMMON_DATA_NOT_EXIST);
                        return;
                    }
                    if (callback)
                        callback(errCode.COMMON_OK)
                });
        });
    });
};

exports.keepAliveAccount = function (userId, callback) {
    if (!userId) {
        if (callback)
            callback(errCode.COMMON_PARAM_ILLEGAL);
        return;
    }
    pool.getConnection(function(err, connection) {
        if (err) {
            if (callback)
                callback(errCode.COMMON_DB);
            return;
        }
        connection.query('UPDATE ' + TABLE_USER + ' SET alive_time = ? WHERE logic_id = ?',
            [Date.now(), userId],
            function (err, results) {
                connection.release();
                if (err) {
                    if (callback)
                        callback(errCode.COMMON_DB);
                    return;
                }
                if (results.affectedRows === 0) {
                    if (callback)
                        callback(errCode.COMMON_DATA_NOT_EXIST);
                    return;
                }
                if (callback)
                    callback(errCode.COMMON_OK)
            });
    });
};

exports.killAccount = function(userId, callback) {
    if (!userId) {
        if (callback)
            callback(errCode.COMMON_PARAM_ILLEGAL);
        return;
    }
    pool.getConnection(function(err, connection) {
        if (err) {
            if (callback)
                callback(errCode.COMMON_DB);
            return;
        }
        connection.query('UPDATE ' + TABLE_USER + ' SET state = ? WHERE logic_id = ? AND state = ?',
            [USER_STATE_DEAD, userId, USER_STATE_ACTIVE],
            function (err, results) {
                connection.release();
                if (err) {
                    if (callback)
                        callback(errCode.COMMON_DB);
                    return;
                }
                if (results.affectedRows === 0) {
                    if (callback)
                        callback(errCode.COMMON_DATA_NOT_EXIST);
                    return;
                }
                if (callback)
                    callback(errCode.COMMON_OK)
            });
    });
};

exports.destroyAccount = function (userId, callback) {
    // TODO 删除用户数据及所有相关内容
};

/**
 * 更新账号信息(包括descriptions, born_time, email, heritage, death_threshold)
 */
exports.updateAccount = function (userId, user_info, callback) {
    if (!userId || !user_info) {
        if (callback)
            callback(errCode.COMMON_PARAM_ILLEGAL);
        return;
    }
    var newValue = {};
    if (user_info.description) {
        var desArray = parseJsonArray(user_info.description);
        if (!desArray || desArray.length === 0) {
            if (callback)
                callback(errCode.COMMON_PARAM_ILLEGAL);
            return;
        }
        if (desArray.length < config.userDesMin) {
            if (callback)
                callback(errCode.USER_DES_TOO_SHORT);
            return;
        }
        if (desArray.length > config.userDesMax) {
            if (callback)
                callback(errCode.USER_DES_TOO_LONG);
            return;
        }
        desArray.sort();
        newValue.description = JSON.stringify(desArray);
    }
    if (!util.isNullOrUndefined(user_info.born_time)) {
        var bornTime = Number(user_info.born_time) || 0;
        // 生日不能晚于当前时间
        if (bornTime > Date.now()) {
            if (callback)
                callback(errCode.COMMON_PARAM_ILLEGAL);
            return;
        }
        newValue.born_time = bornTime;
    }
    if (user_info.email) {
        newValue.email = user_info.email;
    }
    if (user_info.heritage) {
        if (user_info.heritage === HERITAGE_PUBLIC) {
            newValue.heritage = HERITAGE_PUBLIC;
        } else if (user_info.heritage === HERITAGE_DESTROY) {
            newValue.heritage = HERITAGE_DESTROY;
        } else if(new RegExp('^u').test(user_info.heritage)) {
            newValue.heritage = user_info.heritage;
        }
    }
    if (user_info.death_threshold) {
        var deathThreshold = Number(user_info.death_threshold) || 0;
        if (config.deathThresholdMin <= deathThreshold && deathThreshold <= config.deathThresholdMax) {
            newValue.death_threshold = deathThreshold;
        }
    }
    pool.getConnection(function(err, connection) {
        if (err) {
            if (callback)
                callback(errCode.COMMON_DB);
            return;
        }
        connection.query('UPDATE ' + TABLE_USER + ' SET ? WHERE logic_id = ? AND state = ?',
            [newValue, userId, USER_STATE_ACTIVE],
            function (err, results) {
                connection.release();
                if (err) {
                    if (callback)
                        callback(errCode.COMMON_DB);
                    return;
                }
                if (results.affectedRows === 0) {
                    if (callback)
                        callback(errCode.COMMON_DATA_NOT_EXIST);
                    return;
                }
                if (callback)
                    callback(errCode.COMMON_OK)
            });
    });
};

exports.changePassword = function (userId, oldp, newp, callback) {

};

/**
 * 获取好友列表。
 * 返回数据结构[
 *      {
 *          uid : 好友id,
 *          name : 好友名字,
 *          state : 好友的状态,
 *          description : 好友的描述
 *      }, ...
 * ]
 */
exports.getFriendAccount = function (userId, callback) {
    if (!userId) {
        if (callback)
            callback(errCode.COMMON_PARAM_ILLEGAL);
        return;
    }
    pool.getConnection(function(err, connection) {
        if (err) {
            if (callback)
                callback(errCode.COMMON_DB);
            return;
        }
        connection.query('SELECT u.logic_id, u.name, u.state, u.description \
        FROM ' + TABLE_USER + ' u LEFT JOIN ' + TABLE_RELATION + ' r\
        ON (r.u1_id=? AND u.logic_id=r.u2_id)\
        OR (r.u2_id=? AND u.logic_id=r.u1_id)\
        WHERE r.logic_id IS NOT NULL',
            [userId, userId],
            function (err, results) {
                connection.release();
                if (err) {
                    if (callback)
                        callback(errCode.COMMON_DB);
                    return;
                }
                if (callback)
                    callback(errCode.COMMON_OK, results)
            });
    });
};
// ================== user(end) ================== //


// ================== memory(start) ================== //
exports.uploadMemoryCover = function(userId, memoryId, callback) {
    if (!userId || !memoryId) {
        if (callback)
            callback(errCode.COMMON_PARAM_ILLEGAL);
        return;
    }
    pool.getConnection(function (err, connection) {
        if (err) {
            if (callback)
                callback(errCode.COMMON_DB);
            return;
        }
        getTableItem(connection, TABLE_MEMORY, 'logic_id', memoryId, function(err, memory) {
            connection.release();
            if (err) {
                if (callback)
                    callback(err);
                return;
            }
            // 检验是否是memory的所有者和可编辑性
            if (memory.owner_id !== userId || !memory.editable) {
                if (callback)
                    callback(errCode.COMMON_DENY);
                return;
            }
            var dfsType = dfs.getDefaultDfsType();
            var coverId = cipher.md5(memoryId + Date.now() + '' + Math.random());
            var key = 'cover/' + coverId;
            var token = dfs.genPublicUploadToken(dfsType, key);
            if (callback)
                callback(errCode.COMMON_OK, dfsType, key, token);
        });
    });
};

exports.addMemory = function (userId, memoryInfo, callback) {
    if (!userId || !memoryInfo || !memoryInfo.name) {
        if (callback)
            callback(errCode.COMMON_PARAM_ILLEGAL);
        return;
    }
    var happenStartTime = Number(memoryInfo.happen_start_time) || 0;
    var happenEndTime = Number(memoryInfo.happen_end_time) || 0;
    if (util.isNullOrUndefined(memoryInfo.happen_start_time) ||
        util.isNullOrUndefined(memoryInfo.happen_end_time) ||
        happenStartTime > happenEndTime) {
        if (callback)
            callback(errCode.COMMON_PARAM_ILLEGAL);
        return;
    }
    pool.getConnection(function (err, connection) {
        if (err) {
            if (callback)
                callback(errCode.COMMON_DB);
            return;
        }
        getTableItem(connection, TABLE_USER, 'logic_id', userId, function(err, user) {
            if (err) {
                connection.release();
                if (callback)
                    callback(err);
                return;
            }
            // TODO 做容量判断？
            var logicId = createMd5Id('m');
            var memory = {
                logic_id: logicId,
                name: memoryInfo.name,
                author_id: userId,
                author_name : user.name,
                owner_id: userId,
                owner_name : user.name,
                happen_start_time : happenStartTime,
                happen_end_time : happenEndTime,
                create_time : Date.now(),
                editable : 1,
                cover_url : memoryInfo.cover_url,
                cover_width : Number(memoryInfo.cover_width) || 0,
                cover_height : Number(memoryInfo.cover_height) || 0,
                heritage : HERITAGE_DEFAULT
            };
            connection.query('INSERT INTO ' + TABLE_MEMORY + ' SET ?',
                memory,
                function (err, result) {
                    connection.release();
                    if (err) {
                        if (callback)
                            callback(errCode.COMMON_DB);
                        return;
                    }
                    console.log('[memory] insert a row. logicId=' + logicId + ',name=' + memoryInfo.name);
                    if (callback)
                        callback(errCode.COMMON_OK, memory)
                });
        });
    });
};

exports.deleteMemory = function (memoryId, userId, callback) {
    if (!memoryId || !userId) {
        if (callback)
            callback(errCode.COMMON_PARAM_ILLEGAL);
        return;
    }
    pool.getConnection(function(err, connection) {
        if (err) {
            if (callback)
                callback(errCode.COMMON_DB);
            return;
        }
        getTableItem(connection, TABLE_MEMORY, 'logic_id', memoryId, function(err, memory) {
            if (err) {
                connection.release();
                if (callback)
                    callback(err);
                return;
            }
            if (memory.owner_id !== userId) {
                connection.release();
                if (callback)
                    callback(errCode.COMMON_DENY);
                return;
            }
            // 获取所有的secrets信息，用于第三步删除secret对应的dfs上的资源文件
            getTableItems(connection, TABLE_SECRET, 'memory_id', memoryId, function(err, secrets) {
                if (err) {
                    connection.release();
                    if (callback)
                        callback(err);
                    return;
                }
                // 开始事务(5步)
                connection.beginTransaction(function(err) {
                    if (err) {
                        connection.release();
                        if (callback)
                            callback(errCode.COMMON_DB);
                        return;
                    }
                    // 1.删除memory
                    connection.query('DELETE FROM ' + TABLE_MEMORY + ' WHERE logic_id = ?',
                        [memoryId],
                        function (err, results) {
                            if (err) {
                                connection.rollback(function () {
                                    connection.release();
                                    if (callback)
                                        callback(errCode.COMMON_DB);
                                });
                                return;
                            }
                            // 2.删除memory包含的secret
                            connection.query('DELETE FROM ' + TABLE_SECRET + ' WHERE memory_id = ?',
                                [memoryId],
                                function (err, results) {
                                    if (err) {
                                        connection.rollback(function () {
                                            connection.release();
                                            if (callback)
                                                callback(errCode.COMMON_DB);
                                        });
                                        return;
                                    }
                                    // 3.删除和此memory有关的Gift记录(还未确认接收的)
                                    connection.query('DELETE FROM ' + TABLE_GIFT + ' WHERE memory_id = ? AND take_time = ?',
                                        [memoryId, 0],
                                        function (err, results) {
                                            if (err) {
                                                connection.rollback(function () {
                                                    connection.release();
                                                    if (callback)
                                                        callback(errCode.COMMON_DB);
                                                });
                                                return;
                                            }
                                            // 4.删除和此memory有关的ignore记录
                                            // TODO 删除种子用户？
                                            connection.query('DELETE FROM ' + TABLE_IGNORE + ' WHERE memory_id = ?',
                                                [memoryId],
                                                function (err, results) {
                                                    if (err) {
                                                        connection.rollback(function () {
                                                            connection.release();
                                                            if (callback)
                                                                callback(errCode.COMMON_DB);
                                                        });
                                                        return;
                                                    }
                                                    connection.commit(function (err) {
                                                        if (err) {
                                                            connection.rollback(function () {
                                                                connection.release();
                                                                if (callback)
                                                                    callback(errCode.COMMON_DB);
                                                            });
                                                            return;
                                                        }
                                                        // 5.删除secret的dfs上的文件(TODO secret共享问题)
                                                        for (var i = 0; i < secrets.length; i++) {
                                                            if (secrets[i].dfs) {
                                                                dfs.deleteSecret(secrets[i].dfs, secrets[i].dfs_key, function (err, key) {
                                                                    if (err) {
                                                                        // TODO 如果DFS删除失败，记录错误日志，未删除的无用文件
                                                                        console.log('[deleteMemory] delete secret dfs failed! key=' + key + ',err=' + err);
                                                                        return;
                                                                    }
                                                                    console.log('[deleteMemory] delete secret dfs success! key=' + key);
                                                                });
                                                            }
                                                        }
                                                        // 6.删除memory的cover封面图片
                                                        if (memory.cover_url) {
                                                            getTableItem(null, TABLE_MEMORY, 'cover_url', memory.cover_url,
                                                                function(err, result) {
                                                                    if (err && err === errCode.COMMON_DATA_NOT_EXIST) {
                                                                        // 没有共享cover的memory了，可以删除
                                                                        // memory.cover_url的最后一部分为key
                                                                        var key = memory.cover_url.replace(config.dfsPublicDomain, '');
                                                                        if (key) {
                                                                            dfs.deletePublic(dfs.getDefaultDfsType(), key, function (err, key) {
                                                                                if (err) {
                                                                                    // TODO 如果DFS删除失败，记录错误日志，未删除的无用文件
                                                                                    console.log('[deleteMemory] delete MemoryCover dfs failed! key=' + key + ',err=' + err);
                                                                                    return;
                                                                                }
                                                                                console.log('[deleteMemory] delete MemoryCover dfs success! key=' + key);
                                                                            });
                                                                        }
                                                                    }
                                                                })
                                                        }
                                                        connection.release();
                                                        if (callback)
                                                            callback(errCode.COMMON_OK);
                                                    });
                                                });
                                        });
                                });
                        });
                });
            });
        });
    });
};


/**
 * 更新Memory信息(包括name, cover_url, cover_width, cover_height,
 * happen_start_time, happen_end_time, heritage)
 */
exports.updateMemory = function (userId, memoryId, memoryInfo, callback) {
    if (!userId || !memoryInfo) {
        if (callback)
            callback(errCode.COMMON_PARAM_ILLEGAL);
        return;
    }
    pool.getConnection(function(err, connection) {
        if (err) {
            if (callback)
                callback(errCode.COMMON_DB);
            return;
        }
        getTableItem(connection, TABLE_MEMORY, 'logic_id', memoryId, function(err, memory) {
            if (err) {
                connection.release();
                if (callback)
                    callback(err);
                return;
            }
            var newValue = {};
            if (memoryInfo.name) {
                newValue.name = memoryInfo.name;
            }
            if (memoryInfo.cover_url && memory.cover_url !== memoryInfo.cover_url &&
                !util.isNullOrUndefined(memoryInfo.cover_width) &&
                !util.isNullOrUndefined(memoryInfo.cover_height)) {
                newValue.cover_url = memoryInfo.cover_url;
                newValue.cover_width = Number(memoryInfo.cover_width) || 0;
                newValue.cover_height = Number(memoryInfo.cover_height) || 0;
            }
            if (!util.isNullOrUndefined(memoryInfo.happen_start_time) &&
                !util.isNullOrUndefined(memoryInfo.happen_end_time)) {
                var startTime = Number(memoryInfo.happen_start_time) || 0;
                var endTime = Number(memoryInfo.happen_end_time) || 0;
                if (startTime <= endTime) {
                    newValue.happen_start_time = startTime;
                    newValue.happen_end_time = endTime;
                }
            }
            if (memoryInfo.heritage) {
                if (memoryInfo.heritage === HERITAGE_DEFAULT) {
                    newValue.heritage = HERITAGE_DEFAULT;
                } else if (memoryInfo.heritage === HERITAGE_PUBLIC) {
                    newValue.heritage = HERITAGE_PUBLIC;
                } else if (memoryInfo.heritage === HERITAGE_DESTROY) {
                    newValue.heritage = HERITAGE_DESTROY;
                } else if(new RegExp('^u').test(memoryInfo.heritage)) {
                    newValue.heritage = memoryInfo.heritage;
                }
            }
            connection.query('UPDATE ' + TABLE_MEMORY +
                ' SET ? WHERE owner_id = ? AND logic_id = ? AND editable=?',
                [newValue, userId, memoryId, 1],
                function (err, results) {
                    connection.release();
                    if (err) {
                        if (callback)
                            callback(errCode.COMMON_DB);
                        return;
                    }
                    if (results.affectedRows === 0) {
                        if (callback)
                            callback(errCode.COMMON_DATA_NOT_EXIST);
                        return;
                    }
                    // 删除memory旧的cover封面图片
                    if (memory.cover_url && memoryInfo.cover_url &&
                        memory.cover_url !== memoryInfo.cover_url) {
                        getTableItem(null, TABLE_MEMORY, 'cover_url', memory.cover_url,
                            function(err, result) {
                                if (err && err === errCode.COMMON_DATA_NOT_EXIST) {
                                    // 没有共享cover的memory了，可以删除
                                    // memory.cover_url的最后一部分为key
                                    var key = memory.cover_url.replace(config.dfsPublicDomain, '');
                                    if (key) {
                                        dfs.deletePublic(dfs.getDefaultDfsType(), key, function (err, key) {
                                            if (err) {
                                                // TODO 如果DFS删除失败，记录错误日志，未删除的无用文件
                                                console.log('[updateMemory] delete MemoryCover dfs failed! key=' + key + ',err=' + err);
                                                return;
                                            }
                                            console.log('[updateMemory] delete MemoryCover dfs success! key=' + key);
                                        });
                                    }
                                }
                            })
                    }
                    if (callback)
                        callback(errCode.COMMON_OK)
                });
        });
    });
};


/**
 * 赠送Memory。
 * 1.如果指定了receiverId，则不会创建新的种子账号。
 *   1.1 如果scope=SCOPE_PRIVATE，即私密赠送，可以不设置问题和答案，只有接收账号能查看
 *   1.2 如果scope=SCOPE_PUBLIC,即全局赠送，必须设置问题和答案(在赠送者不确定对方账号时，推荐使用此方式)
 * 2.如果没指定receiverId，则会更根据严格匹配name+description的模式来判断是否要创建新的种子账号。
 *   2.1 scope不能是SCOPE_PRIVATE，必须设置问题和答案，因为所有人相关匹配账号都可以接收。
 * 3.数据库的memoryId+senderId+receiverId唯一性约束，保证了不会重复赠送。
 */
exports.postMemory = function (memoryId, senderId, receiverId, receiverName,
                               receiverDescription, question, answer, sc, receiveTime, callback) {
    if (!memoryId || !senderId) {
        if (callback)
            callback(errCode.COMMON_PARAM_ILLEGAL);
        return;
    }
    // 要么指定接收者id，要么指定接收者的Name和Description
    if (!receiverId && !(receiverName || receiverDescription)) {
        if (callback)
            callback(errCode.COMMON_PARAM_ILLEGAL);
        return;
    }
    if (receiverDescription) {
        var desArray = parseJsonArray(receiverDescription);
        if (!desArray || desArray.length === 0) {
            if (callback)
                callback(errCode.COMMON_PARAM_ILLEGAL);
            return;
        }
        if (desArray.length < config.userDesMin) {
            if (callback)
                callback(errCode.USER_DES_TOO_SHORT);
            return;
        }
        if (desArray.length > config.userDesMax) {
            if (callback)
                callback(errCode.USER_DES_TOO_LONG);
            return;
        }
        desArray.sort();
        receiverDescription = JSON.stringify(desArray);
    }
    var scope = Number(sc) || 0;
    // 没设置receiverId，则默认是全局赠送，必须设置问答
    if (!receiverId) {
        scope = SCOPE_PUBLIC;
    }
    if (!scope) {
        scope = SCOPE_PRIVATE;// 默认范围是私密
    }
    // 不是私密赠送，都需要问题加锁
    if (scope !== SCOPE_PRIVATE && (!question || !answer)) {
        if (callback)
            callback(errCode.GIFT_NEED_LOCK);
        return;
    }
    // 如果设置了receiveTime，一定是未来的某个时间
    var receiveT = Number(receiveTime) || 0;
    if (!util.isNullOrUndefined(receiveTime) && receiveT <= Date.now()) {
        if (callback)
            callback(errCode.COMMON_PARAM_ILLEGAL);
        return;
    }
    // 不可以自己赠送给自己！
    if (!receiverId && receiverId === senderId) {
        if (callback)
            callback(errCode.COMMON_DENY);
        return;
    }
    pool.getConnection(function (err, connection) {
        if (err) {
            if (callback)
                callback(errCode.COMMON_DB);
            return;
        }
        getTableItem(connection, TABLE_MEMORY, 'logic_id', memoryId, function(err, memory) {
            if (err) {
                connection.release();
                if (callback)
                    callback(err);
                return;
            }
            // 检验发送者是否是memory的所有者
            if (memory.owner_id !== senderId) {
                connection.release();
                if (callback)
                    callback(errCode.COMMON_DENY);
                return;
            }
            // 不可以赠送给memory的作者
            if (!receiverId && receiverId === memory.author_id) {
                connection.release();
                if (callback)
                    callback(errCode.COMMON_DENY);
                return;
            }
            connection.query('SELECT COUNT(*) FROM ' + TABLE_SECRET + ' WHERE memory_id = ?',
                [memoryId],
                function(err, results) {
                    if (err) {
                        connection.release();
                        if (callback)
                            callback(errCode.COMMON_DB);
                        return;
                    }
                    // memory必须包含有secret
                    if (results[0]['COUNT(*)'] === 0) {
                        connection.release();
                        if (callback)
                            callback(errCode.COMMON_DATA_EMPTY);
                        return;
                    }
                    // 开始事务(3步)
                    connection.beginTransaction(function(err) {
                        if (err) {
                            connection.release();
                            if (callback)
                                callback(errCode.COMMON_DB);
                            return;
                        }
                        // 第二步，将Memory设定为不可编辑
                        var addGiftFun = function(userId) {
                            connection.query('UPDATE ' + TABLE_MEMORY + ' SET ? WHERE logic_id = ?',
                                [{editable : 0}, memoryId],
                                function (err, results) {
                                    if (err) {
                                        connection.rollback(function () {
                                            connection.release();
                                            if (callback)
                                                callback(errCode.COMMON_DB);
                                        });
                                        return;
                                    }
                                    var logicId = createMd5Id('g');
                                    // 第三步，生成gift记录
                                    connection.query('INSERT INTO ' + TABLE_GIFT + ' SET ?',
                                        {
                                            logic_id: logicId,
                                            memory_id: memoryId,
                                            sender_id: senderId,
                                            sender_name: memory.owner_name,
                                            receiver_id: userId,
                                            receiver_name: receiverName,
                                            receiver_description: receiverDescription,
                                            question: question,
                                            answer: answer,
                                            scope: scope,
                                            create_time: Date.now(),
                                            receive_time: receiveT,
                                            take_time : 0
                                        },
                                        function (err, result) {
                                            if (err) {
                                                connection.rollback(function () {
                                                    connection.release();
                                                    if (callback)
                                                        callback(errCode.COMMON_DB);
                                                });
                                                return;
                                            }
                                            console.log('[postMemory] insert a row. giftId=' + logicId);
                                            connection.commit(function (err) {
                                                if (err) {
                                                    connection.rollback(function () {
                                                        connection.release();
                                                        if (callback)
                                                            callback(errCode.COMMON_DB);
                                                    });
                                                    return;
                                                }
                                                console.log('[postMemory] send memory success! logicId=' + logicId);
                                                connection.release();
                                                if (callback)
                                                    callback(errCode.COMMON_OK, logicId);
                                            });
                                        });
                                });
                        };
                        // 第一步(1)，指定了receiverId的用户，验证账号的有效性
                        if (receiverId) {
                            getTableItem(connection, TABLE_USER, 'logic_id', receiverId, function(err, user) {
                                if (err) {
                                    connection.rollback(function() {
                                        connection.release();
                                        if (callback)
                                            callback(errCode.COMMON_DB);
                                    });
                                    return;
                                }
                                // 验证用户状态(死亡状态没法接收Memory)
                                if (user.state !== USER_STATE_SEED && user.state !== USER_STATE_ACTIVE) {
                                    connection.rollback(function() {
                                        connection.release();
                                        if (callback)
                                            callback(errCode.COMMON_DENY);
                                    });
                                    return;
                                }
                                // 如果赠送给种子用户，就算是指定userId的私密赠送，也必须转为公开赠送，要添加问答
                                if (user.state === USER_STATE_SEED) {
                                    scope = SCOPE_PUBLIC;
                                }
                                // 不是私密赠送，都需要问题加锁
                                if (scope !== SCOPE_PRIVATE && (!question || !answer)) {
                                    connection.rollback(function() {
                                        connection.release();
                                        if (callback)
                                            callback(errCode.GIFT_NEED_LOCK);
                                    });
                                    return;
                                }
                                receiverName = user.name;
                                receiverDescription = user.description;
                                addGiftFun(receiverId);
                            });
                        }
                        // 第一步(2)，未指定receiverId的用户，创建或获取账号Id
                        else {
                            createOrGetUser(connection, receiverName, receiverDescription, senderId,
                                function(err, userId) {
                                    if (err) {
                                        connection.rollback(function() {
                                            connection.release();
                                            if (callback)
                                                callback(errCode.COMMON_DB);
                                        });
                                        return;
                                    }
                                    addGiftFun(userId);
                                });
                        }
                    });
                });
        });
    });
};

/**
 * 确认接收Memory。
 * 1.如果receiverId是未激活账号，则需要先激活账号
 * 2.如果双方不是好友关系，自动建立好友关系
 * 3.接收Memory成功，不会销毁对应的MemoryGift记录，只会记录take_time字段表示接收时间
 */
exports.receiveMemory = function (giftId, receiverId, answer, salt, callback) {
    if (!giftId || !receiverId) {
        if (callback)
            callback(errCode.COMMON_PARAM_ILLEGAL);
        return;
    }
    pool.getConnection(function(err, connection) {
        if (err) {
            if (callback)
                callback(errCode.COMMON_DB);
            return;
        }
        getTableItem(connection, TABLE_USER, 'logic_id', receiverId, function(err, user) {
            if (err) {
                connection.release();
                if (callback)
                    callback(err);
                return;
            }
            // 用户未激活，不能接收Memory
            if (user.state !== USER_STATE_ACTIVE) {
                connection.release();
                if (callback)
                    callback(errCode.COMMON_DENY);
                return;
            }
            getTableItem(connection, TABLE_GIFT, 'logic_id', giftId, function(err, giftItem){
                if (err) {
                    connection.release();
                    if (callback)
                        callback(err);
                    return;
                }
                // 如果是私密范围，则验证接收者id是否一致
                if (giftItem.scope === SCOPE_PRIVATE && giftItem.receiver_id !== receiverId) {
                    connection.release();
                    if (callback)
                        callback(errCode.COMMON_DENY);
                    return;
                }
                // 验证receive_time，保证设定日期之前无法接收
                if (giftItem.receive_time > Date.now()) {
                    // TODO 验证下sender的存活状态？如果已经死亡，则不验证此条件？
                    connection.release();
                    if (callback)
                        callback(errCode.COMMON_DENY);
                    return;
                }
                // 防止重复接收
                if (giftItem.take_time !== 0) {
                    connection.release();
                    if (callback)
                        callback(errCode.MEMORY_DUP_RECEIVE);
                    return;
                }
                // 如果设置了问答，则验证答案是否一致
                var giftAnswer = salt ? cipher.md5(giftItem.answer, salt) : giftItem.answer;
                if (giftAnswer && giftAnswer !== answer) {
                    // TODO 密码回答错误N次，自动销毁？
                    connection.release();
                    if (callback)
                        callback(errCode.GIFT_ERROR_ANSWER);
                    return;
                }
                // 验证通过，开启事务，执行接收Memory逻辑
                getTableItem(connection, TABLE_MEMORY, 'logic_id', giftItem.memory_id,
                    function(err, memory) {
                        if (err) {
                            connection.release();
                            if (callback)
                                callback(err);
                            return;
                        }
                        connection.beginTransaction(function(err) {
                            if (err) {
                                connection.release();
                                if (callback)
                                    callback(errCode.COMMON_DB);
                                return;
                            }
                            var newValue = {take_time : Date.now()};
                            if (giftItem.receiver_id !== receiverId) {
                                // 如果receiver和指定的不同，则修改receiver信息
                                newValue.receiver_id = receiverId;
                                newValue.receiver_name = user.name;
                                newValue.receiver_description = user.description;
                            }
                            // 第一步：更新memory_gift记录的take_time值，表示已经接收
                            connection.query('UPDATE ' + TABLE_GIFT + ' SET ? WHERE logic_id = ? AND take_time = ?',
                                [newValue, giftId, 0],
                                function (err, results) {
                                    if (err) {
                                        connection.rollback(function() {
                                            connection.release();
                                            if (callback)
                                                callback(errCode.COMMON_DB);
                                        });
                                        return;
                                    }
                                    console.log('[receiveMemory] update take_time from memory_gift where logic_id=' + giftId);
                                    // 第二步：删除此gift相关的ignore记录
                                    connection.query('DELETE FROM ' + TABLE_IGNORE + ' WHERE gift_id = ?',
                                        [giftId],
                                        function (err, results) {
                                            if (err) {
                                                connection.rollback(function() {
                                                    connection.release();
                                                    if (callback)
                                                        callback(errCode.COMMON_DB);
                                                });
                                                return;
                                            }
                                            // 第三步：删除无用的种子user(receiverId不同的情况下，可能导致种子用户无效)
                                            connection.query('DELETE u FROM ' + TABLE_USER + ' u\
                                            LEFT JOIN ' + TABLE_GIFT + ' g ON u.logic_id=?\
                                            AND u.logic_id = g.receiver_id AND g.take_time=0\
                                            WHERE g.logic_id IS NULL AND u.logic_id=? AND u.state=?',
                                                [giftItem.receiver_id, giftItem.receiver_id, USER_STATE_SEED],
                                                function (err, results) {
                                                    if (err) {
                                                        connection.rollback(function() {
                                                            connection.release();
                                                            if (callback)
                                                                callback(errCode.COMMON_DB);
                                                        });
                                                        return;
                                                    }
                                                    // 第四步：复制memory数据到receiverId名下
                                                    var memoryId = createMd5Id('m');
                                                    connection.query('INSERT INTO ' + TABLE_MEMORY + ' SET ?',
                                                        {
                                                            logic_id : memoryId,
                                                            name : memory.name,
                                                            author_id : giftItem.sender_id,
                                                            author_name : giftItem.sender_name,
                                                            owner_id : receiverId,
                                                            owner_name : user.name,
                                                            happen_start_time : memory.happen_start_time,
                                                            happen_end_time : memory.happen_end_time,
                                                            create_time : Date.now(),
                                                            editable : 0,
                                                            cover_url : memory.cover_url,
                                                            cover_width : memory.cover_width,
                                                            cover_height : memory.cover_height,
                                                            heritage : HERITAGE_DEFAULT
                                                        },
                                                        function (err, result) {
                                                            if (err) {
                                                                connection.rollback(function() {
                                                                    connection.release();
                                                                    if (callback)
                                                                        callback(errCode.COMMON_DB);
                                                                });
                                                                return;
                                                            }
                                                            console.log('[receiveMemory] insert a row into table memory. logic_id=' + memoryId);
                                                            // 第五步：深度复制:复制memory包含的所有secret数据.复制secret的logic_id不变,memory_id变更。
                                                            connection.query('INSERT INTO ' + TABLE_SECRET +
                                                                '(logic_id,memory_id,s_order,dfs,dfs_key,url,width,height,size,create_time,upload_time,mime)' +
                                                                ' SELECT logic_id,?,s_order,dfs,dfs_key,url,width,height,size,create_time,upload_time,mime FROM '
                                                                + TABLE_SECRET + ' WHERE memory_id = ?',
                                                                [memoryId, giftItem.memory_id],
                                                                function (err, result) {
                                                                    if (err) {
                                                                        connection.rollback(function() {
                                                                            connection.release();
                                                                            if (callback)
                                                                                callback(errCode.COMMON_DB);
                                                                        });
                                                                        return;
                                                                    }
                                                                    console.log('[receiveMemory] copy secret where memory_id=' + memoryId);
                                                                    // 第六步：建立好友关系
                                                                    var rid = concatId(receiverId, giftItem.sender_id);
                                                                    connection.query('INSERT INTO ' + TABLE_RELATION + ' SET ?',
                                                                        {
                                                                            logic_id : rid,
                                                                            u1_id : receiverId,
                                                                            u1_name : user.name,
                                                                            u2_id : giftItem.sender_id,
                                                                            u2_name : giftItem.sender_name,
                                                                            create_time : Date.now()
                                                                        },
                                                                        function (err, result) {
                                                                            // 重复添加的好友关系，不是error
                                                                            if (err && err.code !== 'ER_DUP_ENTRY') {
                                                                                connection.rollback(function () {
                                                                                    connection.release();
                                                                                    if (callback)
                                                                                        callback(errCode.COMMON_DB);
                                                                                });
                                                                                return;
                                                                            }
                                                                            console.log('[receiveMemory] build friendship!!');
                                                                            connection.commit(function(err) {
                                                                                if (err) {
                                                                                    connection.rollback(function() {
                                                                                        connection.release();
                                                                                        if (callback)
                                                                                            callback(errCode.COMMON_DB);
                                                                                    });
                                                                                    return;
                                                                                }
                                                                                console.log('[receiveMemory] success!!');
                                                                                connection.release();
                                                                                if (callback)
                                                                                    callback(errCode.COMMON_OK, memoryId);
                                                                            });
                                                                        });
                                                                });
                                                        });
                                                });
                                        });
                                });
                        });
                    });
            });
        });
    });
};

/**
 * 接收者拒绝
 */
exports.rejectMemory = function(giftId, receiverId, callback) {
    if (!giftId || !receiverId) {
        if (callback)
            callback(errCode.COMMON_PARAM_ILLEGAL);
        return;
    }
    pool.getConnection(function(err, connection) {
        if (err) {
            if (callback)
                callback(errCode.COMMON_DB);
            return;
        }
        getTableItem(connection, TABLE_GIFT, 'logic_id', giftId, function(err, gift) {
            if (err) {
                connection.release();
                if (callback)
                    callback(err);
                return;
            }
            if (gift.scope === SCOPE_PRIVATE) {
                // 私密赠送，验证接收者id
                if (gift.receiver_id !== receiverId) {
                    connection.release();
                    if (callback)
                        callback(errCode.COMMON_DENY);
                    return;
                }
                // 私密赠送，直接标记take_time为-1，表示拒绝
                connection.query('UPDATE ' + TABLE_GIFT + ' SET take_time = ? WHERE logic_id = ? AND take_time = ?',
                    [-1, giftId, 0],
                    function (err, results) {
                        connection.release();
                        if (err) {
                            if (callback)
                                callback(errCode.COMMON_DB);
                            return;
                        }
                        if (callback)
                            callback(errCode.COMMON_OK)
                    });
            } else {
                // 公开赠送被拒绝，生成一条ignore记录
                var ignoreRecord = {
                    logic_id : createMd5Id('i'),
                    gift_id : giftId,
                    receiver_id : receiverId,
                    memory_id : gift.memory_id,
                    create_time : Date.now()
                };
                connection.query('INSERT INTO ' + TABLE_IGNORE + ' SET ?',
                    ignoreRecord,
                    function (err, result) {
                        connection.release();
                        if (err) {
                            if (callback)
                                callback(errCode.COMMON_DB);
                            return;
                        }
                        if (callback)
                            callback(errCode.COMMON_OK)
                    });
            }
        });
    });
};

/**
 * 赠送撤销赠送
 */
exports.cancelMemory = function (giftId, senderId, callback) {
    if (!giftId || !senderId) {
        if (callback)
            callback(errCode.COMMON_PARAM_ILLEGAL);
        return;
    }
    pool.getConnection(function(err, connection) {
        if (err) {
            if (callback)
                callback(errCode.COMMON_DB);
            return;
        }
        getTableItem(connection, TABLE_GIFT, 'logic_id', giftId, function (err, giftItem) {
            if (err) {
                connection.release();
                if (callback)
                    callback(err);
                return;
            }
            // 验证gift的赠送者
            if (giftItem.sender_id !== senderId) {
                connection.release();
                if (callback)
                    callback(errCode.COMMON_DENY);
                return;
            }
            // 必须是没有接收也没有拒绝，才能取消赠送
            if (giftItem.take_time !== 0) {
                connection.release();
                if (callback)
                    callback(errCode.COMMON_DENY);
                return;
            }
            // 开始事务(3步)
            connection.beginTransaction(function(err) {
                if (err) {
                    connection.release();
                    if (callback)
                        callback(errCode.COMMON_DB);
                    return;
                }
                // 1.删除此gift
                connection.query('DELETE FROM ' + TABLE_GIFT + ' WHERE logic_id = ? AND take_time = ?',
                    [giftId, 0],
                    function (err, results) {
                        if (err) {
                            connection.rollback(function () {
                                connection.release();
                                if (callback)
                                    callback(errCode.COMMON_DB);
                            });
                            return;
                        }
                        // 2.删除和此gift有关的ignore记录
                        connection.query('DELETE FROM ' + TABLE_IGNORE + ' WHERE gift_id = ?',
                            [giftId],
                            function (err, results) {
                                if (err) {
                                    connection.rollback(function () {
                                        connection.release();
                                        if (callback)
                                            callback(errCode.COMMON_DB);
                                    });
                                    return;
                                }
                                // 第三步：删除此gift有关的无用的种子user
                                connection.query('DELETE u FROM ' + TABLE_USER + ' u\
                                            LEFT JOIN ' + TABLE_GIFT + ' g ON u.logic_id=?\
                                            AND u.logic_id = g.receiver_id AND g.take_time=0\
                                            WHERE g.logic_id IS NULL AND u.logic_id=? AND u.state=?',
                                    [giftItem.receiver_id, giftItem.receiver_id, USER_STATE_SEED],
                                    function (err, results) {
                                        if (err) {
                                            connection.rollback(function () {
                                                connection.release();
                                                if (callback)
                                                    callback(errCode.COMMON_DB);
                                            });
                                            return;
                                        }
                                        connection.commit(function (err) {
                                            if (err) {
                                                connection.rollback(function () {
                                                    connection.release();
                                                    if (callback)
                                                        callback(errCode.COMMON_DB);
                                                });
                                                return;
                                            }
                                            connection.release();
                                            if (callback)
                                                callback(errCode.COMMON_OK);
                                        });
                                    });
                            });
                    });
            });
        });
    });
};

exports.getMemoryDetail = function (memoryId, userId, callback) {
    if (!memoryId || !userId) {
        if (callback)
            callback(errCode.COMMON_PARAM_ILLEGAL, null);
        return;
    }
    pool.getConnection(function(err, connection) {
        if (err) {
            if (callback)
                callback(errCode.COMMON_DB, null);
            return;
        }
        getTableItem(connection, TABLE_MEMORY, 'logic_id', memoryId, function(err, memory) {
            if (err) {
                connection.release();
                if (callback)
                    callback(err);
                return;
            }
            if (memory.owner_id !== userId) {
                connection.release();
                if (callback)
                    callback(errCode.COMMON_DENY, null);
                return;
            }
            // 第一步：获取memory包含的secrets
            getTableItems(connection, TABLE_SECRET, 'memory_id', memoryId,
                function(err, secrets) {
                    if (err) {
                        connection.release();
                        if (callback)
                            callback(err);
                        return;
                    }
                    // 第二步：获取memory的赠送记录
                    getTableItems(connection, TABLE_GIFT,
                        ['memory_id', 'sender_id'], [memoryId, userId],
                        function(err, giftItems) {
                            connection.release();
                            if (err) {
                                if (callback)
                                    callback(err);
                                return;
                            }
                            if (callback)
                                callback(errCode.COMMON_OK, secrets, giftItems);
                        });
                });
        });
    });
};

/**
 * 获取账号拥有的Memory列表。
 * @param userId
 * @param callback
 */
exports.getMemoryList = function (userId, callback) {
    if (!userId) {
        if (callback)
            callback(errCode.COMMON_PARAM_ILLEGAL);
        return;
    }
    getTableItems(null, TABLE_MEMORY, 'owner_id', userId, function(err, memorys) {
        if (err) {
            if (callback)
                callback(err);
            return;
        }
        if (callback)
            callback(errCode.COMMON_OK, memorys)
    });
};

/**
 * 获取与账号相关的待接收Memory列表。
 * @param userId
 * @param scope 获取的Memory类型(SCOPE_PRIVATE, SCOPE_PUBLIC)
 * @param callback
 */
exports.getMemoryGift = function (userId, scope, callback) {
    if (!userId) {
        if (callback)
            callback(errCode.COMMON_PARAM_ILLEGAL);
        return;
    }
    pool.getConnection(function(err, connection) {
        if (err) {
            if (callback)
                callback(errCode.COMMON_DB);
            return;
        }
        if (scope === SCOPE_PRIVATE) {
            connection.query(
                'SELECT g.logic_id, g.memory_id, m.name memory_name, m.happen_start_time, m.happen_end_time,\
                 m.heritage, m.cover_url, m.cover_width, m.cover_height, g.sender_id, g.sender_name, g.receiver_id,\
                 g.receiver_name, g.receiver_description, g.question, g.create_time, g.take_time\
                 FROM ' + TABLE_GIFT + ' g LEFT JOIN ' + TABLE_MEMORY + ' m\
                 ON g.take_time=? AND g.receiver_id=? AND g.scope=? AND g.receive_time<=? AND g.memory_id=m.logic_id\
                 WHERE m.logic_id IS NOT NULL',
                [0, userId, scope, Date.now()],
                function(err, results) {
                    connection.release();
                    if (callback)
                        callback(err, results);
                });
        } else {
            getTableItem(connection, TABLE_USER, 'logic_id', userId, function (err, user) {
                if (err) {
                    connection.release();
                    if (callback)
                        callback(err);
                    return;
                }
                var userName = user.name;
                var desArray = JSON.parse(user.description);// 解析成数组对象，数据库存的是JSON字符串
                var sql =
                    'SELECT g.logic_id, g.memory_id, m.name memory_name, m.happen_start_time, m.happen_end_time,\
                    m.heritage, m.cover_url, m.cover_width, m.cover_height, g.sender_id, g.sender_name, g.receiver_id,\
                    g.receiver_name, g.receiver_description, g.question, g.create_time, g.take_time\
                    FROM ' + TABLE_GIFT + ' g LEFT JOIN ' + TABLE_MEMORY + ' m ON g.take_time='
                    + mysql.escape(0) + ' AND g.receiver_name=' + mysql.escape(userName)
                    + ' AND g.scope=' + mysql.escape(scope) + ' AND g.receive_time<=' + mysql.escape(Date.now())
                    + ' AND g.memory_id = m.logic_id';
                if (desArray instanceof Array && desArray.length > 0) {
                    var sqlArray = [];
                    for (var i = 0; i < desArray.length; i++) {
                        sqlArray.push('g.receiver_description LIKE ' + mysql.escape('%' + desArray[i] + '%'));
                    }
                    sql = sql + ' AND (' + sqlArray.join(' OR ') + ')'
                }
                sql = sql + ' LEFT JOIN ' + TABLE_IGNORE + ' i ON i.gift_id=g.logic_id AND i.receiver_id='
                    + mysql.escape(userId)  + ' WHERE m.logic_id IS NOT NULL  AND i.logic_id IS NULL';
                connection.query(sql, function (err, rows, fields) {
                    connection.release();
                    if (err) {
                        if (callback)
                            callback(errCode.COMMON_DB);
                        return;
                    }
                    if (callback)
                        callback(errCode.COMMON_OK, rows)
                });
            });
        }
    })
};

/**
 * 添加Secret。
 * 如果调用者传入了secret.url字段，则说明资源url已经存在，不需要后续上传资源文件，只返回sid和ctime；
 * 如果调用者没有secret.url字段，则说明后续要上传资源文件，返回sid,ctime,dfsType,token和dfs_key。
 * @param memoryId
 * @param userId
 * @param secretStr JSON数组字符串
 * @param callback
 */
exports.addSecretToMemory = function (memoryId, userId, secretStr, callback) {
    if (!memoryId || !secretStr) {
        if (callback)
            callback(errCode.COMMON_PARAM_ILLEGAL);
        return;
    }
    var secretArr = parseJsonArray(secretStr);
    if (!secretArr || secretArr.length === 0) {
        if (callback)
            callback(errCode.COMMON_PARAM_ILLEGAL);
    }
    pool.getConnection(function (err, connection) {
        if (err) {
            if (callback)
                callback(errCode.COMMON_DB);
            return;
        }
        getTableItem(connection, TABLE_MEMORY, 'logic_id', memoryId, function(err, memory) {
            if (err) {
                connection.release();
                if (callback)
                    callback(err);
                return;
            }
            if (memory.owner_id !== userId || !memory.editable) {
                connection.release();
                if (callback)
                    callback(errCode.COMMON_DENY);
                return;
            }
            // 利用EventProxy进行批量添加
            var ep = new EventProxy();
            ep.fail(function(err) {
                console.log('[addSecretToMemory] error! err=' + err);
                connection.release();
                if (callback)
                    callback(errCode.COMMON_DB);
            });
            ep.after('addSecret', secretArr.length, function(list) {
                console.log('[addSecretToMemory] success! add size=' + list.length);
                connection.release();
                if (callback) {
                    callback(errCode.COMMON_OK, list);
                }
            });
            secretArr.forEach(function (secret) {
                var logicId = createMd5Id('s');
                var dfsType = secret.url ? 0 : dfs.getDefaultDfsType();
                var ctime = Date.now();
                connection.query('INSERT INTO ' + TABLE_SECRET + ' SET ?',
                    {
                        logic_id: logicId,
                        memory_id: memoryId,
                        s_order : Number(secret.order),
                        dfs: dfsType,
                        url: secret.url,
                        size: Number(secret.size),
                        width: Number(secret.width),
                        height: Number(secret.height),
                        create_time: ctime,
                        mime: secret.mime
                    },
                    ep.group('addSecret', function(data) {
                        console.log('[addSecretToMemory] insert a row. logicId=' + logicId);
                        var result = {
                            sid : logicId,
                            ctime : ctime
                        };
                        if (dfsType) {
                            result.dfs = dfsType;
                            result.key = createSecretDfsKey(logicId);
                            result.token = dfs.genSecretUploadToken(dfsType, result.dfs_key);
                        }
                        return result;
                    }));

            });
        });
    });
};

/**
 * 删除Secret。
 * 如果该Secret是存放在指定的dfs，则同时会请求删除dfs上的资源文件。
 * @param memoryId
 * @param userId
 * @param secretId
 * @param callback
 */
exports.deleteSecretFromMemory = function (memoryId, userId, secretId, callback) {
    if (!memoryId || !userId) {
        if (callback)
            callback(errCode.COMMON_PARAM_ILLEGAL);
        return;
    }
    pool.getConnection(function(err, connection) {
        if (err) {
            if (callback)
                callback(errCode.COMMON_DB);
            return;
        }
        getTableItem(connection, TABLE_MEMORY, 'logic_id', memoryId, function(err, memory) {
            if (err) {
                connection.release();
                if (callback)
                    callback(err);
                return;
            }
            if (memory.owner_id !== userId || !memory.editable) {
                connection.release();
                if (callback)
                    callback(errCode.COMMON_DENY);
                return;
            }
            getTableItem(connection, TABLE_SECRET, ['logic_id', 'memory_id'], [secretId, memoryId],
                function(err, secret) {
                    if (err) {
                        connection.release();
                        if (callback)
                            callback(err);
                        return;
                    }
                    connection.query('DELETE FROM ' + TABLE_SECRET + ' WHERE logic_id = ? AND memory_id = ?',
                        [secretId, memoryId],
                        function (err, results) {
                            connection.release();
                            if (err) {
                                if (callback)
                                    callback(errCode.COMMON_DB);
                                return;
                            }
                            if (secret.dfs) {
                                dfs.deleteSecret(secret.dfs, secret.dfs_key, function (err) {
                                    if (err) {
                                        // TODO 如果DFS删除失败，记录错误日志，未删除的无用文件
                                        console.log('[deleteSecretFromMemory] delete dfs failed! key=' + secret.dfs_key + ',err=' + err);
                                        return;
                                    }
                                    console.log('[deleteSecretFromMemory] delete dfs success! key=' + secret.dfs_key);
                                    if (callback)
                                        callback(errCode.COMMON_OK);
                                });
                            } else {
                                if (callback)
                                    callback(errCode.COMMON_OK);
                            }
                        });
                });
        });
    });
};

/**
 * 更新Memory中secret的顺序。
 * @param memoryId
 * @param userId
 * @param orders secret顺序。是JSON数组字符串：[{id : xxxxx, order : 2}
 * @param callback
 */
exports.orderSecret = function (memoryId, userId, orders, callback) {
    if (!memoryId || !userId || !orders) {
        if (callback)
            callback(errCode.COMMON_PARAM_ILLEGAL);
        return;
    }
    var orderArr = parseJsonArray(orders);
    if (!orderArr || orderArr.length === 0) {
        if (callback)
            callback(errCode.COMMON_PARAM_ILLEGAL);
        return;
    }
    pool.getConnection(function (err, connection) {
        if (err) {
            if (callback)
                callback(errCode.COMMON_DB);
            return;
        }
        getTableItem(connection, TABLE_MEMORY, 'logic_id', memoryId, function (err, memory) {
            if (err) {
                connection.release();
                if (callback)
                    callback(err);
                return;
            }
            if (memory.owner_id !== userId) {
                connection.release();
                if (callback)
                    callback(errCode.COMMON_DENY);
                return;
            }
            var sql = 'INSERT INTO ' + TABLE_SECRET + '(logic_id, memory_id,s_order) VALUES';
            var valArray = [];
            for (var i = 0; i < orderArr.length; i++) {
                valArray.push('(' + mysql.escape(orderArr[i].id) + ',' + mysql.escape(memoryId)
                    + ',' + mysql.escape(orderArr[i].order) + ')');
            }
            sql = sql + valArray.join(',') + 'ON DUPLICATE KEY UPDATE s_order=VALUES(s_order)';
            connection.query(sql, function(err, results) {
                connection.release();
                if (err) {
                    if (callback)
                        callback(errCode.COMMON_DB);
                    return;
                }
                if (results.affectedRows === 0) {
                    if (callback)
                        callback(errCode.COMMON_DATA_NOT_EXIST);
                    return;
                }
                console.log('[orderSecret] success! affect rows:' + results.affectedRows);
                if (callback)
                    callback(errCode.COMMON_OK)
            });
        });
    });
};

/**
 * 获取secret对应的资源文件的下载url。
 * @param memoryId
 * @param secretId
 * @param callback
 */
exports.getSecretDownloadUrl = function(memoryId, secretId, callback) {
    if (!memoryId || !secretId) {
        if (callback)
            callback(errCode.COMMON_PARAM_ILLEGAL);
        return;
    }
    pool.getConnection(function(err, connection) {
        if (err) {
            connection.release();
            if (callback)
                callback(errCode.COMMON_DB);
            return;
        }
        getTableItem(connection, TABLE_SECRET, ['logic_id', 'memory_id'], [secretId, memoryId],
            function(err, secret) {
                connection.release();
                if (err) {
                    if (callback)
                        callback(err);
                    return;
                }
                if (secret.dfs) {
                    var downloadUrl = dfs.genSecretDownloadUr(secret.dfs, secret.dfs_key);
                    if (callback)
                        callback(errCode.COMMON_OK, downloadUrl);
                } else {
                    if (callback)
                        callback(errCode.COMMON_OK, secret.url);
                }
            });
    });
};

/**
 * 获取secret对应的资源上传token和dfs_key值。
 * @param memoryId
 * @param userId
 * @param secretId
 * @param callback
 */
exports.getSecretUploadToken = function(memoryId, userId, secretId, callback) {
    if (!memoryId || !secretId) {
        if (callback)
            callback(errCode.COMMON_PARAM_ILLEGAL);
        return;
    }
    pool.getConnection(function(err, connection) {
        if (err) {
            connection.release();
            if (callback)
                callback(errCode.COMMON_DB);
            return;
        }
        getTableItem(connection, TABLE_MEMORY, 'logic_id', memoryId, function(err, memory) {
            if (err) {
                connection.release();
                if (callback)
                    callback(err);
                return;
            }
            if (memory.owner_id !== userId) {
                connection.release();
                if (callback)
                    callback(errCode.COMMON_DENY);
                return;
            }
            getTableItem(connection, TABLE_SECRET, ['logic_id', 'memory_id'], [secretId, memoryId],
                function (err, secret) {
                    connection.release();
                    if (err) {
                        if (callback)
                            callback(err);
                        return;
                    }
                    if (!secret.dfs) {
                        connection.release();
                        if (callback)
                            callback(errCode.COMMON_DENY);
                        return;
                    }
                    var key = createSecretDfsKey(secretId);
                    var upToken = dfs.genSecretUploadToken(secret.dfs, key);
                    if (callback)
                        callback(errCode.COMMON_OK, upToken, key);
                });
        });
    });
};

exports.secretUploadFinish = function (secretId, memoryId, userId, dfsType, key, callback) {
    pool.getConnection(function (err, connection) {
        if (err) {
            if (callback)
                callback(errCode.COMMON_DB);
            return;
        }
        getTableItem(connection, TABLE_MEMORY, 'logic_id', memoryId, function(err, memory) {
            if (err) {
                connection.release();
                if (callback)
                    callback(err);
                return;
            }
            if (memory.owner_id !== userId || !memory.editable) {
                connection.release();
                if (callback)
                    callback(errCode.COMMON_DENY);
                return;
            }
            getTableItem(connection, TABLE_SECRET, ['logic_id', 'memory_id'], [secretId, memoryId],
                function(err, secret) {
                    if (err) {
                        connection.release();
                        if (callback)
                            callback(err);
                        return;
                    }
                    if (secret.dfs !== (Number(dfsType) || 0)) {
                        // 回调的dfs类型和secret指定的dfs类型不同，则报错
                        connection.release();
                        if (callback)
                            callback(errCode.COMMON_DENY);
                        return;
                    }
                    connection.query('UPDATE ' + TABLE_SECRET + ' SET ? WHERE logic_id = ? AND memory_id = ?',
                        [{
                            dfs_key : key,
                            upload_time : Date.now()
                        }, secretId, memoryId],
                        function (err, results) {
                            connection.release();
                            if (err) {
                                if (callback)
                                    callback(errCode.COMMON_DB);
                                return;
                            }
                            if (results.affectedRows === 0) {
                                if (callback)
                                    callback(errCode.COMMON_DATA_NOT_EXIST);
                                return;
                            }
                            if (callback)
                                callback(errCode.COMMON_OK)
                        });
                });
        });
    });
};
// ================== memory(start) ================== //