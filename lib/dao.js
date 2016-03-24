/**
 * Created by jason on 2016/3/3.
 */
var mysql = require('mysql');
var cipher = require('./cipher');

var pool = mysql.createPool({
    connectionLimit : 10,
    host     : 'localhost',
    user     : 'root',
    password : 'qazsedcft',
    database : 'sm',
    multipleStatements: true // 初始化数据库表时，需要支持多条sql语句
});

var TABLE_USER = 'user';
var TABLE_RELATION = 'user_relation';
var TABLE_MEMORY = 'memory';
var TABLE_BOX = 'memorybox';
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
    `create_time` bigint(13) DEFAULT NULL,\
    `activate_time` bigint(13) DEFAULT NULL,\
    `alive_time` bigint(13) DEFAULT NULL,\
    `head_url` varchar(2048) DEFAULT NULL,\
    PRIMARY KEY (`Id`),\
    UNIQUE KEY `logic_id` (`logic_id`),\
    UNIQUE KEY `des_id` (`name`,`description`),\
    KEY `name` (`name`)\
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;";
var createTableUserRelation = "CREATE TABLE IF NOT EXISTS `user_relation` (\
    `Id` bigint(20) NOT NULL AUTO_INCREMENT,\
    `logic_id` varchar(66) NOT NULL DEFAULT '',\
    `u1_id` varchar(33) NOT NULL DEFAULT '',\
    `u1_name` varchar(64) DEFAULT NULL,\
    `u2_id` varchar(33) NOT NULL DEFAULT '',\
    `u2_name` varchar(64) DEFAULT NULL,\
    `create_time` bigint(13) DEFAULT NULL,\
    PRIMARY KEY (`Id`),\
    UNIQUE KEY `logic_id` (`logic_id`)\
    ) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8;";
var createTableMemory = "CREATE TABLE IF NOT EXISTS `memory` (\
    `Id` bigint(20) NOT NULL AUTO_INCREMENT,\
    `logic_id` varchar(33) NOT NULL DEFAULT '',\
    `name` varchar(255) NOT NULL DEFAULT '',\
    `author_id` varchar(33) NOT NULL DEFAULT '',\
    `author_name` varchar(64) NOT NULL DEFAULT '',\
    `owner_id` varchar(33) NOT NULL DEFAULT '',\
    `owner_name` varchar(64) NOT NULL DEFAULT '',\
    `happen_time` bigint(13) NOT NULL DEFAULT '0',\
    `create_time` bigint(13) NOT NULL DEFAULT '0',\
    PRIMARY KEY (`Id`),\
    UNIQUE KEY `logic_id` (`logic_id`),\
    KEY `owner_id` (`owner_id`)\
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;";
var createTableMemoryBox = "CREATE TABLE IF NOT EXISTS `memorybox` (\
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
    `create_time` bigint(13) DEFAULT NULL,\
    `take_time` bigint(13) DEFAULT NULL,\
    PRIMARY KEY (`Id`),\
    UNIQUE KEY `logic_id` (`logic_id`),\
    UNIQUE KEY `uni_id` (`memory_id`,`sender_id`,`receiver_id`),\
    KEY `receiver_id` (`receiver_id`),\
    KEY `receiver_name` (`receiver_name`),\
    KEY `sender_id` (`sender_id`)\
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;";
var createTableSecret = "CREATE TABLE IF NOT EXISTS `secret` (\
    `Id` bigint(20) NOT NULL AUTO_INCREMENT,\
    `logic_id` varchar(33) NOT NULL DEFAULT '',\
    `memory_id` varchar(33) NOT NULL DEFAULT '',\
    `url` varchar(2048) NOT NULL DEFAULT '',\
    `s_order` int(11) NOT NULL DEFAULT '0',\
    `width` int(11) DEFAULT NULL,\
    `height` int(11) DEFAULT NULL,\
    `size` bigint(13) DEFAULT NULL,\
    `create_time` bigint(13) DEFAULT NULL,\
    PRIMARY KEY (`Id`),\
    UNIQUE KEY `uni_id` (`logic_id`,`memory_id`),\
    KEY `memory_id` (`memory_id`),\
    KEY `logic_id` (`logic_id`)\
    ) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8;";

var COMMON_OK = 0;
var COMMON_ERROR_DB = -101;
var COMMON_ERROR_PARAM_ILLEGAL = -111;
var COMMON_ERROR_DATA_NOT_EXIST = -121;
var COMMON_ERROR_DATA_DUP = -122;
var COMMON_ERROR_DATA_EMPTY = -123;
var COMMON_ERROR_DENY = -131;// 数据操作权限异常，操作被拒绝

