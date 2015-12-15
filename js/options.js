$(function() {
    'use strict';
    var types = {
        'application/json': 'json',
        'image/gif': 'gif',
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/svg+xml': 'svg',
        'image/tiff': 'tif',
        'image/vnd.adobe.photoshop': 'psd',
        'image/webp': 'webp',
        'image/x-icon': 'ico',
        'image/x-ms-bmp': 'bmp',
        'text/jsx': 'jsx',
        'text/javascript': 'js',
        'application/javascript': 'js',
        'text/css': 'css',
        'text/less': 'less',
        'text/x-sass': 'sass',
        'text/x-scss': 'scss',
        'video/x-flv': 'flv',
        'audio/mpeg': 'mp3'
    };

    // var conf = Config.get();
    // var $doc = $(document);

    var Charles = {
        init: function() {
            this.$list = $('#j-list');
            this.template = Util.template($('#j-item').html());
            this.bindEvents();
        },
        bindEvents: function() {
            var _this = this;
            var conf = Config.get();
            var $doc = $(document);
            chrome.webRequest.onHeadersReceived.addListener(function (details) {
                if (!conf.cross) {
                    return {};
                }
                var headers = details.responseHeaders;
                var index = _this.getHeader(headers, 'access-control-allow-origin', function (value, i) {
                    return i;
                });
                index === '' ? headers.push({
                    name: 'Access-Control-Allow-Origin',
                    value: '*'
                }) : headers[index].value = '*';

                return {
                    responseHeaders: headers
                }
            }, conf.responseFilter, ['blocking', 'responseHeaders']);

            chrome.webRequest.onCompleted.addListener(function (details) {
                var headers = details.responseHeaders;
                var data = {
                    tabId: details.tabId,
                    name: _this.getName(details.url),
                    url: details.url,
                    method: details.method,
                    fromCache: details.fromCache,
                    statusCode: details.statusCode,
                    ip: details.ip || '',
                    size: _this.getHeader(headers, 'content-length', _this.byteFmt),
                    type: _this.getHeader(headers, 'content-type', _this.typeFmt)
                };
                _this.render(data);
                return {};
            }, conf.requestFilter, ['responseHeaders']);
        },
        getName: function (url) {
            var parser = document.createElement('a');
            parser.href = url;
            var paths = parser.pathname.split('/');
            return paths[paths.length - 1];
        },
        getHeader: function (headers, type, iteratee) {
            var result = '';
            for (var i = headers.length - 1; i >= 0; i--) {
                if (headers[i].name.toLowerCase() === type) {
                    result = iteratee(headers[i].value, i);
                    break;
                }
            };
            return result;
        },
        byteFmt: function (size) {
            size = +size;
            var name = ['B','KB','MB','GB','TB','PB'];
            var pos = 0;
            while(size >= 1024){
                size /= 1024;
                pos++;
            }
            return size.toFixed(2) + ' ' + name[pos];
        },
        typeFmt: function (content) {
            var types = ['svg', 'xml', 'html', 'javascript', 'json', 'image', 'font', 'audio', 'video'];
            var type = 'other';
            for (var i = 0; i < types.length; i++) {
                if (content.indexOf(types[i]) > -1) {
                    type = types[i];
                    break;
                }
            };
            if (type === 'other' && /text\/(css|less|stylus|x-sass|x-scss)/.test(content)) {
                type = 'stylesheet';
            }
            return type;
        },
        render: function (obj) {
            this.$list.append(this.template(obj));
        }
    };

    Charles.init();
});






// chrome.webRequest.onBeforeRequest.addListener(function(details) {
//     console.log('onBeforeRequest', details);
//     return {};
// }, conf.requestFilter, ['blocking', 'requestBody']);

// chrome.webRequest.onBeforeSendHeaders.addListener(function(details) {
//  console.log('onBeforeSendHeaders', details);
//  var headers = details;
//  return {
//      requestHeaders: headers
//  };
// }, conf.requestFilter, ['blocking', 'requestHeaders']);
//
//
//

// window.addEventListener('storage', function () {
//     conf = Config.get();
// }, false);

// // 标签页关闭
// chrome.tabs.onRemoved.addListener(function (tabId) {
//     if (conf.requestFilter.tabId === tabId) {
//         Config.set('requestFilter.tabId', null);
//     }
//     if (conf.requestFilter.tabId === tabId) {
//         Config.set('responseFilter.tabId', null);
//     }
// });

// chrome.webRequest.onBeforeRequest.addListener(function(details) {
//     console.log('onBeforeRequest', details);
//     return {};
// }, conf.requestFilter, ['blocking', 'requestBody']);
//
// chrome.webRequest.onBeforeSendHeaders.addListener(function (details) {
//  console.log('onBeforeSendHeaders', details);
//  return {};
//  var headers = details;
//  return {
//      requestHeaders: headers
//  };
// }, conf.requestFilter, ['blocking', 'requestHeaders']);
