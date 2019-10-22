var processes = {};
var mainWindowRef
var mpv = require('node-mpv');
var mpvPlayer;
var playerWindowId;
var mpvPath;
var playMediaSource;
var playMediaType;
var playerStatus;
var fadeTimeout;
var currentVolume;
var currentPlayResolve;
var currentPlayReject;
var triggerVolumeEvents = true;

var currentVolumeInfo = {
    volume: 100,
    mute: false
};

function alert(text) {
    require('electron').dialog.showMessageBox(mainWindowRef, {
        message: text.toString(),
        buttons: ['ok']
    });
}

function play(player, path) {
    return new Promise(function (resolve, reject) {
        console.log('Play URL : ' + path);
        currentPlayResolve = resolve;
        currentPlayReject = reject;

        if (path.toLowerCase('http').indexOf() != -1) {
            //player.loadStream(path);
            player.loadFile(path);
        } else {
            player.loadFile(path);
        }
    });
}

function setTimeoutPromise(ms) {

    return new Promise(function (resolve, reject) {

        setTimeout(resolve, ms);
    });
}

function resolveWhenIdle() {

    var currentPlayerStatus = playerStatus;
    if (!currentPlayerStatus) {
        return Promise.resolve();
    }

    return setTimeoutPromise(100).then(resolveWhenIdle);
}

function stop() {
    if (mpvPlayer) {
        mpvPlayer.stop();

        return resolveWhenIdle();
    }

    return Promise.resolve();
}

function pause() {
    mpvPlayer.pause();
}

function pause_toggle() {
    mpvPlayer.togglePause();
}

function unpause() {
    mpvPlayer.resume();
}

function set_position(data) {
    mpvPlayer.goToPosition(Math.round(data / 10000000));
}

function setAspectRatio(player, value) {

    switch (value) {
        case "4_3":
            player.setProperty("video-unscaled", "no");
            player.setProperty("video-aspect", "4:3");
            break;
        case "16_9":
            player.setProperty("video-unscaled", "no");
            player.setProperty("video-aspect", "16:9");
            break;
        case "bestfit":
            player.setProperty("video-unscaled", "no");
            player.setProperty("video-aspect", "-1");
            break;
        case "fill":
            //var size = player.getProperty("android-surface-size");
            //var aspect = parseFloat(size.split("x")[0]) / parseFloat(size.split("x")[1]);
            //player.setProperty("video-unscaled", "no");
            //player.setProperty("video-aspect", aspect);

            break;
        case "original":
            player.setProperty("video-unscaled", "downscale-big");
            player.setProperty("video-aspect", "-1");
            break;
    }
}

function set_volume(data) {
    mpvPlayer.volume(data);
}

function mute() {
    mpvPlayer.mute();
}

function unmute() {
    mpvPlayer.unmute();
}

function video_toggle() {
    var isLinux = require('is-linux');
    if (isLinux()) {
        mpvPlayer.cycleProperty("video");
    }
}

function set_audiostream(player, index) {

    var audioIndex = 0;
    var i, length, stream;
    var streams = playMediaSource.MediaStreams || [];
    for (i = 0, length = streams.length; i < length; i++) {
        stream = streams[i];
        if (stream.Type == 'Audio') {
            audioIndex++;
            if (stream.Index == index) {
                break;
            }
        }
    }
    player.setProperty("aid", audioIndex);
}

function set_subtitlestream(player, index) {

    if (index < 0) {
        player.setProperty("sid", "no");
    } else {
        var subIndex = 0;
        var i, length, stream;
        var streams = playMediaSource.MediaStreams || [];
        for (i = 0, length = streams.length; i < length; i++) {
            stream = streams[i];
            if (stream.Type == 'Subtitle') {
                subIndex++;

                if (stream.Index == index) {
                    if (stream.DeliveryMethod == 'External') {

                        player.addSubtitles(stream.DeliveryUrl, "cached", stream.DisplayTitle, stream.Language);
                    } else {
                        player.setProperty("sid", subIndex);
                        if (stream.Codec == "dvb_teletext") {
                            setDvbTeletextPage(player, stream);
                        }
                    }

                    break;
                }
            }
        }
    }
}

