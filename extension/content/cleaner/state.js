(() => {
  const shared = globalThis.YtActivityCleanerShared;
  const content = (globalThis.YtActivityCleanerContent =
    globalThis.YtActivityCleanerContent || {});
  const { Constants } = shared;

  const state = (content.state = content.state || {
    running: false,
    stopRequested: false,
    paused: false,
    attempted: 0,
    deleted: 0,
    failed: 0,
    lastMessage: "Idle.",
    lastItem: "",
  });

  content.getState = () => state;

  content.isSupportedPage = () =>
    window.location.hostname === Constants.SUPPORTED_PAGE_HOST &&
    window.location.href.includes(Constants.SUPPORTED_PAGE_FRAGMENT);

  content.getCleanerStatus = () => ({
    running: state.running,
    stopRequested: state.stopRequested,
    paused: state.paused,
    attempted: state.attempted,
    deleted: state.deleted,
    failed: state.failed,
    lastMessage: state.lastMessage,
    lastItem: state.lastItem,
    supportedPage: content.isSupportedPage(),
    visibilityState: document.visibilityState,
  });

  content.setCleanerMessage = (message) => {
    state.lastMessage = message;
  };
})();
