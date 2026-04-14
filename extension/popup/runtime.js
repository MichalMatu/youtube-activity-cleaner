(() => {
  const shared = globalThis.YtActivityCleanerShared;
  const popup = (globalThis.YtActivityCleanerPopup =
    globalThis.YtActivityCleanerPopup || {});
  const { ext, Messages } = shared;
  const t = shared.t || ((_key, _substitutions, fallback = "") => fallback);
  const emptySession = Object.freeze({ tabId: null, hasCleanerTab: false });
  const emptyContext = Object.freeze({
    activeTab: null,
    targetTab: null,
    isTrackedTab: false,
    isUsingActiveTab: false,
    canStartFromActiveTab: false,
  });

  let refreshPromise = null;
  let refreshQueued = false;

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

    return response?.session || emptySession;
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

    return response?.session || emptySession;
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

    return response?.session || emptySession;
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
    const isUsingActiveTab = Boolean(
      targetTab?.id && activeTab?.id && targetTab.id === activeTab.id
    );

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

  const performStatusRefresh = async () => {
    const context = await popup.resolveTargetContext();
    if (!context.activeTab) {
      popup.renderError(t("popupNoActiveTabFound", undefined, "No active tab found."), {
        ...emptyContext,
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

  popup.refreshStatus = async () => {
    if (refreshPromise) {
      refreshQueued = true;
      return refreshPromise;
    }

    refreshPromise = (async () => {
      try {
        await performStatusRefresh();
      } finally {
        refreshPromise = null;

        if (refreshQueued) {
          refreshQueued = false;
          void popup.refreshStatus();
        }
      }
    })();

    return refreshPromise;
  };

  popup.startStatusPolling = (intervalMs = 1000) => {
    void popup.refreshStatus();
    return globalThis.setInterval?.(() => {
      void popup.refreshStatus();
    }, intervalMs);
  };
})();
