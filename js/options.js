$(function() {
    'use strict';
    // var conf = Config.get();
    // var $doc = $(document);
    var doc = document;
    var Charles = {
        _prefix: 'rules~',
        init: function() {
            var _this = this;
            this.$list = $('#j-list');
            this.tplReq = Util.template($('#j-tpl-request').html());
            this.tplRule = Util.template($('#j-tpl-rule').html());
            chrome.storage.local.get(null, function (items) {
                var result = {};
                Util.keys(items).forEach(function(key) {
                    if (key.startsWith(_this._prefix)) {
                        result[key.replace(_this._prefix, '')] = items[key];
                    }
                });
                _this.rules = result;
                _this.bindEvents();
                _this.renderRule();
            });
        },
        bindEvents: function() {
            var _this = this;
            var conf = Config.get();
            // var $doc = $(document);

            window.addEventListener('storage', function () {
                conf = Config.get();
            }, false);

            chrome.webRequest.onBeforeRequest.addListener(function (details) {
                return _this.checkUrl(details.url);
            }, conf.requestFilter, ['blocking', 'requestBody']);

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
                console.log(details.requestId);
                var result = {};
                if (details.url.startsWith('chrome-extension://')) {
                    return result;
                }
                var headers = details.responseHeaders;
                var url = _this.urlParse(details.url);
                var data = {
                    id: url.host + url.pathname,
                    tabId: details.tabId,
                    name: url.name,
                    path: url.sub,
                    host: url.host,
                    url: details.url,
                    method: details.method,
                    fromCache: details.fromCache,
                    statusCode: details.statusCode,
                    ip: details.ip || '',
                    size: _this.getHeader(headers, 'content-length', _this.byteFmt),
                    type: _this.getHeader(headers, 'content-type', _this.typeFmt) || 'other'
                };
                _this.render(data);
                return result;
            }, conf.requestFilter, ['responseHeaders']);

            var $view = $('#j-view');
            this.$list.on('click', '.j-add', function() {
                $view.data('id', $(this).data('id')).show();
            });

            var $fields = $view.find('.form-control');
            $view.find('.view-tab').on('click', 'a', function() {
                var $this = $(this);
                if (!$this.hasClass('active')) {
                    $this.siblings().removeClass('active');
                    $this.addClass('active');
                    $fields.removeClass('active').eq($this.index()).addClass('active');
                }
            });

            var closeView = function () {
                $view.hide();
                $fields.val('');
            };

            // jsoneditor
            var editor = new JSONEditor(doc.getElementById('jsoneditor'), {
                mode: 'text'
            }, {
                'no': 0,
                'msg': 'success',
                'list': []
            });
            $view.on('click', '.close', closeView).on('change', '.j-file', function() {
                var file = this.files[0];
                var reader = new FileReader();
                reader.onload = function() {
                    _this.changeRule('add', {
                        id: $view.data('id'),
                        url: reader.result,
                        name: file.name,
                        type: 'file',
                        enable: 1
                    });
                };
                reader.readAsDataURL(file);
            }).on('click', '.j-save', function() {
                var $input = $fields.filter('.active');
                var index = $input.index();
                var result = {
                    id: $view.data('id'),
                    enable: 1
                };
                if (index === 0) {
                    var text = editor.get();
                    if (text) {
                        var mimeType = 'text/plain';
                        if (Util.isObject(text)) {
                            mimeType = 'application/json';
                            text = JSON.stringify(text);
                            result.name = 'json';
                        } else {
                            result.name = text;
                        }
                        result.url = 'data:' + mimeType + '; utf-8,' + encodeURIComponent(text);
                        result.type = 'text';
                        _this.changeRule('add', result);
                    }
                }
                if (index === 1) {
                    var url = $input.val().trim();
                    if (url.startsWith('file://')) {
                        _this.getFile(url, function (res) {
                            result.url = res;
                            result.type = 'url';
                            result.name = url;
                            _this.changeRule('add', result);
                        });
                    } else if (url.startsWith('http://') || url.startsWith('https://')) {
                        result.url = url;
                        result.type = 'url';
                        result.name = url;
                        _this.changeRule('add', result);
                    }
                }
                if (index === 2) {
                    var file = $input[0].files[0];
                    var reader = new FileReader();
                    reader.onload = function() {
                        result.url = reader.result;
                        result.name = file.name;
                        result.type = 'file';
                        _this.changeRule('add', result);
                    };
                    reader.readAsDataURL(file);
                }
                closeView();
            });

            var rules = this.rules;
            $('#j-rules').on('click', '.j-onoff', function() {
                var $this = $(this);
                var rule = rules[$this.closest('tr').data('id')];
                rule.enable = !rule.enable;
                _this.updateRule('update', rule);
                $this.text(rule.enable ? '关闭' : '开启');
            }).on('click', '.j-del', function() {
                var $tr = $(this).closest('tr');
                _this.changeRule('remove', $tr.data('id'));
                $tr.remove();
            });
        },
        urlParse: function(url) {
            var result = {};
            var parser = doc.createElement('a');
            parser.href = url;
            ['protocol', 'host', 'port', 'pathname', 'search', 'hash'].forEach(function(p) {
                result[p] = parser[p];
            });
            var paths = result.pathname.split('/');
            result.name = paths[paths.length - 1];
            result.sub = result.pathname === ('/' + result.name) ? result.host : result.pathname;
            result.name += result.search + result.hash;

            return result;
        },
        getHeader: function(headers, type, iteratee) {
            var result = '';
            for (var i = headers.length - 1; i >= 0; i--) {
                if (headers[i].name.toLowerCase() === type) {
                    result = iteratee(headers[i].value, i);
                    break;
                }
            };
            return result;
        },
        byteFmt: function(size) {
            size = +size;
            var name = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
            var pos = 0;
            while (size >= 1024) {
                size /= 1024;
                pos++;
            }
            return size.toFixed(2) + ' ' + name[pos];
        },
        typeFmt: function(content) {
            // application/x-shockwave-flash
            var types = ['svg', 'xml', 'html', 'script', 'json', 'image', 'font', 'audio', 'video'];
            var type = 'other';
            for (var i = 0; i < types.length; i++) {
                if (content.indexOf(types[i]) > -1) {
                    type = types[i];
                    break;
                }
            };
            if (type === 'other' && /text\/(css|less|stylus|x-sass|x-scss)/.test(content)) {
                type = 'style';
            }
            return type;
        },
        render: function(obj) {
            this.$list.append(this.tplReq(obj));
        },
        checkUrl: function(url) {
            var result = {};
            var parsed = this.urlParse(url);
            var rule = this.rules[parsed.host + parsed.pathname];
            if (rule && rule.enable) {
                result.redirectUrl = rule.url;
            }
            return result;
        },
        renderRule: function() {
            var arr = [];
            var rules = this.rules;
            for (var i in rules) {
                arr.push(this.renderOneRule(rules[i]));
            }
            $('#j-rules').html(arr.join(''));
        },
        renderOneRule: function (rule, tag) {
            var str = this.tplRule(rule);
            if (tag) {
                $('#j-rules').append(str);
            }else {
                return str;
            }
        },
        changeRule: function(type, rule) {
            if (type === 'remove') {
                delete this.rules[rule];
            } else {
                this.rules[rule.id] = rule;
            }
            this.updateRule(type, rule);
        },
        updateRule: function(type, rule) {
            if (type === 'remove') {
                chrome.storage.local.remove(this._prefix + rule);
            } else {
                var tmp = {};
                tmp[this._prefix + rule.id] = rule;
                chrome.storage.local.set(tmp);
            }
            if (type === 'add') {
                this.renderOneRule(rule, 1);
            }
        },
        getFile: function (url, callback) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = 'blob';
            xhr.onload = function() {
                if (this.status === 0) {
                    var reader = new FileReader();
                    reader.onload = function() {
                        callback(reader.result);
                    };
                    reader.readAsDataURL(this.response);
                }
            };
            xhr.send();
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
