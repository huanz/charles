var Utils = {
    isString: function(obj) {
        return Object.prototype.toString.call(obj) === '[object String]';
    },
    getConfig: function(key, callback) {

    },
    setConfig: function() {

    },
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

// chrome.runtime.onMessage.addListener(function () {
// 	console.log(Utils);
// });

// chrome.webRequest.onBeforeRequest.addListener(function(details) {
// 	console.log('onBeforeRequest', details);
// 	return {};
// }, Utils.requestFilter, ['blocking', 'requestBody']);

// chrome.webRequest.onBeforeSendHeaders.addListener(function(details) {
// 	console.log('onBeforeSendHeaders', details);
// 	var headers = details;
// 	return {
// 		requestHeaders: headers
// 	};
// }, Utils.requestFilter, ['blocking', 'requestHeaders']);

chrome.webRequest.onHeadersReceived.addListener(function(details) {
    if (!Utils.cross) {
        return {};
    }
    var headers = details.responseHeaders;
    var index;
    for (var i = headers.length - 1; i >= 0; i--) {
        if (headers[i].name.toLowerCase() === 'access-control-allow-origin') {
            index = i;
            break;
        }
    }
    index === undefined ? headers.push({
        name: 'Access-Control-Allow-Origin',
        value: '*'
    }) : headers[index].value = '*';

    return {
        responseHeaders: headers
    }
}, Utils.responseFilter, ['blocking', 'responseHeaders']);
