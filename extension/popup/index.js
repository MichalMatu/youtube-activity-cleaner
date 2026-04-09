(() => {
  const shared = globalThis.YtActivityCleanerShared;
  const popup = (globalThis.YtActivityCleanerPopup =
    globalThis.YtActivityCleanerPopup || {});
  const { ext, Messages, Constants } = shared;

  popup.getActiveTab = async () => {
    const [tab] = await ext.tabs.query({ active: true, currentWindow: true });
    return tab || null;
  };

  popup.isSupportedUrl = (url) =>
    typeof url === "string" &&
    url.startsWith(`https://${Constants.SUPPORTED_PAGE_HOST}/`) &&
    url.includes(Constants.SUPPORTED_PAGE_FRAGMENT);

  popup.sendToTab = async (message) => {
    const tab = await popup.getActiveTab();
    if (!tab?.id) {
      throw new Error("No active tab found.");
    }

    return {
      tab,
      response: await ext.tabs.sendMessage(tab.id, message),
    };
  };

  popup.refreshStatus = async () => {
    const tab = await popup.getActiveTab();
    if (!tab) {
      popup.renderError("No active tab found.", null);
      return;
    }

    if (!popup.isSupportedUrl(tab.url)) {
      popup.renderStatus(null, tab);
      return;
    }

    try {
      const [{ response }, keepAwake] = await Promise.all([
        popup.sendToTab({ type: Messages.GET_CLEANER_STATUS }),
        ext.runtime.sendMessage({ type: Messages.GET_KEEP_AWAKE_STATUS }),
      ]);

      popup.renderStatus(
        {
          ...response?.status,
          keepAwakeActive: keepAwake?.keepAwakeActive,
        },
        tab
      );
    } catch (error) {
      popup.renderError("Reload the comments page and try again.", tab);
      console.error(error);
    }
  };

  popup.elements.startButton.addEventListener("click", async () => {
    try {
      const { tab, response } = await popup.sendToTab({
        type: Messages.START_CLEANER,
      });
      popup.renderStatus(response?.status, tab);
    } catch (error) {
      popup.renderError(error.message, await popup.getActiveTab());
      console.error(error);
    }
  });

  popup.elements.stopButton.addEventListener("click", async () => {
    try {
      const { tab, response } = await popup.sendToTab({
        type: Messages.STOP_CLEANER,
      });
      popup.renderStatus(response?.status, tab);
    } catch (error) {
      popup.renderError(error.message, await popup.getActiveTab());
      console.error(error);
    }
  });

  popup.elements.openPageButton.addEventListener("click", async () => {
    await ext.tabs.create({ url: Constants.COMMENTS_PAGE_URL });
  });

  popup.elements.supportButton.addEventListener("click", async () => {
    await ext.tabs.create({ url: Constants.SUPPORT_URL });
  });

  popup.refreshStatus();
  setInterval(popup.refreshStatus, 1000);
})();
