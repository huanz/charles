/**
 * @desc 跨域相关
 */
(function () {
    var conf = Config.get();
    var _requests = {};
    chrome.webRequest.onSendHeaders.addListener(function (details) {
        if (conf.cross) {
            /**
             * 记录Origin，跨域带cookie用
             */
            _requests[details.requestId] = getHeader(details.requestHeaders, 'origin', function (value) {
                return value;
            });
        }
    }, conf.requestFilter, ['requestHeaders']);

    chrome.webRequest.onHeadersReceived.addListener(function (details) {
        if (conf.cross) {
            var origin = _requests[details.requestId];
            delete _requests[details.requestId];
            var headers = details.responseHeaders;
            var index = getHeader(headers, 'access-control-allow-origin', function (value, i) {
                return i;
            });
            index === '' ? headers.push({
                name: 'Access-Control-Allow-Origin',
                value: origin
            }, {
                name: 'Access-Control-Allow-Credentials',
                value: 'true'
            }) : headers[index].value = origin;
            return {
                responseHeaders: headers
            };
        }
    }, conf.responseFilter, ['blocking', 'responseHeaders']);

    // 标签页关闭
    chrome.tabs.onRemoved.addListener(function (tabId) {
        if (conf.requestFilter.tabId === tabId) {
            Config.set('requestFilter.tabId', null);
        }
        if (conf.requestFilter.tabId === tabId) {
            Config.set('responseFilter.tabId', null);
        }
    });

    window.addEventListener('storage', function () {
        conf = Config.get();
        console.log('get');
    }, false);

    /**
     * @desc 获取headers
     */
    function getHeader(headers, type, iteratee) {
        var result = '';
        headers.some(function (element, index) {
            if (element.name.toLowerCase() === type) {
                result = iteratee(element.value, index);
                return true;
            }
        });
        return result;
    }
})();