define(['loading', 'baseView', 'pluginManager', 'appSettings', 'emby-select', 'emby-checkbox', 'emby-input', 'emby-scroller'], function (loading, BaseView, pluginManager, appSettings) {

    function onSubmit(e) {
        e.preventDefault();
        return false;
    }

    function renderSettings(view) {
        view.querySelector('.hdmiPort').value = appSettings.get('cec-hdmiport') || '';
    }

    function saveSettings(view) {

        appSettings.set('cec-hdmiport', view.querySelector('.hdmiPort').value);
    }

    function SettingsView(view, params) {

        BaseView.apply(this, arguments);

        view.querySelector('form').addEventListener('submit', onSubmit);
    }

    Object.assign(SettingsView.prototype, BaseView.prototype);

    SettingsView.prototype.onResume = function (options) {

        BaseView.prototype.onResume.apply(this, arguments);

        loading.hide();

        if (options.refresh) {
            renderSettings(this.view);
        }
    };

    SettingsView.prototype.onPause = function () {

        saveSettings(this.view);

        BaseView.prototype.onPause.apply(this, arguments);
    };

    return SettingsView;
});