function setDvbTeletextPage(player, stream) {

    // cases to handle:
    // 00000000: 0001 0001 10
    // 00000000: 1088 0888
    // 00000000: 1088
    // If the stream contains multiple languages, just use the first

    var extradata = stream.Extradata;

    if (extradata && extradata.length > 13) {
        var pageNumber = parseInt(extradata.substring(11, 14));
        if (pageNumber < 100) {
            pageNumber += 800;
        }
        player.setProperty("teletext-page", pageNumber);
    }
}

function getMpvOptions(options, mediaType, mediaSource) {

    var list = [];

    if (options.openglhq) {
        list.push('--profile=opengl-hq');
    }

    var isRpi = require('detect-rpi');
    if (isRpi()) {
        list.push('--fs');
    }

    if (options.hwdec != 'unset') {
        list.push('--hwdec=' + (options.hwdec || 'auto'));
    }

    var videoStream = (mediaSource.MediaStreams || []).filter(function (v) {
        return v.Type == 'Video';
    })[0];

    if (options.deinterlace == 'yes' || (!options.deinterlace && videoStream != null && videoStream.IsInterlaced)) {
        list.push('--deinterlace=yes');
    } else {
        list.push('--deinterlace=no');
    }

    list.push('--video-output-levels=' + (options.videoOutputLevels || 'auto'));

    if (options.videoSync) {

        list.push('--video-sync=' + (options.videoSync));
    }

    //limitation that until we can pass the Windows monitor# (not the display name that MPV returns), is limited to Primary monitor
    if (options.displaySync) {
        var winPosition = mainWindowRef.getPosition();
        var winBounds = mainWindowRef.getBounds();
        var displayParams_active = require('electron').screen.getDisplayNearestPoint({ x: winPosition[0], y: winPosition[1] })

        //rough test for fullscreen on playback start
        if ((winBounds.width == displayParams_active.size.width) && (displayParams_active.size.height == winBounds.height)) {
            var rf_rate = ((options.displaySync_Override != '') ? ',refreshrate-rates="' + (options.displaySync_Override) + '"' : '');
            var rf_theme = ((options.fullscreen) ? '' : ',refreshrate-theme=true');

            list.push('--script-opts=refreshrate-enabled=true' + rf_rate + rf_theme);
        }
    }

    if (options.interpolation) {

        list.push('--interpolation');
    }

    if (options.subtitleFontSize) {

        list.push('--sub-font-size=' + options.subtitleFontSize);
    }

    if (options.subtitleColor) {

        list.push('--sub-color=' + options.subtitleColor);
    }

    var audioOptions = getMpvAudioOptions(options, mediaType);
    for (var i = 0, length = audioOptions.length; i < length; i++) {
        list.push(audioOptions[i]);
    }

    var framerate = videoStream ? (videoStream.AverageFrameRate || videoStream.RealFrameRate) : 0;

    var audioDelay = framerate >= 23 && framerate <= 25 ? options.audioDelay2325 : options.audioDelay;
    if (audioDelay) {
        list.push('--audio-delay=' + (audioDelay / 1000));
    }

    if (options.largeCache) {

        list.push('--demuxer-readahead-secs=1800');
        list.push('--cache-secs=1800');

        list.push('--cache=2097152');
        list.push('--cache-backbuffer=1677722');
        list.push('--force-seekable=yes');
        list.push('--hr-seek=yes');

        ////list.push('--demuxer-lavf-hacks=no');
    }

    if (mediaSource.RunTimeTicks == null) {
        list.push('--demuxer-lavf-analyzeduration=3');
    }

    return list;
}

function getMpvAudioOptions(options, mediaType) {

    var list = [];

    var audioChannels = options.audioChannels || 'auto-safe';
    var audioFilters = [];
    if (audioChannels === '5.1') {
        audioChannels = '5.1,stereo';
    }
    else if (audioChannels === '7.1') {
        audioChannels = '7.1,stereo';
    }

    var audioChannelsFilter = getAudioChannelsFilter(options, mediaType);
    if (audioChannelsFilter) {
        audioFilters.push(audioChannelsFilter);
    }

    if (audioFilters.length) {

        list.push('--af=lavfi=[' + (audioFilters.join(',')) + ']');
    }

    list.push('--audio-channels=' + (audioChannels));

    if (options.audioSpdif) {
        list.push('--audio-spdif=' + (options.audioSpdif));
    }

    list.push('--ad-lavc-ac3drc=' + (options.dynamicRangeCompression || 0));

    if (options.exclusiveAudio && mediaType === 'Video') {
        list.push('--audio-exclusive=yes');
    }

    return list;
}

