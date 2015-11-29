(function() {
    var root = this;

    var toString = Object.prototype.toString;

    var Utils = function(obj) {
        if (obj instanceof Utils) return obj;
        if (!(this instanceof Utils)) return new Utils(obj);
        this._wrapped = obj;
    };

    root.Utils = Utils;


    Utils.isString = function(obj) {
        return Object.prototype.toString.call(obj) === '[object String]';
    }


    Utils.prototype.value = function() {
        return this._wrapped;
    };

    Utils.prototype.valueOf = Utils.prototype.toJSON = Utils.prototype.value;

    Utils.prototype.toString = function() {
        return '' + this._wrapped;
    };

}.call(this));
