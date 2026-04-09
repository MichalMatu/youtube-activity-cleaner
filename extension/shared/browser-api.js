(() => {
  const shared = (globalThis.YtActivityCleanerShared =
    globalThis.YtActivityCleanerShared || {});

  shared.ext = globalThis.browser ?? globalThis.chrome;
})();
