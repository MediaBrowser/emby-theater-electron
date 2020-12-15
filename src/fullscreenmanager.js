import events from 'events';

import appHost from './apphost';

function fullscreenManager() {
  document.addEventListener('windowstatechanged', () => {
    events.trigger(this, 'fullscreenchange');
  });
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

export default new fullscreenManager();
