(() => {
  const shared = (globalThis.YtActivityCleanerShared =
    globalThis.YtActivityCleanerShared || {});

  shared.Messages = Object.freeze({
    START_CLEANER: "cleaner/start",
    STOP_CLEANER: "cleaner/stop",
    GET_CLEANER_STATUS: "cleaner/get-status",
    REQUEST_KEEP_AWAKE: "power/request-keep-awake",
    RELEASE_KEEP_AWAKE: "power/release-keep-awake",
    GET_KEEP_AWAKE_STATUS: "power/get-status",
  });
})();
