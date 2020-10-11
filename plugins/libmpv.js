define(['globalize', 'apphost', 'playbackManager', 'pluginManager', 'events', 'embyRouter', 'appSettings', 'userSettings', 'loading', 'dom', 'require', 'connectionManager'], function (globalize, appHost, playbackManager, pluginManager, events, embyRouter, appSettings, userSettings, loading, dom, require, connectionManager) {
    'use strict';

    function getTextTrackUrl(subtitleStream, serverId) {
        return playbackManager.getSubtitleUrl(subtitleStream, serverId);
    }

    return function () {

        var self = this;

        self.name = 'libmpv';
        self.type = 'mediaplayer';
        self.id = 'libmpvmediaplayer';
        self.priority = -2;

        var currentSrc;
        var playerState = {
            volume: parseInt(appSettings.get('mpv-volume') || '100'),
            isMuted: false,
            subDelay: 0,
            playbackRate: 1
        };
        var mediaSource;

        var videoDialog;
        var libmpv;
        var currentAspectRatio = 'auto';

        var orgRefreshRate;
        var curRefreshRate;
        var refreshRates;

        self.getRoutes = function () {

            var routes = [];

            routes.push({
                path: 'mpvplayer/audio.html',
                transition: 'slide',
                controller: pluginManager.mapPath(self, 'mpvplayer/audio.js'),
                type: 'settings',
                title: 'Audio',
                category: 'Playback',
                thumbImage: '',
                icon: 'audiotrack',
                settingsTheme: true
            });

            if (appHost.supports('windowtransparency')) {
                routes.push({
                    path: 'mpvplayer/video.html',
                    transition: 'slide',
                    controller: pluginManager.mapPath(self, 'mpvplayer/video.js'),
                    type: 'settings',
                    title: 'Video',
                    category: 'Playback',
                    thumbImage: '',
                    icon: 'tv',
                    settingsTheme: true
                });
            }

            return routes;
        };

        self.getTranslations = function () {

            var files = [];

            files.push({
                lang: 'cs',
                path: pluginManager.mapPath(self, 'mpvplayer/strings/cs.json')
            });

            files.push({
                lang: 'de',
                path: pluginManager.mapPath(self, 'mpvplayer/strings/de.json')
            });

            files.push({
                lang: 'el',
                path: pluginManager.mapPath(self, 'mpvplayer/strings/el.json')
            });

            files.push({
                lang: 'en-GB',
                path: pluginManager.mapPath(self, 'mpvplayer/strings/en-GB.json')
            });

            files.push({
                lang: 'en-US',
                path: pluginManager.mapPath(self, 'mpvplayer/strings/en-US.json')
            });

            files.push({
                lang: 'fr',
                path: pluginManager.mapPath(self, 'mpvplayer/strings/fr.json')
            });

            files.push({
                lang: 'hr',
                path: pluginManager.mapPath(self, 'mpvplayer/strings/hr.json')
            });

            files.push({
                lang: 'it',
                path: pluginManager.mapPath(self, 'mpvplayer/strings/it.json')
            });

            files.push({
                lang: 'ja',
                path: pluginManager.mapPath(self, 'mpvplayer/strings/ja.json')
            });

            files.push({
                lang: 'lt-LT',
                path: pluginManager.mapPath(self, 'mpvplayer/strings/lt-LT.json')
            });

            files.push({
                lang: 'nl',
                path: pluginManager.mapPath(self, 'mpvplayer/strings/nl.json')
            });

            files.push({
                lang: 'pl',
                path: pluginManager.mapPath(self, 'mpvplayer/strings/pl.json')
            });

            files.push({
                lang: 'pt-BR',
                path: pluginManager.mapPath(self, 'mpvplayer/strings/pt-BR.json')
            });

            files.push({
                lang: 'pt-PT',
                path: pluginManager.mapPath(self, 'mpvplayer/strings/pt-PT.json')
            });

            files.push({
                lang: 'ru',
                path: pluginManager.mapPath(self, 'mpvplayer/strings/ru.json')
            });

            files.push({
                lang: 'sv',
                path: pluginManager.mapPath(self, 'mpvplayer/strings/sv.json')
            });

            files.push({
                lang: 'zh-CN',
                path: pluginManager.mapPath(self, 'mpvplayer/strings/zh-CN.json')
            });

            return files;
        };

        self.canPlayMediaType = function (mediaType) {

            if ((mediaType || '').toLowerCase() == 'video') {

                return appHost.supports('windowtransparency');
            }
            return (mediaType || '').toLowerCase() == 'audio';
        };

        self.getDeviceProfile = function (item) {

            var profile = {};

            profile.MaxStreamingBitrate = 200000000;
            profile.MaxStaticBitrate = 200000000;
            profile.MusicStreamingTranscodingBitrate = 192000;

            profile.DirectPlayProfiles = [];

            // leave container null for all
            profile.DirectPlayProfiles.push({
                Type: 'Video'
            });

            // leave container null for all
            profile.DirectPlayProfiles.push({
                Type: 'Audio'
            });

            profile.TranscodingProfiles = [];

            profile.TranscodingProfiles.push({
                Container: 'ts',
                Type: 'Video',
                AudioCodec: 'ac3,mp3,aac',
                VideoCodec: 'h264,mpeg2video,hevc',
                Context: 'Streaming',
                Protocol: 'hls',
                MaxAudioChannels: '6',
                MinSegments: '1',
                BreakOnNonKeyFrames: true,
                SegmentLength: '3'
            });

            profile.TranscodingProfiles.push({
                Container: 'ts',
                Type: 'Audio',
                AudioCodec: 'aac',
                Context: 'Streaming',
                Protocol: 'hls',
                BreakOnNonKeyFrames: true,
                SegmentLength: '3'
            });

            profile.TranscodingProfiles.push({
                Container: 'mp3',
                Type: 'Audio',
                AudioCodec: 'mp3',
                Context: 'Streaming',
                Protocol: 'http'
            });

            profile.ContainerProfiles = [];

            profile.CodecProfiles = [];

            // Subtitle profiles
            // External vtt or burn in
            profile.SubtitleProfiles = [];
            profile.SubtitleProfiles.push({
                Format: 'srt',
                Method: 'External'
            });
            profile.SubtitleProfiles.push({
                Format: 'ssa',
                Method: 'External'
            });
            profile.SubtitleProfiles.push({
                Format: 'ass',
                Method: 'External'
            });
            profile.SubtitleProfiles.push({
                Format: 'vtt',
                Method: 'External'
            });
            profile.SubtitleProfiles.push({
                Format: 'srt',
                Method: 'Embed'
            });
            profile.SubtitleProfiles.push({
                Format: 'subrip',
                Method: 'Embed'
            });
            profile.SubtitleProfiles.push({
                Format: 'ass',
                Method: 'Embed'
            });
            profile.SubtitleProfiles.push({
                Format: 'ssa',
                Method: 'Embed'
            });
            profile.SubtitleProfiles.push({
                Format: 'dvb_teletext',
                Method: 'Embed'
            });
            profile.SubtitleProfiles.push({
                Format: 'dvb_subtitle',
                Method: 'Embed'
            });
            profile.SubtitleProfiles.push({
                Format: 'dvbsub',
                Method: 'Embed'
            });
            profile.SubtitleProfiles.push({
                Format: 'pgs',
                Method: 'Embed'
            });
            profile.SubtitleProfiles.push({
                Format: 'pgssub',
                Method: 'Embed'
            });
            profile.SubtitleProfiles.push({
                Format: 'dvdsub',
                Method: 'Embed'
            });
            profile.SubtitleProfiles.push({
                Format: 'vtt',
                Method: 'Embed'
            });
            profile.SubtitleProfiles.push({
                Format: 'sub',
                Method: 'Embed'
            });
            profile.SubtitleProfiles.push({
                Format: 'idx',
                Method: 'Embed'
            });
            profile.SubtitleProfiles.push({
                Format: 'smi',
                Method: 'Embed'
            });

            profile.ResponseProfiles = [];

            return Promise.resolve(profile);
        };

        self.getDirectPlayProtocols = function () {
            return ['File', 'Http', 'Rtp', 'Rtmp', 'Rtsp', 'Ftp'];
        };

        self.currentSrc = function () {
            return currentSrc;
        };

        function onNavigatedToOsd() {

            if (videoDialog) {
                videoDialog.classList.remove('mpv-videoPlayerContainer-withBackdrop');
                videoDialog.classList.remove('mpv-videoPlayerContainer-onTop');
            }
        }

        function createMediaElement(options) {

            return new Promise(function (resolve, reject) {

                var dlg = document.querySelector('.mpv-videoPlayerContainer');

                if (!dlg) {

                    require(['css!./libmpv'], function () {

                        loading.show();

                        var dlg = document.createElement('div');

                        dlg.classList.add('mpv-videoPlayerContainer');

                        if (options.backdropUrl && options.mediaType === 'Video') {

                            dlg.classList.add('mpv-videoPlayerContainer-withBackdrop');
                            dlg.style.backgroundImage = "url('" + options.backdropUrl + "')";
                        }

                        if (options.fullscreen && options.mediaType === 'Video') {
                            dlg.classList.add('mpv-videoPlayerContainer-onTop');
                        }

                        document.body.insertBefore(dlg, document.body.firstChild);
                        videoDialog = dlg;

                        var embed = document.createElement('embed');
                        embed.type = 'application/x-mpvjs';
                        embed.classList.add('mpv-videoPlayer')
                        embed.addEventListener('message', message)
                        embed.style.opacity = 0

                        dlg.insertBefore(embed, dlg.firstChild);
                        libmpv = embed

                        addEventListener('ready', async () => {
                            await observeProperty(['pause', 'time-pos', 'duration', 'volume', 'mute', 'eof-reached', 'demuxer-cache-state', 'demuxer-cache-time', 'estimated-vf-fps', 'sub-delay', 'speed', 'core-idle'])
                            if (options.fullscreen && options.mediaType === 'Video') {
                                zoomIn(dlg).then(resolve);
                            } else {
                                resolve();
                            }
                        }, { once: true })

                    });

                } else {

                    if (libmpv) {
                        libmpv.style.opacity = 0
                    }
                    dlg.style.opacity = 1                   
                    if (options.backdropUrl && options.mediaType === 'Video') {

                        dlg.classList.add('mpv-videoPlayerContainer-withBackdrop');
                        dlg.style.backgroundImage = "url('" + options.backdropUrl + "')";
                    }

                    resolve();
                }
            });
        }

        function toTicks(val) {
            return val * 10000000
        }

        function message(recv) {
            if (recv.data.type == 'ready') {
                dispatchEvent(new Event(recv.data.type))
            }

            if (recv.data.type == 'property_change') {
                switch (recv.data.data.name) {
                    case 'time-pos':
                        self._onTimeUpdate(toTicks(recv.data.data.value))
                        break
                    case 'pause':
                        self._onPlayPause(recv.data.data.value)
                        break
                    case 'duration':
                        self._onDurationUpdate(toTicks(recv.data.data.value))
                        break
                    case 'volume':
                        self._onVolumeChange(recv.data.data.value)
                        break
                    case 'mute':
                        self._onMute(recv.data.data.value)
                        break
                    case 'eof-reached':
                        self._onStopped(recv.data.data.value)
                        break
                    case 'demuxer-cache-state':
                        self._onDemuxerCacheStateChanged(recv.data.data.value)
                        break
                    case "demuxer-cache-time":
                        self._onDemuxerCacheTimeChanged(recv.data.data.value)
                        break
                    case "estimated-vf-fps":
                        self._onEstimatedVfFpsChanged(recv.data.data.value)
                        break
                    case "sub-delay":
                        self._onSubtitleOffsetUpdate(recv.data.data.value)
                        break
                    case "speed":
                        self._onPlaybackRateUpdate(recv.data.data.value)
                        break
                    case "core-idle":
                        self._onCoreIdleUpdate(recv.data.data.value)
                        break
                    default:
                        //console.log(`${recv.data.data.name}: ${recv.data.data.value}`)
                        dispatchEvent(new CustomEvent(recv.data.data.name, { detail: recv.data.data.value }))
                        break
                }
            }
        };


        self.play = async function (options) {
            await createMediaElement(options);
            await new Promise((resolve, reject) => {
                addEventListener('core-playing', resolve, { once: true })
                playInternal(options);
            })
            if (libmpv) {
                libmpv.style.opacity = 1;
            }
            if (videoDialog && appSettings.get('mpv-vo') && appSettings.get('mpv-vo') !== 'libmpv' && window.platform === 'win32') {
                videoDialog.style.opacity = 0;
            }
            await showOsd(options);
        };

        async function playInternal(options) {

            var item = options.item;
            mediaSource = options.mediaSource;

            var url = options.url;

            currentSrc = url;
            currentAspectRatio = 'auto'

            //var isVideo = options.mimeType.toLowerCase('video').indexOf() == 0;
            var isVideo = options.item.MediaType == 'Video';

            for (var i = 0, length = mediaSource.MediaStreams.length; i < length; i++) {

                var track = mediaSource.MediaStreams[i];

                if (track.Type === 'Subtitle') {

                    if (track.DeliveryMethod === 'External') {
                        track.DeliveryUrl = getTextTrackUrl(track, item.ServerId);
                    }
                }
            }

            var fullscreen = options.fullscreen || false;
            var mediaType = options.item.MediaType;
            var playMethod = options.playMethod;
            var startPositionTicks = options.playerStartPositionTicks || 0

            var subtitleAppearanceSettings = userSettings.getSubtitleAppearanceSettings();
            var fontSize;
            switch (subtitleAppearanceSettings.textSize || '') {
                case 'smaller':
                    fontSize = 35;
                    break;
                case 'small':
                    fontSize = 45;
                    break;
                case 'larger':
                    fontSize = 75;
                    break;
                case 'extralarge':
                    fontSize = 85;
                    break;
                case 'large':
                    fontSize = 65;
                    break;
                default:
                    break;
            }

            var playerOptions = {
                "volume": playerState.volume,
                "audio-display": 'no',
                "wid": window.PlayerWindowId,
                "keep-open": 'yes',
                "speed": 1,
                "sub-delay": 0
            }
            
            if (appSettings.get('mpv-hwdec') !== "unset") {
                playerOptions["hwdec"] = appSettings.get('mpv-hwdec') || "auto"
            }

            if (appSettings.get('mpv-vo') && window.platform === 'win32') {
                playerOptions["vo"] = appSettings.get('mpv-vo')
            }

            if (appSettings.get('mpv-outputlevels')) {
                playerOptions["video-output-levels"] = appSettings.get('mpv-outputlevels')
            }

            if (appSettings.get('mpv-openglhq') === 'true') {
                playerOptions["profile"] = 'opengl-hq'
            }

            if (appSettings.get('mpv-videosyncmode')) {
                playerOptions["video-sync"] = appSettings.get('mpv-videosyncmode')
            }

            if (appSettings.get('mpv-interpolation') === 'true') {
                playerOptions["interpolation"] = true
            }

            if (fullscreen) {
                playerOptions["fullscreen"] = fullscreen
            }

            if (mediaSource.RunTimeTicks == null || options.item.Type === 'Recording') {
                playerOptions["demuxer-readahead-secs"] = 1800
            }

            if (fontSize) {
                playerOptions["sub-font-size"] = fontSize
            }

            if (subtitleAppearanceSettings.textColor && subtitleAppearanceSettings.textColor.indexOf('#') === 0) {
                playerOptions["sub-color"] = subtitleAppearanceSettings.textColor
            }


            await setProperty(Object.assign(playerOptions, audioDelay(), interlace(), getMpvAudioOptions(mediaType)))
            await sendCommand(['loadfile', url])

            if (mediaSource.DefaultAudioStreamIndex && playMethod != 'Transcode') {
                await setAudioStream(mediaSource.DefaultAudioStreamIndex);
            }

            await setSubtitleStream(mediaSource.DefaultSubtitleStreamIndex || -1)
            await setProperty({
                start: `${Math.floor(startPositionTicks / 10000000)}`,
                pause: false
            })

            await displaySync(fullscreen)
        }

        async function showOsd(options) {
            if (options.item.MediaType == 'Video') {
                if (options.fullscreen) {
                    await embyRouter.showVideoOsd()
                    onNavigatedToOsd();

                } else {
                    embyRouter.setTransparency('backdrop');

                    if (videoDialog) {
                        videoDialog.classList.remove('mpv-videoPlayerContainer-withBackdrop');
                        videoDialog.classList.remove('mpv-videoPlayerContainer-onTop');
                    }
                }
            }
        }

        // Save this for when playback stops, because querying the time at that point might return 0
        self.currentTime = function (val) {

            if (val != null) {
                sendCommand(['seek', `${Math.floor(val / 1000)}`, 'absolute', 'exact']).then(function () {

                    events.trigger(self, 'seek');
                });
                return;
            }

            return (playerState.positionTicks || 0) / 10000;
        };

        function seekRelative(offsetMs) {
            sendCommand(['seek', `${Math.floor(offsetMs / 1000)}`, 'relative']).then(function () {

                events.trigger(self, 'seek');
            });
        }

        self.rewind = function (offsetMs) {
            return seekRelative(0 - offsetMs);
        };

        self.fastForward = function (offsetMs) {
            return seekRelative(offsetMs);
        };

        self.duration = function (val) {

            if (playerState.durationTicks) {
                return playerState.durationTicks / 10000;
            }
            if (playerState["demuxer-cache-time"]) {
                return playerState["demuxer-cache-time"];
            }
            return;
        };

        self.stop = async function (destroyPlayer) {
            if (destroyPlayer) {
                await destroyInternal()
            } else {
                await sendCommand('stop')
            }
            self._onStopped(true)
        };

        self.destroy = function () {

            return destroyInternal()
        };

        self.playPause = function () {

            sendCommand(['cycle', 'pause']);
        };

        self.pause = function () {
            setProperty({ pause: true });
        };

        self.unpause = function () {
            setProperty({ pause: false });
        };

        self.paused = function () {

            return playerState.isPaused || false;
        };

        self.volumeUp = function (val) {
            setProperty({ volume: Math.min(100, playerState.volume + 2) });
        };

        self.volumeDown = function (val) {
            setProperty({ volume: Math.max(0, playerState.volume - 2) });
        };

        self.volume = function (val) {
            if (val != null) {
                return setProperty({ volume: val });
            }

            return playerState.volume || 0;
        };

        self.setSubtitleStreamIndex = function (index) {
            setSubtitleStream(index)
        };

        self.setAudioStreamIndex = function (index) {
            setAudioStream(index)
        };

        self.canSetAudioStreamIndex = function () {
            return true;
        };

        self.setMute = function (mute) {

            setProperty({ mute });
        };

        self.isMuted = function () {
            return playerState.isMuted || false;
        };

        self.getStats = function () {

            return Promise.all([getMediaStats(), getVideoStats(), getAudioStats()]).then(function (responses) {

                var categories = [];

                for (var i = 0, length = responses.length; i < length; i++) {
                    categories.push(responses[i]);
                }

                return {
                    categories: categories
                };
            });
        }

        function mapRange(range) {
            var offset;
            //var currentPlayOptions = instance._currentPlayOptions;
            //if (currentPlayOptions) {
            //    offset = currentPlayOptions.transcodingOffsetTicks;
            //}

            offset = offset || 0;

            return {
                start: (range.start * 10000000) + offset,
                end: (range.end * 10000000) + offset
            };
        }

        var supportedFeatures;
        function getSupportedFeatures() {

            var list = [];

            list.push('SetAspectRatio');
            list.push('SetPlaybackRate');
            list.push('SetSubtitleOffset');

            return list;
        }

        self.supports = function (feature) {

            if (!supportedFeatures) {
                supportedFeatures = getSupportedFeatures();
            }

            return supportedFeatures.indexOf(feature) !== -1;
        };

        self.setAspectRatio = function (val) {

            currentAspectRatio = val;
            switch (val) {
                case "auto":
                    setProperty({
                        "video-unscaled": "no",
                        "video-aspect": "-1",
                        "panscan": "0"
                    });
                    break;
                case "fill":
                    var aspect = window.innerWidth.toString() + ":" + window.innerHeight.toString();
                    setProperty({
                        "video-unscaled": "no",
                        "video-aspect": aspect,
                        "panscan": "0"
                    });
                    break;
                case "cover":
                    setProperty({
                        "video-unscaled": "no",
                        "video-aspect": "-1",
                        "panscan": "1"
                    });
                    break;
            }
        };

        self.getAspectRatio = function () {

            return currentAspectRatio;
        };

        self.getSupportedAspectRatios = function () {

            return [
                { name: globalize.translate('Auto'), id: 'auto' },
                { name: globalize.translate('Cover'), id: 'cover' },
                { name: globalize.translate('Fill'), id: 'fill' }
            ];
        };

        self.getBufferedRanges = function () {

            var cacheState = playerState.demuxerCacheState;
            if (cacheState) {

                var ranges = cacheState['seekable-ranges'];

                if (ranges) {
                    return ranges.map(mapRange);
                }
            }
            return [];
        };

        self.seekable = function () {

            return true;
        };

        self._onTimeUpdate = function (ticks) {

            playerState.positionTicks = ticks;

            events.trigger(self, 'timeupdate');
        };

        self._onDurationUpdate = function (ticks) {

            playerState.durationTicks = ticks;
        };

        self._onDemuxerCacheStateChanged = function (value) {
            playerState.demuxerCacheState = value;
        };

        self._onError = function () {

            events.trigger(self, 'error');
        };

        self._onPlayPause = function (paused) {

            playerState.isPaused = paused;

            if (paused) {
                events.trigger(self, 'pause');
            } else {
                events.trigger(self, 'unpause');
            }
        };

        self._onMute = function (muted) {
            if (playerState.isMuted !== muted) {
                playerState.isMuted = muted;
                events.trigger(self, 'volumechange');
            }
        }

        self._onVolumeChange = function (volume) {
            if (playerState.volume !== volume) {
                playerState.volume = volume;
                appSettings.set('mpv-volume', volume);
                events.trigger(self, 'volumechange');
            }
        };

        self._onStopped = function (stopped) {
            if (stopped) {
                events.trigger(self, 'stopped');
            }
        };

        self._onCoreIdleUpdate = function (idle) {
            if (!idle){
                dispatchEvent(new Event('core-playing'))
            }
        }

        self._onDemuxerCacheTimeChanged = function (value) {
            playerState["demuxer-cache-time"] = value
        }

        self._onEstimatedVfFpsChanged = async function (fps) {
            if (appSettings.get('mpv-displaysync') === 'true' && refreshRates && fps) {
                if ((window.innerWidth == screen.width) && (screen.height == window.innerHeight)) {
                    var calc = calcRefreshRate(refreshRates, fps)
                    var pos = []
                    if (appSettings.get('mpv-displaysync_override')) {
                        var prefs = appSettings.get('mpv-displaysync_override').split(';')
                        for (var pref of prefs) {
                            if (calc.some((i) => i == pref)) {
                                pos.push(pref)
                            }
                        }
                    }
                    if (pos[0]) {
                        if (pos[0] != curRefreshRate) {
                            curRefreshRate = await setRefreshRate(pos[0])
                        }
                    } else if (calc[0]) {
                        if (calc[0] != curRefreshRate) {
                            curRefreshRate = await setRefreshRate(calc[0])
                        }
                    }
                }
            }
        }

        self._onSubtitleOffsetUpdate = function (value) {
            playerState.subDelay = value * 1000;
            events.trigger(self, 'subtitleoffsetchange');
        };

        self._onPlaybackRateUpdate = function (value) {
            playerState.playbackRate = value;
            events.trigger(self, 'playbackratechange');
        };

        self.setSubtitleOffset = function (value) {
            setProperty({ "sub-delay": value / 1000});
        };

        self.incrementSubtitleOffset = function (value) {
            setProperty({ "sub-delay": (playerState.subDelay + value) / 1000 });
        };

        self.setPlaybackRate = function (value) {
            setProperty({ "speed": value });
        };

        self.getSubtitleOffset = function () {
            return playerState.subDelay.toFixed();
        };

        self.getPlaybackRate = function () {
            return playerState.playbackRate;
        };

        function zoomIn(elem) {

            return new Promise(function (resolve, reject) {

                var duration = 240;
                elem.style.animation = 'mpvvideoplayer-zoomin ' + duration + 'ms ease-in normal';
                dom.addEventListener(elem, dom.whichAnimationEvent(), resolve, {
                    once: true
                });
            });
        }

        function destroyInternal() {

            embyRouter.setTransparency('none');

            if (orgRefreshRate != curRefreshRate) {
                setRefreshRate(orgRefreshRate)
            }

            var dlg = videoDialog;
            if (dlg) {
                videoDialog = null;
                dlg.parentNode.removeChild(dlg);
            }
            if (libmpv) {
                libmpv = null
            }

            return Promise.resolve()
        }

        function interlace() {
            var videoStream = (mediaSource.MediaStreams || []).filter(function (v) {
                return v.Type == 'Video';
            })[0];

            if (appSettings.get('mpv-deinterlace') == 'yes' || (!appSettings.get('mpv-deinterlace') && videoStream != null && videoStream.IsInterlaced)) {
                return { 'deinterlace': 'yes' };
            } else {
                return { 'deinterlace': 'no' };
            }
        }

        function audioDelay() {
            var videoStream = (mediaSource.MediaStreams || []).filter(function (v) {
                return v.Type == 'Video';
            })[0];
            var framerate = videoStream ? (videoStream.AverageFrameRate || videoStream.RealFrameRate) : 0;

            var audioDelay = framerate >= 23 && framerate <= 25 ? parseInt(appSettings.get('mpv-audiodelay2325') || 0) : parseInt(appSettings.get('mpv-audiodelay') || 0);

            return { 'audio-delay': (audioDelay / 1000) };
        }

        function getMpvAudioOptions(mediaType) {

            var dict = {};

            var audioChannels = appSettings.get('mpv-speakerlayout') || 'auto-safe';
            var audioFilters = [];
            if (audioChannels === '5.1') {
                audioChannels = '5.1,stereo';
            }
            else if (audioChannels === '7.1') {
                audioChannels = '7.1,stereo';
            }

            var audioChannelsFilter = getAudioChannelsFilter(mediaType);
            if (audioChannelsFilter) {
                audioFilters.push(audioChannelsFilter);
            }

            if (audioFilters.length) {

                dict['af'] = 'lavfi=[' + (audioFilters.join(',')) + ']';
            }

            dict['audio-channels'] = audioChannels;

            if (appSettings.get('mpv-audiospdif')) {
                dict['audio-spdif'] = appSettings.get('mpv-audiospdif');
            }

            dict['ad-lavc-ac3drc'] = parseInt(appSettings.get('mpv-drc') || '0') / 100;

            if (appSettings.get('mpv-exclusiveaudio') === 'true' && mediaType === 'video') {
                dict['audio-exclusive'] = 'yes';
            }

            return dict;
        }

        function getAudioChannelsFilter(mediaType) {

            var enableFilter = false;
            var upmixFor = (appSettings.get('mpv-upmixaudiofor') || '').split(',');

            if (mediaType === 'Audio') {
                if (upmixFor.indexOf('music') !== -1) {
                    enableFilter = true;
                }
            }

            //there's also a surround filter but haven't found good documentation to implement -PMR 20171225
            if (enableFilter) {
                var audioChannels = appSettings.get('mpv-speakerlayout') || '';
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

        function setSubtitleStream(index) {
            setProperty({ "sub-delay": 0 })
            if (index < 0) {
                return setProperty({ "sid": "no" });
            } else {
                var subIndex = 0;
                var i, length, stream;
                var streams = mediaSource.MediaStreams || [];
                for (i = 0, length = streams.length; i < length; i++) {
                    stream = streams[i];
                    if (stream.Type == 'Subtitle') {
                        subIndex++;
                        if (stream.Index == index) {
                            if (stream.DeliveryMethod == 'External') {
                                return sendCommand(["sub-add", stream.DeliveryUrl, "cached", stream.DisplayTitle, stream.Language]);
                            } else {
                                return setProperty({ "sid": subIndex }).then(() => {
                                    if (stream.Codec == "dvb_teletext") {
                                        return setDvbTeletextPage(stream);
                                    }
                                    return Promise.resolve()
                                })
                            }
                        }
                    }
                }
            }
            return Promise.resolve()
        }

        function setDvbTeletextPage(stream) {

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
                return setProperty({ "teletext-page": pageNumber });
            }
            return Promise.resolve()
        }

        function setAudioStream(index) {

            var audioIndex = 0;
            var i, length, stream;
            var streams = mediaSource.MediaStreams || [];
            for (i = 0, length = streams.length; i < length; i++) {
                stream = streams[i];
                if (stream.Type == 'Audio') {
                    audioIndex++;
                    if (stream.Index == index) {
                        return setProperty({ "aid": audioIndex });
                    }
                }
            }
            return Promise.resolve()
        }

        function getProperty(data) {
            return new Promise((resolve, reject) => {
                var type = 'get_property_async';
                if (libmpv) {
                    libmpv.postMessage({ type, data })
                    addEventListener(data, (event) => {
                        resolve(event.detail)
                    }, { once: true })
                }
            })
        }

        function observeProperty(props) {
            var type = 'observe_property';
            for (var data of props) {
                if (libmpv) {
                    libmpv.postMessage({ type, data })
                }
            }
            return Promise.resolve()
        }

        function setProperty(props) {
            var type = 'set_property';
            for (var prop of Object.keys(props)) {
                var data = { name: prop, value: props[prop] }
                if (libmpv) {
                    libmpv.postMessage({ type, data })
                }
            }
            return Promise.resolve()
        }

        function sendCommand(data) {
            var type = 'command';
            if (libmpv) {
                libmpv.postMessage({ type, data })
            }
            return Promise.resolve()
        }

        function getAudioStats() {

            var properties = [
                { property: 'audio-codec-name' },
                { property: 'audio-out-params' },
                { property: 'audio-bitrate', name: 'Audio bitrate:', type: 'bitrate' },
                { property: 'current-ao', name: 'Audio renderer:' },
                { property: 'audio-out-detected-device', name: 'Audio output device:' }
            ];

            var promises = properties.map(function (p) {
                return getProperty(p.property);
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

        function getVideoStats() {

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
                return getProperty(p.property);
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

                if (curRefreshRate) {
                    stats.push({
                        label: 'Refresh Rate:',
                        value: `${curRefreshRate} Hz`
                    });
                }

                stats.push({
                    label: 'Dropped frames:',
                    value: getDroppedFrames(responses)
                });

                stats.push({
                    label: 'Display Fullscreen Resolution:',
                    value: screen.width + ' x ' + screen.height
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

        function getMediaStats() {

            var properties = [
                { property: 'media-title', name: 'Title:' },
                { property: 'chapter', name: 'Chapter:' }
            ];

            var promises = properties.map(function (p) {
                return getProperty(p.property);
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

        async function displaySync(fullscreen) {
            refreshRates = await getRefreshRateList()
            orgRefreshRate = curRefreshRate = await getRefreshRate()
        }

        function calcRefreshRate(rates, fps) {
            return rates.filter((rate) => rate % Math.round(fps) === 0)
        }

        function getRefreshRateList() {
            return new Promise((resolve, reject) => {
                var xhr = new XMLHttpRequest();
                xhr.open('POST', 'electronrefreshrate://list_possible')
                xhr.onload = function () {
                    if (this.response) {
                        resolve(this.response.split(';'))
                    } else {
                        resolve()
                    }
                }
                xhr.onerror = reject;
                xhr.send();
            })
        }

        function getRefreshRate() {
            return new Promise((resolve, reject) => {
                var xhr = new XMLHttpRequest();
                xhr.open('POST', 'electronrefreshrate://current')
                xhr.onload = function () {
                    if (this.response) {
                        var mat = this.response.match(/.*?(\d+)/)
                        resolve(mat[1])
                    } else {
                        resolve()
                    }
                }
                xhr.onerror = reject;
                xhr.send();
            })
        }

        function setRefreshRate(rate) {
            return new Promise((resolve, reject) => {
                var xhr = new XMLHttpRequest();
                xhr.open('POST', `electronrefreshrate://change?rate=${rate}`)
                xhr.onload = function () {
                    if (this.response) {
                        var mat = this.response.match(/.*?(\d+)/)
                        resolve(mat[1])
                    } else {
                        resolve()
                    }
                }
                xhr.onerror = reject;
                xhr.send();
            })
        }

    }
});
