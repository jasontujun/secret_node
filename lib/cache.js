/**
 * Created by jason on 2016/3/10.
 */
'use strict';

var cache = Object.create(null);
var debug = false;
var hitCount = 0;
var missCount = 0;
var size = 0;

exports.put = function(key, value, time) {
    if (debug) {
        console.log('caching: %s = %j (@%s)', key, value, time);
    }

    if (typeof time !== 'undefined' && (typeof time !== 'number' || isNaN(time) || time <= 0)) {
        throw new Error('Cache timeout must be a positive number');
    }

    cache[key] = {
        value: value,
        expire: time + Date.now()
    };

    return value;
};

exports.del = function(key) {
    if (cache[key]) {
        size--;
        delete cache[key];
        return true;
    } else {
        return false;
    }
};

exports.clear = function() {
    size = 0;
    cache = Object.create(null);
    if (debug) {
        hitCount = 0;
        missCount = 0;
    }
};

exports.get = function(key) {
    var data = cache[key];
    if (typeof data != "undefined") {
        if (isNaN(data.expire) || data.expire >= Date.now()) {
            if (debug) hitCount++;
            return data.value;
        } else {
            // free some space
            if (debug) missCount++;
            size--;
            delete cache[key];
        }
    } else if (debug) {
        missCount++;
    }
    return null;
};

exports.size = function() {
    return size;
};

exports.memsize = function() {
    var size = 0,
        key;
    for (key in cache) {
        size++;
    }
    return size;
};

exports.debug = function(bool) {
    debug = bool;
};

exports.hits = function() {
    return hitCount;
};

exports.misses = function() {
    return missCount;
};

exports.keys = function() {
    return Object.keys(cache);
};
