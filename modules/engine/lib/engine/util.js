/*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var _ = require('underscore');

// Fill params from given args. In stead of merging params, simply wire up a __proto__ chain
exports.prepareParams = function() {
    var params = {};
    var ref, arg;
    for(var i = 0; i < arguments.length; i++) {
        arg = arguments[i];
        if(arg === undefined) {
            continue;
        }
        if(ref === undefined) {
            ref = arg;
            params.__proto__ = ref;
        }
        else {
            // Delete undefined properties as an undefined will override a defined in the __proto__
            // chain
            _.each(arg, function(v, p) {
                if(v === undefined) delete arg[p];
            });
            ref.__proto__ = arg;
            ref = arg;
        }
    }
    return params;
}


var maxRequests;
exports.getMaxRequests = function(config, logEmitter) {
    if (config && config.maxNestedRequests) {
        maxRequests = config.maxNestedRequests;
    }

    if (!maxRequests) {
        maxRequests = 50;
        logEmitter.emitWarning('config.maxNestedRequests is undefined! Defaulting to ' + maxRequests);
    }

    return maxRequests;
}


function isDup(obj, dupGuard) {
    if(typeof obj === "object") {
        if(-1 !== dupGuard.indexOf(obj)) {
            return true;
        }
        dupGuard.push(obj);
    }
    return false;
}

var toNormalizedSting = exports.toNormalizedSting = function(obj, dupGuard) {
    dupGuard = dupGuard || [];
    var ret = '';
    if(_.isNull(obj) ||
        _.isNaN(obj) ||
        _.isBoolean(obj) ||
        _.isNumber(obj) ||
        _.isString(obj) ||
        _.isDate(obj)) {
        ret = JSON.stringify(obj);
    }
    else if( _.isUndefined(obj) || _.isFunction(obj)){
        ret = "null";
    }
    else if(_.isRegExp(obj) ){
        ret = obj.toString();
    }
    else if (_.isArray(obj)) {
        obj.sort();
        ret = JSON.stringify(_.chain(obj)
            .map(function (ele) {
                return isDup(ele, dupGuard) ? '<circ>' : toNormalizedSting(ele, dupGuard);
            })
            .sortBy(function (ele) {
                return ele;
            })
            .value());
    }
    else if(typeof obj == "object"){
        ret =  JSON.stringify(isDup(obj,dupGuard) ? '<circ>' :
            _.chain(obj)
                .keys()
                .sortBy(function(ele){
                    return ele;
                })
                .reduce(function(memo,key){
                    memo[key] = toNormalizedSting(obj[key], dupGuard);
                    return memo;
                },{})
                .value());
    }

    return ret;
}

var getCache = exports.getCache = function (config, cache, engine, errorCb) {
    errorCb = errorCb || function(e) {};

    if(!cache && config.cache && config.cache.impl){
        var cacheConfig = config.cache.options;
        var newCache;
        try {
            if(cacheConfig == undefined){
                newCache = new (cacheRequire(config.cache.impl))();
            }
            else {
                newCache = new (cacheRequire(config.cache.impl))(cacheConfig);
            }
            if(_.isFunction(newCache.start)){
                newCache.start();
            }
            cache = newCache;
        }
        catch(e){
            errorCb({cache:config.cache,
                curDir: __dirname,
                error:e});
        }
    }

    if(cache) {
        cache.on('start', function(event){
            engine.emitEvent({clazz: 'info', name: 'cacheStart'}, JSON.stringify({name:'cacheStart', event:event}));
        });
        cache.on('end', function(event){
            engine.emitEvent({clazz: 'info', name: 'cacheEnd'}, JSON.stringify({name:'cacheEnd', event:event}));
        });
        cache.on('new', function(event){
            engine.emitEvent({clazz: 'info', name: 'cacheNew'}, JSON.stringify({name:'cacheNew', event:event}));
        });
        cache.on('hit', function(event){
            engine.emitEvent({clazz: 'info', name: 'cacheHit'}, JSON.stringify({name:'cacheHit', event:event}));
        });
        cache.on('miss', function(event){
            engine.emitEvent({clazz: 'info', name: 'cacheMiss'}, JSON.stringify({name:'cacheMiss', event:event}));
        });
        cache.on('heartbeat', function(event){
            engine.emitHeartBeat({clazz: 'heartbeat', name: 'cacheHeartBeat'},
                JSON.stringify({name:'cacheHeartBeat', event:event}));
        });
        cache.on('info', function(event){
            engine.emitEvent({clazz: 'info', name: 'cacheInfo'}, JSON.stringify({name:'cacheInfo', event:event}));
        });
        cache.on('error', function(event){
            engine.emitEvent({clazz: 'error', name: 'cacheError'}, JSON.stringify({name:'cacheError', event:event}));
        });
    }

    return cache;
}

function cacheRequire(name){
    var module;
    try{
        module = require(name);
    }
    catch(e){
        try {
            module = require(process.cwd() + '/node_modules/' + name)
        }
        catch(ex){
            throw e;
        }
    }
    return module;
}