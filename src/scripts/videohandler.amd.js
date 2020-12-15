require(['playbackManager', 'events'], function (playbackManager, events) {
    'use strict';

    var videoOn;
    var audioOn;

    events.on(playbackManager, "playbackstart", function (e, player) {
        if (playbackManager.isPlayingVideo()) {
            videoOn = true;
            var xhr = new XMLHttpRequest();
            xhr.open("POST", "electronapphost://video-on", true);
            xhr.send();
        }
        if (playbackManager.isPlayingAudio()) {
            audioOn = true;
            var xhr = new XMLHttpRequest();
            xhr.open("POST", "electronapphost://audio-on", true);
            xhr.send();
        }
    });
    events.on(playbackManager, "playbackstop", function (e, stopInfo) {
        var player = stopInfo.player;
        if (videoOn) {
            videoOn = false;
            var xhr = new XMLHttpRequest();
            xhr.open("POST", "electronapphost://video-off", true);
            xhr.send();
        }
        if (audioOn) {
            audioOn = false;
            var xhr = new XMLHttpRequest();
            xhr.open("POST", "electronapphost://audio-off", true);
            xhr.send();
        }
    });

    function sendCommand(name) {

        var xhr = new XMLHttpRequest();
        xhr.open('GET', 'electronapphost://' + name, true);

        xhr.send();
    }

    sendCommand('loaded');
});