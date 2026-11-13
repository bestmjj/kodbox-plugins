/* Registered in Kodbox global UI, same pattern as bundled adminer plugin. */
kodReady.push(function () {
    Events.bind('main.menu.loadBefore', function (listData) {
        listData['{{package.id}}'] = {
            name: '{{package.name}}',
            url: '{{pluginApi}}page',
            target: 'dialog',
            subMenu: '0',
            menuAdd: '1',
            icon: 'ri-stack-line bg-blue-7'
        };
    });
    Router.mapIframe({
        page: '{{package.id}}',
        title: '{{package.name}}',
        url: '{{pluginApi}}page',
        ignoreLogin: false
    });
});
