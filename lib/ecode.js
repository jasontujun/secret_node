/**
 * 统一的错误码定义。
 */

exports.COMMON_OK = 0;


exports.COMMON_DB = -101;
exports.COMMON_PARAM_ILLEGAL = -111;
exports.COMMON_DATA_NOT_EXIST = -121;
exports.COMMON_DATA_DUP = -122;
exports.COMMON_DATA_EMPTY = -123;
exports.COMMON_DENY = -131;// 数据操作权限异常，操作被拒绝


exports.USER_TOKEN_CHECK = -201;
exports.USER_TOKEN_CREATE = -202;
exports.USER_DUP_LOGIN = -211;
exports.USER_PASSWORD = -212;


exports.MEMORY_DUP_RECEIVE = -401;
exports.MEMORY_ERROR_ANSWER = -411;