function createUuid(conn, prefix, callback) {
    var fun = function (err, rows, fields) {
        if (err) {
            if (callback)
                callback(COMMON_ERROR_DB);
            return;
        }
        var uuid = rows[0]['uuid()'];
        uuid = prefix + uuid.replace(new RegExp(/(-)/g), '');
        if (callback)
            callback(COMMON_OK, uuid);
    };
    if (conn) {
        conn.query( 'SELECT uuid()', fun);
    } else {
        pool.getConnection(function(err, connection) {
            if (err) {
                if (callback)
                    callback(COMMON_ERROR_DB, null);
                return;
            }
            connection.query( 'SELECT uuid()',function(err, rows, fields) {
                connection.release();
                fun(err, rows, fields);
            });
        });

    }
}

function getTableItem (conn, tableName, fieldName, fieldValue, callback) {
    if (!fieldValue) {
        if (callback)
            callback(COMMON_ERROR_PARAM_ILLEGAL);
        return;
    }
    var fun = function (err, rows, fields) {
        if (err) {
            if (callback)
                callback(COMMON_ERROR_DB);
            return;
        }
        if (!rows || rows.length === 0) {
            if (callback)
                callback(COMMON_ERROR_DATA_NOT_EXIST);
            return;
        }
        if (callback)
            callback(COMMON_OK, rows[0])
    };
    if (conn) {
        conn.query('SELECT * FROM ' + tableName + ' WHERE ' + fieldName + ' = ?',
            [fieldValue], fun);
    } else {
        pool.getConnection(function(err, connection) {
            if (err) {
                if (callback)
                    callback(COMMON_ERROR_DB);
                return;
            }
            connection.query('SELECT * FROM ' + tableName + ' WHERE ' + fieldName + ' = ?',
                [fieldValue],
                function (err, rows, fields) {
                    connection.release();
                    fun(err, rows, fields);
                });
        });
    }
}

function getTableItems (conn, tableName, fieldName, fieldValue, callback) {
    if (!fieldValue) {
        if (callback)
            callback(COMMON_ERROR_PARAM_ILLEGAL);
        return;
    }
    var fun = function (err, rows, fields) {
        if (err) {
            if (callback)
                callback(COMMON_ERROR_DB);
            return;
        }
        if (callback)
            callback(COMMON_OK, rows)
    };
    if (conn) {
        conn.query('SELECT * FROM ' + tableName + ' WHERE ' + fieldName + ' = ?',
            [fieldValue], fun);
    } else {
        pool.getConnection(function(err, connection) {
            if (err) {
                if (callback)
                    callback(COMMON_ERROR_DB);
                return;
            }
            connection.query('SELECT * FROM ' + tableName + ' WHERE ' + fieldName + ' = ?',
                [fieldValue],
                function (err, rows, fields) {
                    connection.release();
                    fun(err, rows, fields);
                });
        });
    }
}

function parseJsonArray(data) {
    var arr = null;
    if (data instanceof Array) {
        arr = data;
    } else if (typeof data === 'string') {
        arr = JSON.parse(data);
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
            callback(COMMON_ERROR_PARAM_ILLEGAL);
        return;
    }
    var desArray = parseJsonArray(user.description);
    if (!desArray || desArray.length === 0) {
        if (callback)
            callback(COMMON_ERROR_PARAM_ILLEGAL);
        return;
    }
    var fun = function(connection, callback) {
        createUuid(connection, 'u', function(err, logicId) {
            if (err) {
                if (callback)
                    callback(err);
                return;
            }
            // 先将descriptions排序，再转化成字符串
            desArray.sort();
            var desStr = JSON.stringify(desArray);
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
                            callback(err.code === 'ER_DUP_ENTRY' ? COMMON_ERROR_DATA_DUP : COMMON_ERROR_DB);
                        return;
                    }
                    console.log('[user] insert a row. logicId=' + logicId + ',name=' + user.name);
                    if (callback)
                        callback(COMMON_OK, logicId)
                });
        });
    };
    if (conn) {
        fun(conn, callback);
    } else {
        pool.getConnection(function(err, connection) {
            if (err) {
                if (callback)
                    callback(COMMON_ERROR_DB);
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
            state : 0
        };
        createUser(connection, user, function (err, userId) {
            if (err === COMMON_ERROR_DATA_DUP) {
                // 重复添加，则说明该账号已经存在，直接该账号id
                var desArray = parseJsonArray(description);
                desArray.sort();
                var desStr = JSON.stringify(desArray);
                connection.query('SELECT * FROM ' + TABLE_USER + ' WHERE name = ? AND description = ?',
                    [name, desStr], function (err, rows, fields) {
                        if (err) {
                            if (callback)
                                callback(COMMON_ERROR_DB);
                            return;
                        }
                        if (!rows || rows.length === 0) {
                            if (callback)
                                callback(COMMON_ERROR_DATA_NOT_EXIST);
                            return;
                        }
                        if (callback)
                            callback(COMMON_OK, rows[0].logic_id)
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
                    callback(COMMON_ERROR_DB);
                return;
            }
            fun(connection, function(err, result) {
                connection.release();
                callback(err, result);
            });
        });
    }
}


// ================== 初始化数据库(start) ================== //
function initDatabase(callback) {
    pool.getConnection(function(err, connection) {
        if (err) {
            if (callback)
                callback(COMMON_ERROR_DB);
            return;
        }
        var tableArray = [createTableUser, createTableUserRelation,
            createTableMemory, createTableMemoryBox, createTableSecret];
        connection.query(tableArray.join('\n'),
            function (err, results) {
                connection.release();
                if (err) {
                    if (callback)
                        callback(COMMON_ERROR_DB);
                    return;
                }
                if (callback)
                    callback(COMMON_OK, rows)
            });
    });
}
initDatabase();
// ================== 初始化数据库(end) ================== //


// ================== user(start) ================== //
/**
 * 搜索账号(支持模糊/严格两种模式)。
 * @param name
 * @param descriptions 必须是JSON数组字符串，数组可以为空
 * @param strict
 * @param callback
 */
exports.searchAccount = function(name, descriptions, strict, callback) {
    if (!name) {
        if (callback)
            callback(COMMON_ERROR_PARAM_ILLEGAL);
        return;
    }
    var desArray = parseJsonArray(descriptions);
    if (descriptions) {
        if (!desArray) {
            if (callback)
                callback(COMMON_ERROR_PARAM_ILLEGAL);
            return;
        }
    }
    pool.getConnection(function(err, connection) {
        if (err) {
            if (callback)
                callback(COMMON_ERROR_DB);
            return;
        }
        var sql = 'SELECT * FROM ' + TABLE_USER + ' WHERE name = ' + mysql.escape(name);
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
                    callback(COMMON_ERROR_DB);
                return;
            }
            if (callback)
                callback(COMMON_OK, rows)
        });
    });
};

