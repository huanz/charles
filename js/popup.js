chrome.tabs.query({active: true}, function(tab) {
    var conf = Config.get();
    var tabId = tab[0].id;
    var $el = $('#j-wrap');
    var $radio = $el.find('input:radio');

    // 请求过滤设置选中
    $radio.eq(conf.requestFilter.tabId === tabId ? 4 : 3).prop('checked', true);

    // 跨域选中
    if (conf.cross) {
        $radio.eq(conf.responseFilter.tabId === tabId ? 2 : 1).prop('checked', true);
    } else {
        $radio.eq(0).prop('checked', true);
    }

    $radio.on('change', function() {
        var type = this.name;
        var value = +this.value;
        if (type === 'cross') {
            // 跨域设置
            if (value) {
                Config.set('cross', 1);
                Config.set('responseFilter.tabId', value === 1 ? tabId : null);
            } else {
                Config.set('cross', 0);
            }
        } else if (type === 'filter') {
            // 跨域请求过滤设置
            Config.set('requestFilter.tabId', value === 1 ? tabId : null);
        }
    });

    $('#j-option').on('click', function () {
        window.open(chrome.extension.getURL('html/options.html'), 'charles-option-page');
    });
});
