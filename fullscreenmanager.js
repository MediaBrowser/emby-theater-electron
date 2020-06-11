define(['apphost', 'events'], function (appHost, events) {
    'use strict';

    function fullscreenManager() {
        document.addEventListener("windowstatechanged", (e) => {
            events.trigger(this, 'fullscreenchange')
            var drag = document.querySelector('.windowDragRegion');
            if (e.detail.windowState == 'Maximized' || e.detail.windowState == 'Fullscreen') {
                drag.classList.add('nodrag')
            } else {
                drag.classList.remove('nodrag')
            }
        })
    }

    fullscreenManager.prototype.requestFullscreen = function (element) {
        appHost.setWindowState('Maximized');
    };

    fullscreenManager.prototype.exitFullscreen = function () {
        appHost.setWindowState('Normal');
    };

    fullscreenManager.prototype.isFullScreen = function () {
        var windowState = appHost.getWindowState();
        return windowState == 'Maximized' || windowState == 'Fullscreen';
    };

    return new fullscreenManager();
});