/**
 * 精确获取账号。
 * @param userId
 * @param callback
 */
exports.getAccount = function (userId, callback) {
    getTableItem(null, TABLE_USER, 'logic_id', userId, callback);
};

/**
 * 用于激活时获取种子账号详情和对应的托管Memory。
 * @param userId
 * @param callback
 */
exports.getSeedAccountDetail = function (userId, callback) {
    if (!userId) {
        if (callback)
            callback(COMMON_ERROR_PARAM_ILLEGAL);
        return;
    }
    pool.getConnection(function(err, connection) {
        if (err) {
            if (callback)
                callback(COMMON_ERROR_DB);
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
            if (user.state !== 0) {
                connection.release();
                if (callback)
                    callback(COMMON_ERROR_DENY);
            }
            getTableItems(connection, TABLE_BOX, 'receiver_id', userId, function(err, boxItems) {
                if (err) {
                    connection.release();
                    if (callback)
                        callback(err);
                    return;
                }
                // 找不到对应的托管Memory
                if (!boxItems || boxItems.length === 0) {
                    // TODO 删除该种子账号
                    connection.release();
                    if (callback)
                        callback(COMMON_ERROR_DATA_NOT_EXIST);
                }
                user.boxItems = boxItems;
                connection.release();
                if (callback)
                    callback(COMMON_OK);
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
            state : 1,
            password : password
        }, callback);
};

/**
 * 验证种子账号的答案(相当于activateAccount的前半部分，但未真正激活)。
 * @param userId
 * @param boxId
 * @param answer 不能为空
 * @param callback
 */
exports.answerSeedAccount = function (userId, boxId, answer, callback) {
    if (!userId || !answer) {
        if (callback)
            callback(COMMON_ERROR_PARAM_ILLEGAL);
        return;
    }
    pool.getConnection(function(err, connection) {
        if (err) {
            if (callback)
                callback(COMMON_ERROR_DB);
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
            if (user.state !== 0) {
                connection.release();
                if (callback)
                    callback(COMMON_ERROR_DENY);
            }
            getTableItem(connection, TABLE_BOX, 'logic_id', boxId, function(err, boxItem) {
                if (err) {
                    connection.release();
                    if (callback)
                        callback(err);
                    return;
                }
                // 验证托管memory的接收者就是这个种子账号
                if (boxItem.receiver_id !== userId) {
                    connection.release();
                    if (callback)
                        callback(COMMON_ERROR_DENY);
                }
                // 验证答案
                if (!boxItem.answer || boxItem.answer !== answer) {
                    connection.release();
                    if (callback)
                        callback(COMMON_ERROR_DENY);
                }
                connection.release();
                callback(COMMON_OK);
            });
        });
    });
};

/**
 * 激活种子账号，验证答案并设置密码。
 */
exports.activateAccount = function (userId, boxId, answer, password, salt, callback) {
    if (!userId || !boxId || !password || !answer) {
        if (callback)
            callback(COMMON_ERROR_PARAM_ILLEGAL);
        return;
    }
    pool.getConnection(function(err, connection) {
        if (err) {
            if (callback)
                callback(COMMON_ERROR_DB);
            return;
        }
        getTableItem(connection, TABLE_BOX, 'logic_id', boxId, function(err, boxItem){
            if (err) {
                connection.release();
                if (callback)
                    callback(err);
                return;
            }
            // 验证托管memory的接收者就是这个种子账号
            if (boxItem.receiver_id !== userId) {
                connection.release();
                if (callback)
                    callback(COMMON_ERROR_DENY);
                return;
            }
            // 验证答案
            var boxAnswer = salt ? cipher.md5(boxItem.answer, salt) : boxItem.answer;
            if (!boxAnswer || boxAnswer !== answer) {
                connection.release();
                if (callback)
                    callback(COMMON_ERROR_DENY);
                return;
            }
            // 更新账号state时，通过sql的写锁来保证账号不会重复激活
            connection.query('UPDATE ' + TABLE_USER + ' SET state = ?, activate_time = ?, ' +
                'password = ? WHERE logic_id = ? AND state = 0',
                [1, Date.now(), cipher.md5(password, userId), userId],
                function (err, results) {
                    connection.release();
                    if (err) {
                        if (callback)
                            callback(COMMON_ERROR_DB);
                        return;
                    }
                    if (results.affectedRows === 0) {
                        if (callback)
                            callback(COMMON_ERROR_DATA_NOT_EXIST);
                        return;
                    }
                    if (callback)
                        callback(COMMON_OK)
                });
        });
    });
};

exports.keepAliveAccount = function (userId, callback) {
    if (!userId) {
        if (callback)
            callback(COMMON_ERROR_PARAM_ILLEGAL);
        return;
    }
    pool.getConnection(function(err, connection) {
        if (err) {
            if (callback)
                callback(COMMON_ERROR_DB);
            return;
        }
        connection.query('UPDATE ' + TABLE_USER + ' SET alive_time = ? WHERE logic_id = ?',
            [Date.now(), userId],
            function (err, results) {
                connection.release();
                if (err) {
                    if (callback)
                        callback(COMMON_ERROR_DB);
                    return;
                }
                if (results.affectedRows === 0) {
                    if (callback)
                        callback(COMMON_ERROR_DATA_NOT_EXIST);
                    return;
                }
                if (callback)
                    callback(COMMON_OK)
            });
    });
};

exports.killAccount = function(userId, callback) {
    if (!userId) {
        if (callback)
            callback(COMMON_ERROR_PARAM_ILLEGAL);
        return;
    }
    pool.getConnection(function(err, connection) {
        if (err) {
            if (callback)
                callback(COMMON_ERROR_DB);
            return;
        }
        connection.query('UPDATE ' + TABLE_USER + ' SET state = ? WHERE logic_id = ? AND state = 1',
            [2, userId],
            function (err, results) {
                connection.release();
                if (err) {
                    if (callback)
                        callback(COMMON_ERROR_DB);
                    return;
                }
                if (results.affectedRows === 0) {
                    if (callback)
                        callback(COMMON_ERROR_DATA_NOT_EXIST);
                    return;
                }
                if (callback)
                    callback(COMMON_OK)
            });
    });
};

exports.destroyAccount = function (userId, callback) {
    // TODO 删除用户数据及所有相关内容
};

/**
 * 更新账号信息(包括descriptions, born_time, head_url)
 */
exports.updateAccount = function (userId, user_info, callback) {
    if (!userId || !user_info) {
        if (callback)
            callback(COMMON_ERROR_PARAM_ILLEGAL);
        return;
    }
    pool.getConnection(function(err, connection) {
        if (err) {
            if (callback)
                callback(COMMON_ERROR_DB);
            return;
        }
        var newValue = {};
        if (user_info.description) {
            newValue.description = user_info.description;
        }
        if (user_info.born_time) {
            newValue.born_time = user_info.born_time;
        }
        if (user_info.head_url) {
            newValue.head_url = user_info.head_url;
        }
        connection.query('UPDATE ' + TABLE_USER + ' SET ? WHERE logic_id = ' + mysql.escape(userId) + ' AND state = 1',
            newValue,
            function (err, results) {
                connection.release();
                if (err) {
                    if (callback)
                        callback(COMMON_ERROR_DB);
                    return;
                }
                if (results.affectedRows === 0) {
                    if (callback)
                        callback(COMMON_ERROR_DATA_NOT_EXIST);
                    return;
                }
                if (callback)
                    callback(COMMON_OK)
            });
    });
};

exports.changePassword = function (userId, oldp, newp, callback) {

};

/**
 * 获取好友列表。
 */
exports.getFriendAccount = function (userId, callback) {
    if (!userId) {
        if (callback)
            callback(COMMON_ERROR_PARAM_ILLEGAL);
        return;
    }
    pool.getConnection(function(err, connection) {
        if (err) {
            if (callback)
                callback(COMMON_ERROR_DB);
            return;
        }
        // TODO..
        connection.query('SELECT ');
    });
};
// ================== user(end) ================== //


// ================== memory(start) ================== //
exports.addMemory = function (name, userId, happenTime, callback) {
    if (!name || !userId || !happenTime) {
        if (callback)
            callback(COMMON_ERROR_PARAM_ILLEGAL);
        return;
    }
    pool.getConnection(function (err, connection) {
        if (err) {
            if (callback)
                callback(COMMON_ERROR_DB);
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
            createUuid(connection, 'm', function(err, logicId) {
                if (err) {
                    connection.release();
                    if (callback)
                        callback(err);
                    return;
                }
                connection.query('INSERT INTO ' + TABLE_MEMORY + ' SET ?',
                    {
                        logic_id: logicId,
                        name: name,
                        author_id: userId,
                        author_name : user.name,
                        owner_id: userId,
                        owner_name : user.name,
                        happen_time : happenTime,
                        create_time : Date.now()
                    },
                    function (err, result) {
                        connection.release();
                        if (err) {
                            if (callback)
                                callback(COMMON_ERROR_DB);
                            return;
                        }
                        console.log('[memory] insert a row. logicId=' + logicId + ',name=' + name);
                        if (callback)
                            callback(COMMON_OK, logicId)
                    });
            });
        });
    });
};

exports.deleteMemory = function (memoryId, userId, callback) {
    if (!memoryId || !userId) {
        if (callback)
            callback(COMMON_ERROR_PARAM_ILLEGAL);
        return;
    }
    pool.getConnection(function(err, connection) {
        if (err) {
            if (callback)
                callback(COMMON_ERROR_DB);
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
                    callback(COMMON_ERROR_DENY);
                return;
            }
            // 开始事务(2步)
            connection.beginTransaction(function(err) {
                if (err) {
                    connection.release();
                    if (callback)
                        callback(COMMON_ERROR_DB);
                    return;
                }
                // 1.删除memory
                connection.query('DELETE FROM ' + TABLE_MEMORY + ' WHERE logic_id = ?',
                    [memoryId],
                    function (err, results) {
                        if (err) {
                            connection.rollback(function() {
                                connection.release();
                                if (callback)
                                    callback(COMMON_ERROR_DB);
                            });
                            return;
                        }
                        // 2.删除memory包含的secret
                        connection.query('DELETE FROM ' + TABLE_SECRET + ' WHERE memory_id = ?',
                            [memoryId],
                            function (err, results) {
                                if (err) {
                                    connection.rollback(function() {
                                        connection.release();
                                        if (callback)
                                            callback(COMMON_ERROR_DB);
                                    });
                                    return;
                                }
                                connection.commit(function(err) {
                                    if (err) {
                                        connection.rollback(function() {
                                            connection.release();
                                            if (callback)
                                                callback(COMMON_ERROR_DB);
                                        });
                                        return;
                                    }
                                    if (callback)
                                        callback(COMMON_OK);
                                });
                            });
                    });
            });
        });
    });
};