function getAudioChannelsFilter(options, mediaType) {

    var enableFilter = false;
    var upmixFor = (options.upmixAudioFor || '').split(',');

    if (mediaType === 'Audio') {
        if (upmixFor.indexOf('music') !== -1) {
            enableFilter = true;
        }
    }

    //there's also a surround filter but haven't found good documentation to implement -PMR 20171225
    if (enableFilter) {
        var audioChannels = options.audioChannels || '';
        if (audioChannels === '5.1') {
            //return 'channels=6';
            return 'pan=5.1|FL=FL|BL=FL|FR=FR|BR=FR|FC<0.5*FL + 0.5*FR';
        }
        else if (audioChannels === '7.1') {
            //return 'channels=8';
            return 'pan=7.1|FL=FL|SL=FL|BL=FL|FR=FR|SR=FR|BR=FR|FC<0.5*FL + 0.5*FR';
        }
    }

    return '';
}

function fade(startingVolume) {
    var newVolume = Math.max(0, startingVolume - 0.15);
    set_volume(newVolume);

    if (newVolume <= 0) {
        return Promise.resolve();
    }

    return new Promise(function (resolve, reject) {

        cancelFadeTimeout();

        fadeTimeout = setTimeout(function () {
            fade(newVolume).then(resolve, reject);
        }, 1);
    });
}

function cancelFadeTimeout() {
    var timeout = fadeTimeout;
    if (timeout) {
        clearTimeout(timeout);
        fadeTimeout = null;
    }
}

function cleanup() {

    var player = mpvPlayer;

    if (player) {
        player.removeAllListeners('timeposition');
        player.removeAllListeners('started');
        player.removeAllListeners('statuschange');
        player.removeAllListeners('stopped');
        player.removeAllListeners('error');
        player.removeAllListeners('paused');
        player.removeAllListeners('resumed');

        try {
            player.quit();
        }
        catch (err) {
            console.log('error quitting mpv: ' + err);
        }
    }

    delete mpvPlayer;

    mpvPlayer = null;
    playMediaSource = null;
    playMediaType = null;
    playerStatus = null;
}

function getReturnJson(customValues) {

    return '{}';
}

function getAudioStats(player) {

    var properties = [
        { property: 'audio-codec-name' },
        { property: 'audio-out-params' },
        { property: 'audio-bitrate', name: 'Audio bitrate:', type: 'bitrate' },
        { property: 'current-ao', name: 'Audio renderer:' },
        { property: 'audio-out-detected-device', name: 'Audio output device:' }
    ];

    var promises = properties.map(function (p) {
        return player.getProperty(p.property);
    });

    return Promise.all(promises).then(function (responses) {

        var stats = [];

        if (responses[0]) {
            stats.push({
                label: 'Audio codec:',
                value: responses[0]
            });
        }

        var audioParams = responses[1] || {};

        if (audioParams.channels) {
            stats.push({
                label: 'Audio channels:',
                value: audioParams.channels
            });
        }
        if (audioParams.samplerate) {
            stats.push({
                label: 'Audio sample rate:',
                value: audioParams.samplerate
            });
        }

        for (var i = 2, length = properties.length; i < length; i++) {

            var name = properties[i].name;

            var value = responses[i];

            if (properties[i].type == 'bitrate') {
                value = getDisplayBitrate(value);
            }

            if (value != null) {
                stats.push({
                    label: name,
                    value: value
                });
            }
        }
        return {
            stats: stats,
            type: 'audio'
        };
    });
}

function getDisplayBitrate(bitrate) {

    if (bitrate > 1000000) {
        return (bitrate / 1000000).toFixed(1) + ' Mbps';
    } else {
        return Math.floor(bitrate / 1000) + ' kbps';
    }
}

function getDroppedFrames(responses) {

    var html = '';

    html += (responses[responses.length - 4] || '0');

    html += ', Decoder dropped: ' + (responses[responses.length - 3] || '0');

    html += ', Mistimed: ' + (responses[responses.length - 2] || '0');

    html += ', Delayed: ' + (responses[responses.length - 1] || '0');

    return html;
}

