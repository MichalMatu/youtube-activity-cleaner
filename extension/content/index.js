(() => {
  const shared = globalThis.YtActivityCleanerShared;
  const content = globalThis.YtActivityCleanerContent;
  const { ext, Messages } = shared;
  const t = shared.t || ((_key, _substitutions, fallback = "") => fallback);

  document.addEventListener("visibilitychange", () => {
    const state = content.getState();

    if (!state.running) {
      return;
    }

    if (document.visibilityState === "visible") {
      state.paused = false;
      content.setCleanerMessage(
        t("contentTabActiveAgain", undefined, "Tab active again. Continuing cleanup...")
      );
      return;
    }

    state.paused = true;
    content.setCleanerMessage(
      t(
        "contentPausedBringToFront",
        undefined,
        "Paused. Bring this tab to the front to continue."
      )
    );
  });

  ext.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message?.type) {
      return;
    }

    if (message.type === Messages.GET_CLEANER_STATUS) {
      sendResponse({ ok: true, status: content.getPopupStatus() });
      return;
    }

    if (message.type === Messages.START_CLEANER) {
      content
        .startCleaner()
        .then(() => {
          sendResponse({ ok: true, status: content.getPopupStatus() });
        })
        .catch((error) => {
          sendResponse({
            ok: false,
            error: error.message,
            status: content.getPopupStatus(),
          });
        });
      return true;
    }

    if (message.type === Messages.STOP_CLEANER) {
      content.stopCleaner();
      sendResponse({ ok: true, status: content.getPopupStatus() });
    }
  });
})();