/**
 * 赠送Memory。
 * 1.如果指定了receiverId，则不会创建新的种子账号。
 *   即精确赠送，可以不设置问题和答案。
 * 2.如果没指定receiverId，则会更根据严格匹配name+description的模式来判断是否要创建新的种子账号。
 *   即模糊赠送，必须设置问题和答案。
 * 3.数据库的memoryId+senderId+receiverId唯一性约束，保证了不会重复赠送。
 */
exports.sendMemory = function (memoryId, senderId, receiverId, receiverName,
                               receiverDescription, question, answer, callback) {
    if (!memoryId || !senderId) {
        if (callback)
            callback(COMMON_ERROR_PARAM_ILLEGAL);
        return;
    }
    // 要么指定接收者id，要么指定接收者的Name和Description
    if (!receiverId && !(receiverName || receiverDescription)) {
        if (callback)
            callback(COMMON_ERROR_PARAM_ILLEGAL);
        return;
    }
    // 模糊赠送，必须设置问答
    if (!receiverId && !(question || answer)) {
        if (callback)
            callback(COMMON_ERROR_PARAM_ILLEGAL);
        return;
    }
    // 不可以自己赠送给自己！
    if (!receiverId && receiverId === senderId) {
        if (callback)
            callback(COMMON_ERROR_DENY);
        return;
    }
    pool.getConnection(function (err, connection) {
        if (err) {
            if (callback)
                callback(COMMON_ERROR_DB);
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
                    callback(COMMON_ERROR_DENY);
                return;
            }
            connection.query("SELECT COUNT(*) FROM " + TABLE_SECRET + " WHERE memory_id = ?",
                [memoryId],
                function(err, results) {
                    if (err) {
                        connection.release();
                        if (callback)
                            callback(COMMON_ERROR_DB);
                        return;
                    }
                    // memory必须包含有secret
                    if (results[0]['COUNT(*)'] === 0) {
                        connection.release();
                        if (callback)
                            callback(COMMON_ERROR_DATA_EMPTY);
                        return;
                    }
                    createUuid(connection, 'b', function(err, logicId) {
                        if (err) {
                            connection.release();
                            if (callback)
                                callback(err);
                            return;
                        }
                        // 开始事务
                        connection.beginTransaction(function(err) {
                            if (err) {
                                connection.release();
                                if (callback)
                                    callback(COMMON_ERROR_DB);
                                return;
                            }
                            var addBoxFun = function(userId) {
                                // 第三步，生成box记录
                                connection.query('INSERT INTO ' + TABLE_BOX + ' SET ?',
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
                                        create_time: Date.now()
                                    },
                                    function (err, result) {
                                        if (err) {
                                            connection.rollback(function () {
                                                connection.release();
                                                if (callback)
                                                    callback(COMMON_ERROR_DB);
                                            });
                                            return;
                                        }
                                        console.log('[sendMemory] insert a row. boxId=' + logicId);
                                        connection.commit(function (err) {
                                            if (err) {
                                                connection.rollback(function () {
                                                    connection.release();
                                                    if (callback)
                                                        callback(COMMON_ERROR_DB);
                                                });
                                                return;
                                            }
                                            console.log('[sendMemory] send memory success! logicId=' + logicId);
                                            connection.release();
                                            if (callback)
                                                callback(COMMON_OK, logicId);
                                        });
                                    });
                            };
                            // 第一步，指定了receiverId的用户，验证账号的有效性
                            if (receiverId) {
                                getTableItem(connection, TABLE_USER, 'logic_id', receiverId, function(err, user) {
                                    if (err) {
                                        connection.rollback(function() {
                                            connection.release();
                                            if (callback)
                                                callback(COMMON_ERROR_DB);
                                        });
                                        return;
                                    }
                                    // 验证用户状态(死亡状态没法接收Memory)
                                    if (user.state !== 0 && user.state !== 1) {
                                        connection.rollback(function() {
                                            connection.release();
                                            if (callback)
                                                callback(COMMON_ERROR_DENY);
                                        });
                                        return;
                                    }
                                    addBoxFun(receiverId);
                                });
                            }
                            // 第二步，未指定receiverId的用户，创建或获取账号Id
                            else {
                                createOrGetUser(connection, receiverName, receiverDescription, senderId,
                                    function(err, userId) {
                                        if (err) {
                                            connection.rollback(function() {
                                                connection.release();
                                                if (callback)
                                                    callback(COMMON_ERROR_DB);
                                            });
                                            return;
                                        }
                                        addBoxFun(userId);
                                    });
                            }
                        });
                    });
                });
        });
    });
};

