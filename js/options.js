$(function() {
    'use strict';
    var doc = document;
    var Charles = {
        _prefix: 'rules~',
        _headers: {},
        init: function() {
            var _this = this;
            this.$list = $('#j-list');
            this.tplReq = Util.template($('#j-tpl-request').html());
            this.tplRule = Util.template($('#j-tpl-rule').html());
            chrome.storage.local.get(null, function(items) {
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
            this.conf = Config.get();
            this._chromeEvents();
            this._domEvents();
        },
        _chromeEvents: function () {
            var _this = this;
            var conf = this.conf;
            // 标签页关闭
            chrome.tabs.onRemoved.addListener(function(tabId) {
                if (conf.requestFilter.tabId === tabId) {
                    Config.set('requestFilter.tabId', null);
                }
                if (conf.requestFilter.tabId === tabId) {
                    Config.set('responseFilter.tabId', null);
                }
            });

            // 发起请求前
            chrome.webRequest.onBeforeRequest.addListener(function (details) {
                var rule = _this.checkUrl(details.url);
                if (rule && rule.enable) {
                    return {
                        redirectUrl: rule.url
                    };
                }
            }, conf.requestFilter, ['blocking', 'requestBody']);

            // 发送请求头前
            chrome.webRequest.onBeforeSendHeaders.addListener(function (details) {
                var rule = _this.checkUrl(details.url);
                if (rule && rule.type === 'header' && rule.enable) {
                    return {
                        requestHeaders: rule.headers
                    };
                }
            }, conf.requestFilter, ['blocking', 'requestHeaders']);

            chrome.webRequest.onSendHeaders.addListener(function (details) {
                if (_this.checkUrl(details.url)) {
                    var url = _this.urlParse(details.url);
                    var id = url.host + url.pathname;
                    _this._headers[id] = details.requestHeaders;
                }
            }, conf.requestFilter, ['requestHeaders']);

            // 接收到请求头
            chrome.webRequest.onHeadersReceived.addListener(function (details) {
                if (conf.cross) {
                    var headers = details.responseHeaders;
                    var index = _this.getHeader(headers, 'access-control-allow-origin', function(value, i) {
                        return i;
                    });
                    index === '' ? headers.push({
                        name: 'Access-Control-Allow-Origin',
                        value: '*'
                    }) : headers[index].value = '*';
                    return {
                        responseHeaders: headers
                    };
                }
            }, conf.responseFilter, ['blocking', 'responseHeaders']);

            // 请求完成
            chrome.webRequest.onCompleted.addListener(function (details) {
                if (_this.checkUrl(details.url)) {
                    _this.parseResponse(details);
                }
            }, conf.requestFilter, ['responseHeaders']);
        },
        _domEvents: function () {
            var _this = this;

            window.addEventListener('storage', function() {
                _this.conf = Config.get();
            }, false);

            var $view = $('#j-view');
            this.$list.on('click', '.j-add', function() {
                var rule = $(this).data('id');
                $view.find('.j-rule').text(rule);

                var header = _this._headers[rule];
                if (header && header.length) {
                    var str = '<p>Request Headers</p>';
                    header.forEach(function (item) {
                        str += '<div><strong>' + item.name + '：</strong>' + item.value + '</div>';
                    });
                    $('#j-header').html(str);
                }

                $view.data('id', rule).show();
            });

            var $tabs = $view.find('.tab-content').children();
            $view.find('.view-tab').on('click', 'a', function() {
                var $this = $(this);
                if (!$this.hasClass('active')) {
                    $this.siblings().removeClass('active');
                    $this.addClass('active');
                    $tabs.removeClass('active').eq($this.index()).addClass('active');
                }
            });

            var closeView = function() {
                $view.hide();
                $view.find('input.form-control').val('');
            };

            // jsoneditor
            var editor = new autoIndent({
                textarea: doc.getElementById('j-edit'),
                json: {
                    'no': 0,
                    'msg': 'success',
                    'list|20': [{
                        'id': '@id',
                        'title': '@ctitle',
                        'name': '@cname',
                        'email': '@email',
                        'image': '@image(150x150)',
                        'url': '@url',
                        'status': '@range(1, 2, 3)',
                        'content': '@cparagraph',
                        'date': '@now("T")'
                    }]
                }
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
                var $field = $tabs.filter('.active');
                var index = $field.index();
                var result = {
                    id: $view.data('id'),
                    enable: 1
                };
                // json
                if (index === 0) {
                    var text = editor.get();
                    if (text) {
                        var mimeType = '';
                        result.type = 'text';
                        result.input = text;
                        if (Util.isObject(text)) {
                            mimeType = 'application/json';
                            text = JSON.stringify(Mock.mock(text));
                            result.name = 'json';
                        } else {
                            mimeType = 'text/plain';
                            result.name = text;
                        }
                        result.url = 'data:' + mimeType + '; utf-8,' + encodeURIComponent(text);
                        _this.changeRule('add', result);
                    }
                }
                // 链接
                if (index === 1) {
                    var url = $field.val().trim();
                    result.input = url;
                    result.type = 'url';
                    result.name = url;
                    if (url.startsWith('file://')) {
                        _this.getFile(url, function(res) {
                            result.url = res;
                            _this.changeRule('add', result);
                        });
                    } else if (url.startsWith('http://') || url.startsWith('https://')) {
                        result.url = url;
                        _this.changeRule('add', result);
                    }
                }
                // 文件
                if (index === 2) {
                    var file = $field[0].files[0];
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

            $('#j-toggle-rule').on('click', function () {
                $('#j-rule-view').toggle();
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
        parseResponse: function (details) {
            var headers = details.responseHeaders;
            var parsedUrl = this.urlParse(details.url);
            var data = {
                id: parsedUrl.host + parsedUrl.pathname,
                tabId: details.tabId,
                name: parsedUrl.name,
                path: parsedUrl.sub,
                host: parsedUrl.host,
                url: details.url,
                method: details.method,
                fromCache: details.fromCache,
                statusCode: details.statusCode,
                ip: details.ip || '',
                size: this.getHeader(headers, 'content-length', this.byteFmt),
                type: this.getHeader(headers, 'content-type', this.typeFmt) || 'other'
            };
            // image特殊处理下url
            if (data.type === 'image') {
                data.src = data.url + (data.url.indexOf('?') === -1 ? '?' : '&') + '_fromcharles=1';
            }
            this.render(data);
        },
        urlParse: function(url) {
            var result = {};
            var parser = doc.createElement('a');
            parser.href = url;
            ['protocol', 'host', 'port', 'pathname', 'search', 'hash'].forEach(function (p) {
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
        checkUrl: function (url) {
            if (url.startsWith('http://') || url.startsWith('https://')) {
                var parsed = this.urlParse(url);
                if (parsed.search.indexOf('_fromcharles=1') === -1) {
                    return this.rules[parsed.host + parsed.pathname] || {};
                }
            }
            return false;
        },
        renderRule: function() {
            var arr = [];
            var rules = this.rules;
            for (var i in rules) {
                arr.push(this.renderOneRule(rules[i]));
            }
            $('#j-rules').html(arr.join(''));
        },
        renderOneRule: function(rule, tag) {
            var str = this.tplRule(rule);
            if (tag) {
                $('#j-rules').append(str);
            } else {
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
        getFile: function(url, callback) {
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
        },
        fileExt: function (filename) {
            var result;
            if (!filename) {
                return '';
            }
            if (/^\..+$/.test(filename) && filename.match(/\./g).length === 1) {
                result = filename.substring(1);
            } else {
                var parts = filename.split('.');
                if (parts.length === 1 || (parts[0] === '' && parts.length === 2)) {
                    return '';
                } else {
                    result = parts.pop();
                }
            }
            return result.toLowerCase();
        }
    };

    Charles.init();
});
