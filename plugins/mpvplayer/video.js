define(['loading', 'pluginManager', 'appSettings', 'baseView', 'emby-select', 'emby-checkbox', 'emby-input', 'emby-scroller'], function (loading, pluginManager, appSettings, BaseView) {

    function onSubmit(e) {
        e.preventDefault();
        return false;
    }

    function saveSettings(view) {

        appSettings.set('mpv-vo', view.querySelector('.selectVideoOut').value);
        appSettings.set('mpv-hwdec', view.querySelector('.selectHwaMode').value);
        appSettings.set('mpv-outputlevels', view.querySelector('.selectNominalRange').value);
        appSettings.set('mpv-displaysync', view.querySelector('.chkRefreshRateMode').checked);
        appSettings.set('mpv-displaysync_override', view.querySelector('.txtUserRefreshRate').value);
        appSettings.set('mpv-videosyncmode', view.querySelector('.selectVideoSync').value);
        appSettings.set('mpv-deinterlace', view.querySelector('.selectDeinterlace').value);

        appSettings.set('mpv-audiodelay', view.querySelector('.txtDefaultAudioDelay').value);
        appSettings.set('mpv-audiodelay2325', view.querySelector('.txtAudioDelay2325').value);

        appSettings.set('mpv-interpolation', view.querySelector('.chkInterpolation').checked);
        appSettings.set('mpv-openglhq', view.querySelector('.chkOpenglhq').checked);

    }

    function renderSettings(view) {

        view.querySelector('.selectVideoOut').value = appSettings.get('mpv-vo') || '';
        view.querySelector('.selectHwaMode').value = appSettings.get('mpv-hwdec') || '';
        view.querySelector('.selectNominalRange').value = appSettings.get('mpv-outputlevels') || '';
        view.querySelector('.chkRefreshRateMode').checked = appSettings.get('mpv-displaysync') === 'true';
        view.querySelector('.txtUserRefreshRate').value = appSettings.get('mpv-displaysync_override') || '';
        view.querySelector('.selectVideoSync').value = appSettings.get('mpv-videosyncmode') || '';
        view.querySelector('.selectDeinterlace').value = appSettings.get('mpv-deinterlace') || '';

        view.querySelector('.txtDefaultAudioDelay').value = appSettings.get('mpv-audiodelay') || '0';
        view.querySelector('.txtAudioDelay2325').value = appSettings.get('mpv-audiodelay2325') || '0';

        view.querySelector('.chkOpenglhq').checked = appSettings.get('mpv-openglhq') === 'true';
        view.querySelector('.chkInterpolation').checked = appSettings.get('mpv-interpolation') === 'true';

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
