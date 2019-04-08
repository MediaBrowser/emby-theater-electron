define(['loading', 'pluginManager', 'appSettings', 'emby-select', 'emby-checkbox', 'emby-input', 'emby-scroller'], function (loading, pluginManager, appSettings) {

    function onSubmit(e) {
        e.preventDefault();
        return false;
    }

    return function (view, params) {

        view.querySelector('form').addEventListener('submit', onSubmit);

        view.addEventListener('viewbeforeshow', function (e) {

            var isRestored = e.detail.isRestored;

            Emby.Page.setTitle('Video Settings');

            loading.hide();

            if (!isRestored) {

                renderSettings();
            }
        });

        view.addEventListener('viewbeforehide', saveSettings);

        function saveSettings() {

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

        function renderSettings() {

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
    }

});
