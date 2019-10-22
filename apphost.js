define(['events'], function (events) {
    'use strict';

    function getCapabilities() {

        var caps = {
            PlayableMediaTypes: ['Audio', 'Video'],

            SupportsPersistentIdentifier: true
        };

        return Promise.resolve(caps);
    }

    function getWindowState() {
        return document.windowState || 'Normal';
    }

    function setWindowState(state) {

        // Normal
        // Minimized
        // Maximized

        sendCommand('windowstate-' + state);
    }

    function sendCommand(name) {

        var xhr = new XMLHttpRequest();
        xhr.open('GET', 'electronapphost://' + name, true);

        xhr.send();
    }

    function supportsVoiceInput() {
        return window.SpeechRecognition ||
            window.webkitSpeechRecognition ||
            window.mozSpeechRecognition ||
            window.oSpeechRecognition ||
            window.msSpeechRecognition;
    }

    var supportedFeatures = function () {

        var features = [
            'windowstate',
            'exit',
            'runatstartup',
            'filedownload',
            'externallinks',
            'sleep',
            //'restart',
            'shutdown'
        ];

        if (navigator.share) {
            features.push('sharing');
        }

        if (appStartInfo.supportsTransparentWindow) {
            features.push('windowtransparency');
        }

        if (supportsVoiceInput()) {
            features.push('voiceinput');
        }

        if (self.ServiceWorkerSyncRegistered) {
            features.push('sync');
        }

        features.push('youtube');
        features.push('connectsignup');

        features.push('soundeffects');
        features.push('displaymode');
        features.push('plugins');
        features.push('skins');
        features.push('exitmenu');
        features.push('htmlaudioautoplay');
        features.push('htmlvideoautoplay');
        features.push('fullscreenchange');
        features.push('displayableversion');
        features.push('externallinkdisplay');
        features.push('externalpremium');

        features.push('remotecontrol');

        features.push('multiserver');

        features.push('remoteaudio');
        features.push('remotevideo');

        features.push('screensaver');
        //features.push('targetblank');

        features.push('otherapppromotions');
        features.push('fileinput');

        features.push('nativeblurayplayback');
        features.push('nativedvdplayback');
        features.push('subtitleappearancesettings');

        features.push('displaylanguage');

        return features;
    }();

    var appHost = {
        getWindowState: getWindowState,
        setWindowState: setWindowState,
        supports: function (command) {

            return supportedFeatures.indexOf(command.toLowerCase()) !== -1;
        },
        capabilities: function () {
            return {
                PlayableMediaTypes: ['Audio', 'Video'],

                SupportsPersistentIdentifier: true
            };
        },
        getCapabilities: getCapabilities,
        exit: function () {
            sendCommand('exit');
        },
        sleep: function () {
            sendCommand('sleep');
        },
        restart: function () {
            sendCommand('restart');
        },
        shutdown: function () {
            sendCommand('shutdown');
        },
        init: function () {

            return Promise.resolve();
        },
        appName: function () {
            return appStartInfo.name;
        },
        appVersion: function () {
            return appStartInfo.version;
        },
        deviceName: function () {
            return appStartInfo.deviceName;
        },
        deviceId: function () {
            return appStartInfo.deviceId;
        },

        moreIcon: 'dots-vert',
        getKeyOptions: function () {

            return {

                // chromium doesn't automatically handle these
                handleAltLeftBack: true,
                handleAltRightForward: true,
                keyMaps: {
                    back: [
                        8,
                        // ESC
                        27
                    ]
                }
            };

        },

        setTheme: function (themeSettings) {

            var metaThemeColor = document.querySelector("meta[name=theme-color]");
            if (metaThemeColor) {
                metaThemeColor.setAttribute("content", themeSettings.themeColor);
            }
        },

        setUserScalable: function (scalable) {

            var att = scalable ?
                'viewport-fit=cover, width=device-width, initial-scale=1, minimum-scale=1, user-scalable=yes' :
                'viewport-fit=cover, width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no';

            document.querySelector('meta[name=viewport]').setAttribute('content', att);
        },

        deviceIconUrl: function () {

            return null;
        }
    };

    var _isHidden = false;
    function onAppVisible() {

        if (_isHidden) {
            _isHidden = false;
            //console.log('triggering app resume event');
            events.trigger(appHost, 'resume');
        }
    }

    function onAppHidden() {

        if (!_isHidden) {
            _isHidden = true;
            //console.log('app is hidden');
        }
    }

    var visibilityChange;
    var visibilityState;
    var doc = self.document;
    if (typeof doc.visibilityState !== 'undefined') {
        visibilityChange = 'visibilitychange';
        visibilityState = 'hidden';
    } else if (typeof doc.mozHidden !== 'undefined') {
        visibilityChange = 'mozvisibilitychange';
        visibilityState = 'mozVisibilityState';
    } else if (typeof doc.msHidden !== 'undefined') {
        visibilityChange = 'msvisibilitychange';
        visibilityState = 'msVisibilityState';
    } else if (typeof doc.webkitHidden !== 'undefined') {
        visibilityChange = 'webkitvisibilitychange';
        visibilityState = 'webkitVisibilityState';
    }

    doc.addEventListener(visibilityChange, function () {

        if (document[visibilityState]) {
            onAppHidden();
        } else {
            onAppVisible();
        }
    });

    if (self.addEventListener) {
        self.addEventListener('focus', onAppVisible);
        self.addEventListener('blur', onAppHidden);
    }

    return appHost;
});