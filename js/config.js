(function() {
    var root = this;
    var Store = root.localStorage;
    var defaults = {
        requestFilter: {
            urls: ['<all_urls>'],
            tabId: null
        },
        cross: 0,
        responseFilter: {
            urls: ['<all_urls>'],
            tabId: null
        }
    };
    var Config = {
        init: function(data) {
            this._data = data || defaults;
            this.save();
        },
        get: function() {
            return this._data;
        },
        set: function(key, value) {
            var obj = this._data;
            var keys = key.split('.');
            if (keys[1] !== undefined) {
                obj[keys[0]][keys[1]] = value;
            } else {
                obj[keys[0]] = value;
            }
            this.save();
        },
        save: function() {
            return Store.setItem('config', JSON.stringify(this._data));
        }
    };

    Config.init(JSON.parse(Store.getItem('config')));


    var isObject = function(obj) {
        var type = typeof obj;
        return type === 'function' || type === 'object' && !!obj;
    };

    var getKeys = function(obj) {
        if (!isObject(obj)) {
            return [];
        }
        if (Object.keys) {
            return Object.keys(obj);
        }
        var keys = [];
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                keys.push(key);
            }
        }
        return keys;
    };

    var extend = function(obj) {
        var len = arguments.length;
        if (len < 2 || obj == null) {
            return obj;
        }
        for (var index = 1; index < len; index++) {
            var source = arguments[index];
            var keys = getKeys(source);
            var l = keys.length;
            for (var i = 0; i < l; i++) {
                var key = keys[i];
                if (!undefined || obj[key] === undefined) {
                    obj[key] = source[key];
                }
            }
        }
        return obj;
    };

    var escapeMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '`': '&#x60;'
    };
    var unescapeMap = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#x27;': "'",
        '&#x60;': '`'
    };

    var createEscaper = function(map) {
        var escaper = function(match) {
            return map[match];
        };
        var source = '(?:' + getKeys(map).join('|') + ')';
        var testRegexp = RegExp(source);
        var replaceRegexp = RegExp(source, 'g');
        return function(string) {
            string = string == null ? '' : '' + string;
            return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
        };
    };

    var templateSettings = {
        escape: /<%-([\s\S]+?)%>/g,
        evaluate: /<%([\s\S]+?)%>/g,
        interpolate: /<%=([\s\S]+?)%>/g
    };

    // 不匹配任何字符串
    var noMatch = /(.)^/;

    // 转义特定字符.
    var escapes = {
        "'": "'",
        '\\': '\\',
        '\r': 'r',
        '\n': 'n',
        '\t': 't',
        '\u2028': 'u2028',
        '\u2029': 'u2029'
    };

    var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

    var Util = {
        isObject: isObject,
        keys: getKeys,
        extend: extend,
        escape: createEscaper(escapeMap),
        unescape: createEscaper(unescapeMap),
        templateSettings: templateSettings
    };

    Util.template = function(text, settings, oldSettings) {
        if (!settings && oldSettings) settings = oldSettings;
        settings = extend({}, settings, templateSettings);

        var matcher = new RegExp([
            (settings.escape || noMatch).source,
            (settings.interpolate || noMatch).source,
            (settings.evaluate || noMatch).source
        ].join('|') + '|$', 'g');

        var index = 0;
        var source = "__p+='";
        text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
            source += text.slice(index, offset).replace(escaper, function(match) {
                return '\\' + escapes[match];
            });
            index = offset + match.length;
            if (escape) {
                source += "'+\n((__t=(" + escape + "))==null?'':Util.escape(__t))+\n'";
            } else if (interpolate) {
                source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
            } else if (evaluate) {
                source += "';\n" + evaluate + "\n__p+='";
            }
            return match;
        });

        source += "';\n";

        if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

        source = "var __t,__p='',__j=Array.prototype.join," +
            "print=function(){__p+=__j.call(arguments,'');};\n" +
            source + "return __p;\n";

        try {
            var render = new Function(settings.variable || 'obj', 'Util', source);
        } catch (e) {
            e.source = source;
            throw e;
        }

        var template = function(data) {
            return render.call(this, data, Util);
        };

        template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

        return template;
    };

    root.Config = Config;
    root.Util = Util;

}.call(this));
