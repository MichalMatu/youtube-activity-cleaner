(() => {
  const popup = (globalThis.YtActivityCleanerPopup =
    globalThis.YtActivityCleanerPopup || {});

  popup.elements = {
    pageStateElement: document.querySelector("#page-state"),
    runStateElement: document.querySelector("#run-state"),
    powerStateElement: document.querySelector("#power-state"),
    deletedCountElement: document.querySelector("#deleted-count"),
    attemptedCountElement: document.querySelector("#attempted-count"),
    failedCountElement: document.querySelector("#failed-count"),
    startButton: document.querySelector("#start-button"),
    stopButton: document.querySelector("#stop-button"),
    openPageButton: document.querySelector("#open-page-button"),
    supportButton: document.querySelector("#support-button"),
  };

  popup.setButtonsState = ({ canStart, canStop }) => {
    popup.elements.startButton.disabled = !canStart;
    popup.elements.stopButton.disabled = !canStop;
  };

  popup.renderPowerState = (status) => {
    if (status?.keepAwakeActive) {
      popup.elements.powerStateElement.textContent =
        "Keep-awake is enabled. Chrome should keep the display awake while cleaning runs.";
      return;
    }

    popup.elements.powerStateElement.textContent =
      "Keep-awake will be enabled automatically while cleaning is running.";
  };

  popup.renderStatus = (status, tab) => {
    const onSupportedPage = popup.isSupportedUrl(tab?.url);

    popup.elements.pageStateElement.textContent = onSupportedPage
      ? "Ready on the YouTube comments page."
      : "Open Google My Activity -> Your YouTube comments.";

    popup.elements.deletedCountElement.textContent = String(status?.deleted || 0);
    popup.elements.attemptedCountElement.textContent = String(status?.attempted || 0);
    popup.elements.failedCountElement.textContent = String(status?.failed || 0);
    popup.renderPowerState(status);

    if (!onSupportedPage) {
      popup.elements.runStateElement.textContent =
        "This extension works only on the YouTube comments page.";
      popup.setButtonsState({ canStart: false, canStop: false });
      return;
    }

    if (status?.running) {
      popup.elements.runStateElement.textContent =
        status.lastMessage || "Cleaner is running on the current page.";
      popup.setButtonsState({ canStart: false, canStop: true });
      return;
    }

    popup.elements.runStateElement.textContent = status?.lastMessage || "Cleaner is idle.";
    popup.setButtonsState({ canStart: true, canStop: false });
  };

  popup.renderError = (message, tab) => {
    popup.renderStatus(null, tab);
    popup.elements.runStateElement.textContent = message;
  };
})();
