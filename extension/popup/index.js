(() => {
  const shared = globalThis.YtActivityCleanerShared;
  const popup = (globalThis.YtActivityCleanerPopup =
    globalThis.YtActivityCleanerPopup || {});
  const { ext, Messages } = shared;
  const t = shared.t || ((_key, _substitutions, fallback = "") => fallback);
  const translateWithFallback =
    shared.translateWithFallback ||
    ((key, substitutions, fallbackTemplate) =>
      t(key, substitutions, "") || shared.formatTemplate?.(fallbackTemplate, substitutions));

  shared.localizeDocument?.();

  popup.getAppVersion = () => ext?.runtime?.getManifest?.()?.version || "dev";

  popup.getAppMetaText = () =>
    translateWithFallback(
      "popupVersionValue",
      popup.getAppVersion(),
      `Version ${popup.getAppVersion()}`
    );

  popup.renderAppMeta = () => {
    if (popup.elements?.appMetaElement) {
      popup.elements.appMetaElement.textContent = popup.getAppMetaText();
    }
  };

  popup.renderAppMeta();

  popup.setSettingsPanelOpen = (isOpen) => {
    const { settingsPanel, settingsToggleButton } = popup.elements || {};
    if (!settingsPanel || !settingsToggleButton) {
      return;
    }

    settingsPanel.hidden = !isOpen;
    settingsPanel.setAttribute("aria-hidden", String(!isOpen));
    settingsToggleButton.setAttribute("aria-expanded", String(isOpen));
  };

  popup.setSettingsPanelOpen(false);
  popup.renderQuickLinks?.();
  popup.bindSettingsForm?.();

  popup.getActiveTab = async () => {
    const [tab] = await ext.tabs.query({ active: true, currentWindow: true });
    return tab || null;
  };

  popup.isMissingReceiverError = (error) =>
    /Could not establish connection|Receiving end does not exist/i.test(
      error?.message || ""
    );

  popup.getDisconnectedPageMessage = (tab, isTrackedTab = false) => {
    if (tab?.status === "loading") {
      return t(
        "popupPageStillLoading",
        undefined,
        "The page is still loading. Wait a moment and try again."
      );
    }

    return isTrackedTab
      ? t(
          "popupReloadCleanerTabReconnect",
          undefined,
          "Reload the cleaner tab once so the extension can reconnect to it."
        )
      : t(
          "popupReloadCommentsPageConnect",
          undefined,
          "Reload the page once so the extension can connect to it."
        );
  };

  popup.sendMessageToTab = async (tab, message) => {
    if (!tab?.id) {
      throw new Error(t("popupNoTargetTabFound", undefined, "No target tab found."));
    }

    return {
      tab,
      response: await ext.tabs.sendMessage(tab.id, message),
    };
  };

  popup.getCleanerSession = async () => {
    const response = await ext.runtime.sendMessage({ type: Messages.GET_CLEANER_TAB });
    if (response?.ok === false) {
      throw new Error(
        response.error ||
          t(
            "popupCouldNotReadCleanerTabSession",
            undefined,
            "Could not read the cleaner tab session."
          )
      );
    }

    return response?.session || { tabId: null, hasCleanerTab: false };
  };

  popup.setCleanerTab = async (tabId) => {
    const response = await ext.runtime.sendMessage({
      type: Messages.SET_CLEANER_TAB,
      tabId,
    });
    if (response?.ok === false) {
      throw new Error(
        response.error ||
          t(
            "popupCouldNotRememberCleanerTab",
            undefined,
            "Could not remember the cleaner tab."
          )
      );
    }

    return response?.session || { tabId: null, hasCleanerTab: false };
  };

  popup.clearCleanerTab = async () => {
    const response = await ext.runtime.sendMessage({ type: Messages.CLEAR_CLEANER_TAB });
    if (response?.ok === false) {
      throw new Error(
        response.error ||
          t(
            "popupCouldNotClearCleanerTab",
            undefined,
            "Could not clear the cleaner tab."
          )
      );
    }

    return response?.session || { tabId: null, hasCleanerTab: false };
  };

  popup.getTabById = async (tabId) => {
    if (!Number.isInteger(tabId)) {
      return null;
    }

    try {
      return await ext.tabs.get(tabId);
    } catch (_error) {
      return null;
    }
  };

  popup.resolveTargetContext = async () => {
    const [activeTab, cleanerSession] = await Promise.all([
      popup.getActiveTab(),
      popup.getCleanerSession(),
    ]);
    const activeTabTarget = popup.getTargetByUrl(activeTab?.url);
    let trackedTab = await popup.getTabById(cleanerSession.tabId);

    if (trackedTab && !popup.isRunnableUrl(trackedTab.url)) {
      trackedTab = null;
    }

    if (cleanerSession.hasCleanerTab && !trackedTab) {
      await popup.clearCleanerTab();
    }

    const activeTabSupported = Boolean(activeTabTarget);
    const activeTabRunnable = popup.isRunnableUrl(activeTab?.url);
    const targetTab = trackedTab || (activeTabRunnable ? activeTab : null);
    const isTrackedTab = Boolean(trackedTab);
    const isUsingActiveTab = Boolean(targetTab?.id && activeTab?.id && targetTab.id === activeTab.id);

    return {
      activeTab,
      activeTabSupported,
      activeTabRunnable,
      activeTabTarget,
      targetTab,
      isTrackedTab,
      isUsingActiveTab,
      canStartFromActiveTab: activeTabRunnable,
    };
  };

  popup.refreshStatus = async () => {
    const context = await popup.resolveTargetContext();
    if (!context.activeTab) {
      popup.renderError(t("popupNoActiveTabFound", undefined, "No active tab found."), {
        activeTab: null,
        targetTab: null,
        isTrackedTab: false,
        isUsingActiveTab: false,
        canStartFromActiveTab: false,
      });
      return;
    }

    if (!context.targetTab) {
      popup.renderStatus(null, context);
      return;
    }

    try {
      const [{ response }, keepAwake] = await Promise.all([
        popup.sendMessageToTab(context.targetTab, {
          type: Messages.GET_CLEANER_STATUS,
        }),
        ext.runtime.sendMessage({ type: Messages.GET_KEEP_AWAKE_STATUS }),
      ]);

      popup.renderStatus(
        {
          ...response?.status,
          keepAwakeActive: keepAwake?.keepAwakeActive,
        },
        context
      );
    } catch (error) {
      if (popup.isMissingReceiverError(error)) {
        popup.renderDisconnectedPage(
          popup.getDisconnectedPageMessage(context.targetTab, context.isTrackedTab),
          context
        );
        return;
      }

      popup.renderError(
        t(
          "popupReloadCommentsPageTryAgain",
          undefined,
          "Reload the page and try again."
        ),
        context
      );
      console.error(error);
    }
  };

  popup.elements.startButton.addEventListener("click", async () => {
    try {
      const context = await popup.resolveTargetContext();
      if (context.activeTabSupported && !context.activeTabRunnable) {
        throw new Error(
          t(
            "popupTargetNotEnabledYet",
            popup.getTargetLabel(context.activeTabTarget),
            `${popup.getTargetLabel(context.activeTabTarget)} cleanup is not enabled yet.`
          )
        );
      }

      if (!context.activeTabRunnable || !context.activeTab?.id) {
        throw new Error(
          t(
            "popupOpenCommentsPageInCurrentTabFirst",
            undefined,
            "Open a supported cleaner page in the current tab first."
          )
        );
      }

      await popup.saveSettingsFromForm(
        t(
          "popupSettingsSavedStarting",
          undefined,
          "Settings saved. Starting cleaner with the saved values."
        )
      );
      await popup.setCleanerTab(context.activeTab.id);
      const { tab, response } = await popup.sendMessageToTab(context.activeTab, {
        type: Messages.START_CLEANER,
      });
      if (response?.ok === false) {
        throw new Error(
          response.error ||
            t("popupCouldNotStartCleaner", undefined, "Could not start cleaner.")
        );
      }

      popup.renderStatus(response?.status, {
        ...context,
        targetTab: tab,
        isTrackedTab: true,
        isUsingActiveTab: true,
      });
    } catch (error) {
      const context = await popup.resolveTargetContext();

      if (popup.isMissingReceiverError(error)) {
        const message = popup.getDisconnectedPageMessage(
          context.activeTab,
          Boolean(context.isTrackedTab && context.isUsingActiveTab)
        );
        popup.renderDisconnectedPage(message, context);
        popup.renderSettingsState(message, true);
        return;
      }

      popup.renderError(error.message, context);
      popup.renderSettingsState(
        t(
          "popupCouldNotStartCleanerPrefix",
          error.message,
          `Could not start cleaner: ${error.message}`
        ),
        true
      );
      console.error(error);
    }
  });

  popup.elements.stopButton.addEventListener("click", async () => {
    try {
      const context = await popup.resolveTargetContext();
      if (!context.targetTab) {
        throw new Error(
          t(
            "popupNoCleanerTabConnected",
            undefined,
            "No cleaner tab is connected right now."
          )
        );
      }

      const { tab, response } = await popup.sendMessageToTab(context.targetTab, {
        type: Messages.STOP_CLEANER,
      });
      popup.renderStatus(response?.status, {
        ...context,
        targetTab: tab,
      });
    } catch (error) {
      popup.renderError(error.message, await popup.resolveTargetContext());
      console.error(error);
    }
  });

  popup.elements.supportButton.addEventListener("click", async () => {
    await ext.tabs.create({ url: shared.Constants.SUPPORT_URL });
  });

  popup.elements.donateButton.addEventListener("click", async () => {
    await ext.tabs.create({ url: shared.Constants.DONATE_URL });
  });

  popup.elements.settingsToggleButton.addEventListener("click", () => {
    popup.setSettingsPanelOpen(popup.elements.settingsPanel.hidden);
  });

  popup.elements.settingsCloseButton.addEventListener("click", () => {
    popup.setSettingsPanelOpen(false);
  });

  popup.elements.settingsPanel.addEventListener("click", (event) => {
    if (event.target === popup.elements.settingsPanel) {
      popup.setSettingsPanelOpen(false);
    }
  });

  globalThis.document?.addEventListener?.("keydown", (event) => {
    if (event.key === "Escape" && popup.elements?.settingsPanel && !popup.elements.settingsPanel.hidden) {
      popup.setSettingsPanelOpen(false);
    }
  });

  popup.loadSavedSettings?.()
    .then(() => undefined)
    .catch((error) => {
      popup.renderSettingsState(
        t(
          "popupCouldNotLoadSettings",
          error.message,
          `Could not load settings: ${error.message}`
        ),
        true
      );
      console.error(error);
    });

  popup.refreshStatus();
  setInterval(popup.refreshStatus, 1000);
})();
