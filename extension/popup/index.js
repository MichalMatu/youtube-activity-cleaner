(() => {
  const shared = globalThis.YtActivityCleanerShared;
  const popup = (globalThis.YtActivityCleanerPopup =
    globalThis.YtActivityCleanerPopup || {});
  const {
    ext,
    Messages,
    Constants,
    getSettings,
    saveSettings,
    resetSettings,
    sanitizeSettings,
  } = shared;

  popup.formatSecondsInputValue = (ms) => {
    const seconds = ms / 1000;

    return Number.isInteger(seconds) ? String(seconds) : seconds.toFixed(1);
  };

  popup.getSettingsPreviewText = (settings) => {
    const normalizedSettings = sanitizeSettings(settings);

    return `${popup.formatSecondsInputValue(normalizedSettings.betweenItemsMs)}s pace • ${normalizedSettings.retryLimit} retries • stop after ${normalizedSettings.failureStreakLimit}`;
  };

  popup.normalizeInputValue = (value) => {
    const normalizedValue = String(value).trim();

    return normalizedValue ? normalizedValue : Number.NaN;
  };

  popup.parseSecondsInput = (value) => {
    const numericValue = Number(popup.normalizeInputValue(value));

    return Number.isFinite(numericValue) ? Math.round(numericValue * 1000) : Number.NaN;
  };

  popup.getSettingsFromForm = () => ({
    betweenItemsMs: popup.parseSecondsInput(popup.elements.betweenItemsSecondsInput.value),
    scrollPauseMs: popup.parseSecondsInput(popup.elements.scrollPauseSecondsInput.value),
    retryLimit: popup.normalizeInputValue(popup.elements.retryLimitInput.value),
    retryBackoffMs: popup.parseSecondsInput(popup.elements.retryBackoffSecondsInput.value),
    failureStreakLimit: popup.normalizeInputValue(
      popup.elements.failureStreakLimitInput.value
    ),
  });

  popup.applySettingsToForm = (settings) => {
    popup.elements.betweenItemsSecondsInput.value = popup.formatSecondsInputValue(
      settings.betweenItemsMs
    );
    popup.elements.scrollPauseSecondsInput.value = popup.formatSecondsInputValue(
      settings.scrollPauseMs
    );
    popup.elements.retryLimitInput.value = String(settings.retryLimit);
    popup.elements.retryBackoffSecondsInput.value = popup.formatSecondsInputValue(
      settings.retryBackoffMs
    );
    popup.elements.failureStreakLimitInput.value = String(settings.failureStreakLimit);
    popup.renderSettingsPreview(popup.getSettingsPreviewText(settings));
  };

  popup.saveSettingsFromForm = async (successMessage) => {
    const settings = await saveSettings(popup.getSettingsFromForm());
    popup.applySettingsToForm(settings);
    popup.renderSettingsState(successMessage);
    return settings;
  };

  popup.getActiveTab = async () => {
    const [tab] = await ext.tabs.query({ active: true, currentWindow: true });
    return tab || null;
  };

  popup.isSupportedUrl = (url) =>
    typeof url === "string" &&
    url.startsWith(`https://${Constants.SUPPORTED_PAGE_HOST}/`) &&
    url.includes(Constants.SUPPORTED_PAGE_FRAGMENT);

  popup.isMissingReceiverError = (error) =>
    /Could not establish connection|Receiving end does not exist/i.test(
      error?.message || ""
    );

  popup.getDisconnectedPageMessage = (tab) => {
    if (tab?.status === "loading") {
      return "The comments page is still loading. Wait a moment and try again.";
    }

    return "Reload the comments page once so the extension can connect to it.";
  };

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
      if (popup.isMissingReceiverError(error)) {
        popup.renderDisconnectedPage(popup.getDisconnectedPageMessage(tab), tab);
        return;
      }

      popup.renderError("Reload the comments page and try again.", tab);
      console.error(error);
    }
  };

  popup.elements.startButton.addEventListener("click", async () => {
    try {
      await popup.saveSettingsFromForm("Settings saved. Starting cleaner with the saved values.");
      const { tab, response } = await popup.sendToTab({
        type: Messages.START_CLEANER,
      });
      if (response?.ok === false) {
        throw new Error(response.error || "Could not start cleaner.");
      }

      popup.renderStatus(response?.status, tab);
    } catch (error) {
      const activeTab = await popup.getActiveTab();

      if (popup.isMissingReceiverError(error)) {
        const message = popup.getDisconnectedPageMessage(activeTab);
        popup.renderDisconnectedPage(message, activeTab);
        popup.renderSettingsState(message, true);
        return;
      }

      popup.renderError(error.message, activeTab);
      popup.renderSettingsState(`Could not start cleaner: ${error.message}`, true);
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

  popup.elements.settingsForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      await popup.saveSettingsFromForm("Settings saved locally in Chrome.");
    } catch (error) {
      popup.renderSettingsState(`Could not save settings: ${error.message}`, true);
      console.error(error);
    }
  });

  popup.elements.resetSettingsButton.addEventListener("click", async () => {
    try {
      const settings = await resetSettings();
      popup.applySettingsToForm(settings);
      popup.renderSettingsState("Default settings restored.");
    } catch (error) {
      popup.renderSettingsState(`Could not reset settings: ${error.message}`, true);
      console.error(error);
    }
  });

  [
    popup.elements.betweenItemsSecondsInput,
    popup.elements.scrollPauseSecondsInput,
    popup.elements.retryLimitInput,
    popup.elements.retryBackoffSecondsInput,
    popup.elements.failureStreakLimitInput,
  ].forEach((element) => {
    element.addEventListener("input", () => {
      popup.renderSettingsPreview(popup.getSettingsPreviewText(popup.getSettingsFromForm()));
      popup.renderSettingsState("Unsaved changes. Save them or click Start to use them.");
    });
  });

  getSettings()
    .then((settings) => {
      popup.applySettingsToForm(settings);
      popup.renderSettingsState("Settings loaded from Chrome storage.");
    })
    .catch((error) => {
      popup.renderSettingsState(`Could not load settings: ${error.message}`, true);
      console.error(error);
    });

  popup.refreshStatus();
  setInterval(popup.refreshStatus, 1000);
})();
