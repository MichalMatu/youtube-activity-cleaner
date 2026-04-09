(() => {
  const shared = globalThis.YtActivityCleanerShared;
  const content = globalThis.YtActivityCleanerContent;
  const { ext, Messages } = shared;

  document.addEventListener("visibilitychange", () => {
    const state = content.getState();

    if (!state.running) {
      return;
    }

    if (document.visibilityState === "visible") {
      state.paused = false;
      content.setCleanerMessage("Tab active again. Continuing cleanup...");
      return;
    }

    state.paused = true;
    content.setCleanerMessage("Paused. Bring this tab to the front to continue.");
  });

  ext.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message?.type) {
      return;
    }

    if (message.type === Messages.GET_CLEANER_STATUS) {
      sendResponse({ ok: true, status: content.getCleanerStatus() });
      return;
    }

    if (message.type === Messages.START_CLEANER) {
      content
        .startCleaner()
        .then((status) => {
          sendResponse({ ok: true, status });
        })
        .catch((error) => {
          sendResponse({
            ok: false,
            error: error.message,
            status: content.getCleanerStatus(),
          });
        });
      return true;
    }

    if (message.type === Messages.STOP_CLEANER) {
      sendResponse({ ok: true, status: content.stopCleaner() });
    }
  });
})();
