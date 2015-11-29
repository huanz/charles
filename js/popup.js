chrome.runtime.getBackgroundPage(function(backgroundPage) {
    var Utils = backgroundPage.window.Utils;
    chrome.tabs.query({
        active: true
    }, function(tab) {
        var tabId = tab[0].id;
        var $el = $('#j-wrap');
        var $radio = $el.find('input:radio');

        // 请求过滤设置选中
        $radio.eq(Utils.requestFilter.tabId === tabId ? 4 : 3).prop('checked', true);

        // 跨域选中
        if (Utils.cross) {
            $radio.eq(Utils.responseFilter.tabId === tabId ? 2 : 1).prop('checked', true);
        } else {
            $radio.eq(0).prop('checked', true);
        }

        $radio.on('change', function() {
            var type = this.name;
            var value = +this.value;
            if (type === 'cross') {
                // 跨域设置
                if (value) {
                    Utils.cross = 1;
                    Utils.responseFilter.tabId = value === 1 ? tabId : null;
                } else {
                    Utils.cross = 0;
                }

            } else if (type === 'filter') {
                // 跨域请求过滤设置
                Utils.requestFilter.tabId = value === 1 ? tabId : null;
            }
            chrome.runtime.sendMessage({
                type: 'change'
            });
        });
    });
});