/**
 * 确认接收Memory。
 * 1.如果receiverId是未激活账号，则需要先激活账号
 * 2.如果双方不是好友关系，自动建立好友关系
 */
exports.receiveMemory = function (boxId, receiverId, answer, salt, callback) {
    if (!boxId || !receiverId) {
        if (callback)
            callback(COMMON_ERROR_PARAM_ILLEGAL);
        return;
    }
    pool.getConnection(function(err, connection) {
        if (err) {
            if (callback)
                callback(COMMON_ERROR_DB);
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
            if (user.state !== 1) {
                connection.release();
                if (callback)
                    callback(COMMON_ERROR_DENY);
                return;
            }
            var receiverName = user.name;
            getTableItem(connection, TABLE_BOX, 'logic_id', boxId, function(err, boxItem){
                if (err) {
                    connection.release();
                    if (callback)
                        callback(err);
                    return;
                }
                // 如果设置了接收者id，则验证接收者id
                if (boxItem.receiver_id && boxItem.receiver_id !== receiverId) {
                    connection.release();
                    if (callback)
                        callback(COMMON_ERROR_DENY);
                    return;
                }
                // 如果设置了问答，则验证答案是否一致
                var boxAnswer = salt ? cipher.md5(boxItem.answer, salt) : boxItem.answer;
                if (boxAnswer && boxAnswer !== answer) {
                    // TODO 密码回答错误N次，自动销毁？
                    connection.release();
                    if (callback)
                        callback(COMMON_ERROR_DENY);
                    return;
                }
                // 答案一致(或根本没有答案)，则将memory复制一份到receiver账号中，并删除box中的此条记录
                getTableItem(connection, TABLE_MEMORY, 'logic_id', boxItem.memory_id,
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
                                    callback(COMMON_ERROR_DB);
                                return;
                            }
                            // 第一步：复制memory数据到receiverId名下
                            createUuid(connection, 'm', function(err, memoryId) {
                                if (err) {
                                    connection.release();
                                    if (callback)
                                        callback(err);
                                    return;
                                }
                                connection.query('INSERT INTO ' + TABLE_MEMORY + ' SET ?',
                                    {
                                        logic_id : memoryId,
                                        name : memory.name,
                                        author_id : memory.author_id,
                                        author_name : memory.author_name,
                                        owner_id : receiverId,
                                        owner_name : receiverName,
                                        happen_time : memory.happen_time,
                                        create_time : Date.now()
                                    },
                                    function (err, result) {
                                        if (err) {
                                            connection.rollback(function() {
                                                connection.release();
                                                if (callback)
                                                    callback(COMMON_ERROR_DB);
                                            });
                                            return;
                                        }
                                        console.log('[receiveMemory] insert a row into table memory. logic_id=' + memoryId);
                                        // 第二步：深度复制:复制memory包含的所有secret数据?
                                        connection.query('INSERT INTO ' + TABLE_SECRET + '(logic_id,memory_id,url,s_order,width,height,size,create_time)' +
                                            ' SELECT logic_id,?,url,s_order,width,height,size,? FROM ' + TABLE_SECRET + ' WHERE memory_id = ?',
                                            [memoryId, Date.now(), boxItem.memory_id],
                                            function (err, result) {
                                                if (err) {
                                                    connection.rollback(function() {
                                                        connection.release();
                                                        if (callback)
                                                            callback(COMMON_ERROR_DB);
                                                    });
                                                    return;
                                                }
                                                console.log('[receiveMemory] copy secret where memory_id=' + memoryId);
                                                // 第三步：删除memorybox的那条数据
                                                connection.query('DELETE FROM ' + TABLE_BOX + ' WHERE logic_id = ?',
                                                    [boxId],
                                                    function (err, results) {
                                                        if (err) {
                                                            connection.rollback(function() {
                                                                connection.release();
                                                                if (callback)
                                                                    callback(COMMON_ERROR_DB);
                                                            });
                                                            return;
                                                        }
                                                        console.log('[receiveMemory] delete a row from memorybox where logic_id=' + boxId);
                                                        // 第四步：建立好友关系
                                                        var rid = concatId(receiverId, boxItem.sender_id);
                                                        connection.query('INSERT INTO ' + TABLE_RELATION + ' SET ?',
                                                            {
                                                                logic_id : rid,
                                                                u1_id : receiverId,
                                                                u1_name : receiverName,
                                                                u2_id : boxItem.sender_id,
                                                                u2_name : boxItem.sender_name,
                                                                create_time : Date.now()
                                                            },
                                                            function (err, result) {
                                                                // 重复添加的好友关系，不是error
                                                                if (err && err.code !== 'ER_DUP_ENTRY') {
                                                                    connection.rollback(function () {
                                                                        connection.release();
                                                                        if (callback)
                                                                            callback(COMMON_ERROR_DB);
                                                                    });
                                                                    return;
                                                                }
                                                                connection.commit(function(err) {
                                                                    if (err) {
                                                                        connection.rollback(function() {
                                                                            connection.release();
                                                                            if (callback)
                                                                                callback(COMMON_ERROR_DB);
                                                                        });
                                                                        return;
                                                                    }
                                                                    console.log('[receiveMemory] success!!');
                                                                    connection.release();
                                                                    if (callback)
                                                                        callback(COMMON_OK, memoryId);
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

exports.getMemoryDetail = function (memoryId, userId, callback) {
    if (!memoryId || !userId) {
        if (callback)
            callback(COMMON_ERROR_PARAM_ILLEGAL, null);
        return;
    }
    pool.getConnection(function(err, connection) {
        if (err) {
            if (callback)
                callback(COMMON_ERROR_DB, null);
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
                    callback(COMMON_ERROR_DENY, null);
                return;
            }
            getTableItems(connection, TABLE_SECRET, 'memory_id', memoryId, function(err, secrets) {
                connection.release();
                if (err) {
                    if (callback)
                        callback(err, null);
                    return;
                }
                memory.secrets = secrets;
                if (callback)
                    callback(COMMON_OK, memory)
            });
        });
    });
};

exports.getMemoryList = function (userId, callback) {
    if (!userId) {
        if (callback)
            callback(COMMON_ERROR_PARAM_ILLEGAL);
        return;
    }
    getTableItems(null, TABLE_MEMORY, 'owner_id', userId, function(err, memorys) {
        if (err) {
            if (callback)
                callback(err);
            return;
        }
        if (callback)
            callback(COMMON_OK, memorys)
    });
};

exports.viewMemoryBox = function (userId, callback) {
    if (!userId) {
        if (callback)
            callback(COMMON_ERROR_PARAM_ILLEGAL);
        return;
    }
    pool.getConnection(function(err, connection) {
        if (err) {
            if (callback)
                callback(COMMON_ERROR_DB);
            return;
        }
        getTableItem(connection, TABLE_USER, 'logic_id', userId, function(err, user) {
            if (err) {
                connection.release();
                if (callback)
                    callback(err);
                return;
            }
            var userName = user.name;
            var desArray = JSON.parse(user.description);// 解析成数组对象，数据库存的是JSON字符串
            var sql = 'SELECT * FROM ' + TABLE_BOX + ' WHERE receiver_id = ' + mysql.escape(userId)
                + ' OR (receiver_name = ' + mysql.escape(userName);
            if (desArray instanceof Array) {
                for (var i = 0; i < desArray.length; i++) {
                    sql = sql + ' AND receiver_description LIKE ' + mysql.escape('%' + desArray[i] + '%');
                }
            }
            sql = sql + ')';
            connection.query(sql, function (err, rows, fields) {
                connection.release();
                if (err) {
                    if (callback)
                        callback(COMMON_ERROR_DB);
                    return;
                }
                if (callback)
                    callback(COMMON_OK, rows)
            });
        });
    })
};

exports.addSecretToMemory = function (memoryId, userId, secret, callback) {
    if (!memoryId || !secret || !secret.url) {
        if (callback)
            callback(COMMON_ERROR_PARAM_ILLEGAL);
        return;
    }
    pool.getConnection(function (err, connection) {
        if (err) {
            if (callback)
                callback(COMMON_ERROR_DB);
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
                    callback(COMMON_ERROR_DENY);
                return;
            }
            createUuid(connection, 's', function(err, logicId) {
                if (err) {
                    connection.release();
                    if (callback)
                        callback(err);
                    return;
                }
                connection.query("SELECT COUNT(*) FROM " + TABLE_SECRET + " WHERE memory_id = ?",
                    [memoryId],
                    function(err, results) {
                        if (err) {
                            connection.release();
                            if (callback)
                                callback(COMMON_ERROR_DB);
                            return;
                        }
                        // 获取order
                        var order = results[0]['COUNT(*)'];
                        console.log('[addSecretToMemory] order=' + order);
                        connection.query('INSERT INTO ' + TABLE_SECRET + ' SET ?',
                            {
                                logic_id: logicId,
                                memory_id: memoryId,
                                url: secret.url,
                                s_order : order,
                                size: secret.size,
                                width: secret.width,
                                height: secret.height,
                                create_time: Date.now()
                            },
                            function (err, result) {
                                connection.release();
                                if (err) {
                                    if (callback)
                                        callback(COMMON_ERROR_DB);
                                    return;
                                }
                                console.log('[addSecretToMemory] insert a row. logicId=' + logicId);
                                if (callback)
                                    callback(COMMON_OK, logicId)
                            });
                    });
            });
        });
    });
};

exports.deleteSecretFromMemory = function (memoryId, userId, secretId, callback) {
    if (!memoryId || !userId) {
        if (callback)
            callback(COMMON_ERROR_PARAM_ILLEGAL);
        return;
    }
    pool.getConnection(function(err, connection) {
        if (err) {
            if (callback)
                callback(COMMON_ERROR_DB);
            return;
        }
        getTableItem(connection, TABLE_MEMORY, 'logic_id', memoryId, function(err, memory) {
            if (err) {
                connection.release();
                if (callback)
                    callback(err, null);
                return;
            }
            if (memory.owner_id !== userId) {
                connection.release();
                if (callback)
                    callback(COMMON_ERROR_DENY);
                return;
            }
            connection.query('DELETE FROM ' + TABLE_SECRET+ ' WHERE logic_id = ?',
                [secretId],
                function (err, results) {
                    connection.release();
                    if (err) {
                        if (callback)
                            callback(COMMON_ERROR_DB);
                        return;
                    }
                    console.log('[addSecretToMemory] delete a row. logicId=' + secretId);
                    if (callback)
                        callback(COMMON_OK)
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
            callback(COMMON_ERROR_PARAM_ILLEGAL);
        return;
    }
    var orderArr = parseJsonArray(orders);
    if (!orderArr || orderArr.length === 0) {
        if (callback)
            callback(COMMON_ERROR_PARAM_ILLEGAL);
        return;
    }
    pool.getConnection(function (err, connection) {
        if (err) {
            if (callback)
                callback(COMMON_ERROR_DB);
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
                    callback(COMMON_ERROR_DENY);
                return;
            }
            var sql = "INSERT INTO " + TABLE_SECRET + "(logic_id, memory_id,s_order) VALUES";
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
                        callback(COMMON_ERROR_DB);
                    return;
                }
                if (results.affectedRows === 0) {
                    if (callback)
                        callback(COMMON_ERROR_DATA_NOT_EXIST);
                    return;
                }
                console.log('[orderSecret] success! affect rows:' + results.affectedRows);
                if (callback)
                    callback(COMMON_OK)
            });
        });
    });
};
// ================== memory(start) ================== //