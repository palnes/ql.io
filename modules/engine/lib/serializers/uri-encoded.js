/*
 * Copyright 2012 eBay Software Foundation
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

'use strict';

var _ = require('underscore'),
    uriTemplate = require('ql.io-uri-template');

exports.accepts = function(type, template, content) {
    return type === 'application/x-www-form-urlencoded';
};

exports.serialize = function(type, content, params, defaults) {
    var template = uriTemplate.parse(content);
    var arr = template.format(params, defaults);
    return _.isArray(arr) ? arr[0] : arr;
}