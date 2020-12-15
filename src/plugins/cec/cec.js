define(['loading', 'pluginManager', 'appSettings', 'emby-select', 'emby-checkbox', 'emby-input', 'emby-scroller'], function (loading, pluginManager, appSettings) {

    function onSubmit(e) {
        e.preventDefault();
        return false;
    }

    return function (view, params) {

        view.querySelector('form').addEventListener('submit', onSubmit);

        view.addEventListener('viewbeforeshow', function (e) {

            var isRestored = e.detail.isRestored;

            Emby.Page.setTitle('Cec Settings');

            loading.hide();

            if (!isRestored) {

                renderSettings();
            }
        });

        view.addEventListener('viewbeforehide', saveSettings);

        function saveSettings() {
            appSettings.set('cec-hdmiport', view.querySelector('.hdmiPort').value);
        }

        function renderSettings() {
            view.querySelector('.hdmiPort').value = appSettings.get('cec-hdmiport') || '';
        }
    }

});
