(() => {
  const content = (globalThis.YtActivityCleanerContent =
    globalThis.YtActivityCleanerContent || {});

  content.sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  content.scrollRoot = document.scrollingElement || document.documentElement;

  content.pauseUntilVisible = async () => {
    const state = content.getState();

    if (document.visibilityState === "visible") {
      if (state.paused) {
        state.paused = false;
        content.setCleanerMessage("Resumed after the tab became visible.");
      }

      return true;
    }

    state.paused = true;
    content.setCleanerMessage("Paused. Bring this tab to the front to continue.");

    while (document.visibilityState !== "visible") {
      if (state.stopRequested) {
        return false;
      }

      await content.sleep(300);
    }

    state.paused = false;
    content.setCleanerMessage("Tab active again. Continuing cleanup...");
    return true;
  };

  content.pauseAwareSleep = async (ms) => {
    let remaining = ms;

    while (remaining > 0) {
      if (content.getState().stopRequested) {
        return false;
      }

      if (!(await content.pauseUntilVisible())) {
        return false;
      }

      const chunk = Math.min(remaining, 200);
      const startedAt = Date.now();
      await content.sleep(chunk);

      if (document.visibilityState === "visible") {
        remaining -= Date.now() - startedAt;
      }
    }

    return true;
  };

  content.waitFor = async (fn, timeoutMs) => {
    let deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      if (content.getState().stopRequested) {
        return null;
      }

      if (document.visibilityState !== "visible") {
        const pausedAt = Date.now();
        const stillRunning = await content.pauseUntilVisible();
        if (!stillRunning) {
          return null;
        }

        deadline += Date.now() - pausedAt;
      }

      const result = fn();
      if (result) {
        return result;
      }

      await content.sleep(content.getSettingValue("pollMs"));
    }

    return null;
  };

  content.captureScrollSnapshot = () => ({
    top: content.scrollRoot.scrollTop,
    height: content.scrollRoot.scrollHeight,
  });

  content.scrollPageStep = () => {
    content.scrollRoot.scrollBy(
      0,
      Math.max(window.innerHeight * 0.9, content.getSettingValue("scrollStepPx"))
    );
  };

  content.hasScrollSnapshotChanged = (snapshot) =>
    content.scrollRoot.scrollTop !== snapshot.top ||
    content.scrollRoot.scrollHeight !== snapshot.height;
})();