function getVideoStats(player) {

    var properties = [
        { property: 'video-out-params' },
        { property: 'video-codec', name: 'Video codec:' },
        { property: 'video-bitrate', name: 'Video bitrate:', type: 'bitrate' },
        { property: 'current-vo', name: 'Video renderer:' },
        { property: 'hwdec-current', name: 'Hardware acceleration:' },
        { property: 'display-names', name: 'Display devices:' },
        { property: 'display-fps', name: 'Display fps:' },
        { property: 'estimated-display-fps', name: 'Estimated display fps:' },
        { property: 'display-sync-active', name: 'Display sync active:' },
        { property: 'frame-drop-count' },
        { property: 'decoder-frame-drop-count' },
        { property: 'mistimed-drop-count' },
        { property: 'vo-delayed-frame-count' }
    ];

    var promises = properties.map(function (p) {
        return player.getProperty(p.property);
    });

    return Promise.all(promises).then(function (responses) {

        var stats = [];

        var videoParams = responses[0] || {};

        for (var i = 1, length = properties.length - 4; i < length; i++) {

            var name = properties[i].name;

            var value = responses[i];

            if (properties[i].type == 'bitrate') {
                value = getDisplayBitrate(value);
            }

            if (value != null) {
                stats.push({
                    label: name,
                    value: value
                });
            }
        }

        stats.push({
            label: 'Dropped frames:',
            value: getDroppedFrames(responses)
        });

        var winPosition = mainWindowRef.getPosition();
        var displayParams = require('electron').screen.getDisplayNearestPoint({ x: winPosition[0], y: winPosition[1] })

        stats.push({
            label: 'Display Fullscreen Resolution:',
            value: displayParams.size.width + ' x ' + displayParams.size.height
        });

        if (videoParams.w && videoParams.h) {
            stats.push({
                label: 'Video resolution:',
                value: videoParams.w + ' x ' + videoParams.h
            });
        }

        if (videoParams.aspect) {
            stats.push({
                label: 'Aspect ratio:',
                value: videoParams.aspect
            });
        }

        if (videoParams.pixelformat) {
            stats.push({
                label: 'Pixel format:',
                value: videoParams.pixelformat
            });
        }

        if (videoParams.colormatrix) {
            stats.push({
                label: 'Color matrix:',
                value: videoParams.colormatrix
            });
        }

        if (videoParams.primaries) {
            stats.push({
                label: 'Primaries:',
                value: videoParams.primaries
            });
        }

        if (videoParams.gamma) {
            stats.push({
                label: 'Gamma:',
                value: videoParams.gamma
            });
        }

        if (videoParams.colorlevels) {
            stats.push({
                label: 'Levels:',
                value: videoParams.colorlevels
            });
        }

        return {
            stats: stats,
            type: 'video'
        };
    });
}

function getMediaStats(player) {

    var properties = [
        { property: 'media-title', name: 'Title:' },
        { property: 'chapter', name: 'Chapter:' }
    ];

    var promises = properties.map(function (p) {
        return player.getProperty(p.property);
    });

    return Promise.all(promises).then(function (responses) {

        var stats = [];

        for (var i = 0, length = properties.length; i < length; i++) {

            var name = properties[i].name;

            var value = responses[i];

            if (value != null) {
                stats.push({
                    label: name,
                    value: value
                });
            }
        }
        return {
            stats: stats,
            type: 'media'
        };
    });
}

function getStatsJson(player) {

    return Promise.all([getMediaStats(player), getVideoStats(player), getAudioStats(player)]).then(function (responses) {

        var categories = [];

        for (var i = 0, length = responses.length; i < length; i++) {
            categories.push(responses[i]);
        }

        return JSON.stringify({
            categories: categories
        });
    });
}

