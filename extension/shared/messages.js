(() => {
  const shared = (globalThis.YtActivityCleanerShared =
    globalThis.YtActivityCleanerShared || {});

  shared.Messages = Object.freeze({
    START_CLEANER: "cleaner/start",
    STOP_CLEANER: "cleaner/stop",
    GET_CLEANER_STATUS: "cleaner/get-status",
    SET_CLEANER_TAB: "cleaner/set-tab",
    GET_CLEANER_TAB: "cleaner/get-tab",
    CLEAR_CLEANER_TAB: "cleaner/clear-tab",
    REQUEST_KEEP_AWAKE: "power/request-keep-awake",
    RELEASE_KEEP_AWAKE: "power/release-keep-awake",
    GET_KEEP_AWAKE_STATUS: "power/get-status",
  });
})();
