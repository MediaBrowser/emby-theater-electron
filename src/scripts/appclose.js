window.AppCloseHelper = {
  onClosing: function () {
    // Prevent backwards navigation from stopping video
    history.back = function () {};

    window.playbackManager.onAppClose();
  },
};