function processRequest(request, body) {

    var url = require('url');
    var url_parts = url.parse(request.url, true);
    var action = url_parts.pathname.substring(1).toLowerCase();

    switch (action) {

        case 'play':
            var data = JSON.parse(body);
            playMediaSource = data.mediaSource;
            createMpv(data.playerOptions, data.mediaType, playMediaSource);
            playMediaType = data.mediaType;

            var startPositionTicks = data["startPositionTicks"];

            mpvPlayer.volume(data.playerOptions.volume);

            return play(mpvPlayer, data.path).then(() => {
                if (playMediaSource.DefaultAudioStreamIndex != null && data.playMethod != 'Transcode') {
                    set_audiostream(mpvPlayer, playMediaSource.DefaultAudioStreamIndex);
                }

                if (playMediaSource.DefaultSubtitleStreamIndex != null) {
                    set_subtitlestream(mpvPlayer, playMediaSource.DefaultSubtitleStreamIndex);
                }
                else {
                    set_subtitlestream(mpvPlayer, -1);
                }

                if (startPositionTicks != 0) {
                    set_position(startPositionTicks);
                }

                return Promise.resolve(getReturnJson());
            });

        case 'stats':
            if (mpvPlayer) {
                return getStatsJson(mpvPlayer);
            } else {
                return Promise.resolve('[]');
            }
            break;
        case 'stop':
            return stop();

        case 'stopdestroy':

            var currentPlayerStatus = playerStatus;

            if (playMediaType && currentPlayerStatus && playMediaType.toLowerCase() === 'audio') {

                var originalVolume = currentVolumeInfo.volume;
                triggerVolumeEvents = false;

                return fade(currentVolumeInfo.volume).then(() => {

                    return stop().then(function () {

                        set_volume(originalVolume);
                        triggerVolumeEvents = true;

                        cleanup();
                        return Promise.resolve(getReturnJson());
                    });

                });
            } else {
                return stop();
            }
        case 'positionticks':
            var data = url_parts.query["val"];
            set_position(data);
            return Promise.resolve(getReturnJson());
        case 'seekrelative':
            var data = url_parts.query["val"];
            mpvPlayer.seek(Math.round(data / 10000000));
            return Promise.resolve(getReturnJson());
        case 'unpause':
            unpause();
            return Promise.resolve(getReturnJson());
        case 'playpause':
            pause_toggle();
            return Promise.resolve(getReturnJson());
        case 'pause':
            pause();
            return Promise.resolve(getReturnJson());
        case 'volumeup':
            set_volume(Math.min(100, currentVolumeInfo.volume + 2));
            return Promise.resolve(getReturnJson());
        case 'volumedown':
            set_volume(Math.max(1, currentVolumeInfo.volume - 2));
            return Promise.resolve(getReturnJson());
        case 'volume':
            var data = url_parts.query["val"];
            set_volume(data);
            return Promise.resolve(getReturnJson());
        case 'aspectratio':
            var data = url_parts.query["val"];
            setAspectRatio(mpvPlayer, data);
            return Promise.resolve(getReturnJson());
        case 'mute':
            mute();
            return Promise.resolve(getReturnJson());
        case 'unmute':
            unmute();
            return Promise.resolve(getReturnJson());
        case 'setaudiostreamindex':
            var data = url_parts.query["index"];
            set_audiostream(mpvPlayer, data);
            return Promise.resolve(getReturnJson());
        case 'setsubtitlestreamindex':
            var data = url_parts.query["index"];
            set_subtitlestream(mpvPlayer, data);
            return Promise.resolve(getReturnJson());
        case 'video_toggle':
            video_toggle();
            return Promise.resolve(getReturnJson());
        default:
            // This could be a refresh, e.g. player polling for data
            return Promise.resolve(getReturnJson());
    }
}

function initialize(playerWindowIdString, mpvBinaryPath) {
    playerWindowId = playerWindowIdString;
    mpvPath = mpvBinaryPath;
}

function onMpvTimePosition(data) {
    var ticks = data * 10000000;

    sendJavascript('MpvPlayer._onTimeUpdate(' + ticks.toString() + ');');
}

function onMpvStarted() {
    var resolve = currentPlayResolve;
    if (resolve) {
        currentPlayResolve = null;
        currentPlayReject = null;
        resolve();
    }
    mainWindowRef.focus();
}

function getDuration(currentPlayerStatus) {

    if (currentPlayerStatus.duration) {

        return currentPlayerStatus.duration;
    } else if (currentPlayerStatus['demuxer-cache-time']) {
        return currentPlayerStatus['demuxer-cache-time'];
    }
    return null;
}

function onMpvStatusChange(status) {

    var currentPlayerStatus = playerStatus;
    var lastVolumeInfo = currentVolumeInfo;

    if (status.volume == null) {

        // if volume is null, set it to the previous value
        status.volume = currentVolumeInfo.volume;
    }

    var volumeChanged = status.volume != lastVolumeInfo.volume || status.mute != lastVolumeInfo.mute;
    var durationChanged = currentPlayerStatus && (getDuration(status) != getDuration(currentPlayerStatus));

    playerStatus = status;

    if (volumeChanged) {

        if (triggerVolumeEvents) {
            lastVolumeInfo.volume = status.volume;
            lastVolumeInfo.mute = status.mute;

            sendJavascript('MpvPlayer._onVolumeChange(' + lastVolumeInfo.volume.toString() + ', ' + (lastVolumeInfo.mute || false).toString().toLowerCase() + ');');
        }
    }

    if (durationChanged) {
        onDurationChange(status);
    }

    var demuxerCacheState = status['demuxer-cache-state'];
    if (demuxerCacheState) {
        sendJavascript('MpvPlayer._onDemuxerCacheStateChanged(' + JSON.stringify(demuxerCacheState) + ');');
    }
}

function onMpvStopped() {

    if (currentPlayResolve || currentPlayReject) {
        return;
    }

    cleanup();
    sendJavascript('MpvPlayer._onStopped();');
}

function onMpvError() {

    var reject = currentPlayReject;
    if (reject) {
        currentPlayResolve = null;
        currentPlayReject = null;
        reject();
    }
    else {
        cleanup();
        sendJavascript('MpvPlayer._onError();');
    }
}

function onMpvPaused() {
    sendJavascript('MpvPlayer._onPlayPause(true);');
}

function onMpvResumed() {
    sendJavascript('MpvPlayer._onPlayPause(false);');
}

function onDurationChange(currentPlayerStatus) {

    var duration = getDuration(currentPlayerStatus);

    if (duration == null) {
        return;
    }

    var ticks = duration * 10000000;

    sendJavascript('MpvPlayer._onDurationUpdate(' + ticks.toString() + ');');
}

function createMpv(options, mediaType, mediaSource) {
    if (mpvPlayer) return;
    var isWindows = require('is-windows');

    var mpvOptions = getMpvOptions(options, mediaType, mediaSource);

    mpvOptions.push('--wid=' + playerWindowId);
    mpvOptions.push('--no-osc');
    mpvOptions.push('--no-input-cursor');
    mpvOptions.push('--input-vo-keyboard=no');
    mpvOptions.push('--audio-display=no');

    var mpvInitOptions = {
        "debug": false
    };

    if (mpvPath) {
        mpvInitOptions.binary = mpvPath;
    }

    if (isWindows()) {

        mpvInitOptions.socket = "\\\\.\\pipe\\emby-pipe";
        mpvInitOptions.ipc_command = "--input-ipc-server";
    } else {

        mpvInitOptions.socket = "/tmp/emby.sock";
        mpvInitOptions.ipc_command = "--input-unix-socket";
    }

    mpvPlayer = new mpv(mpvInitOptions, mpvOptions);

    mpvPlayer.observeProperty('idle-active', 13);
    mpvPlayer.observeProperty('demuxer-cache-time', 14);
    mpvPlayer.observeProperty('demuxer-cache-state', 15);
    mpvPlayer.observeProperty('volume', 16);
    mpvPlayer.observeProperty('mute', 17);
    mpvPlayer.observeProperty('ao-volume', 18);
    mpvPlayer.observeProperty('ao-mute', 19);

    mpvPlayer.on('timeposition', onMpvTimePosition);
    mpvPlayer.on('started', onMpvStarted);
    mpvPlayer.on('statuschange', onMpvStatusChange);
    mpvPlayer.on('stopped', onMpvStopped);
    mpvPlayer.on('error', onMpvError);
    mpvPlayer.on('paused', onMpvPaused);
    mpvPlayer.on('resumed', onMpvResumed);
}

function processNodeRequest(req, res) {

    var body = [];

    req.on('data', function (chunk) {
        body.push(chunk);
    }).on('end', function () {

        body = Buffer.concat(body).toString();
        // at this point, `body` has the entire request body stored in it as a string

        processRequest(req, body).then((json) => {
            if (json != null) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(json);
            } else {
                res.writeHead(200);
                res.end('');
            }
        }).catch(() => {
            res.writeHead(500);
            res.end();
        });
    });
}

var sendJavascript;
function setNotifyWebViewFn(fn) {

    sendJavascript = fn;
}

function registerMediaPlayerProtocol(protocol, mainWindow) {

    mainWindowRef = mainWindow;

    var http = require('http');

    http.createServer(processNodeRequest).listen(8023, '127.0.0.1');
}

exports.initialize = initialize;
exports.registerMediaPlayerProtocol = registerMediaPlayerProtocol;
exports.setNotifyWebViewFn = setNotifyWebViewFn;