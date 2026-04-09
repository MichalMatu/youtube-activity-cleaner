(() => {
  const shared = globalThis.YtActivityCleanerShared;
  const background = (globalThis.YtActivityCleanerBackground =
    globalThis.YtActivityCleanerBackground || {});
  const { ext, Messages, isSupportedUrl } = shared;

  const CLEANER_SESSION_KEY = "cleanerSession";
  const sessionStorage = ext.storage.session ?? ext.storage.local;

  const normalizeTabId = (value) => {
    const numericValue = Number(value);

    return Number.isInteger(numericValue) && numericValue >= 0 ? numericValue : null;
  };

  const getCleanerSession = async () => {
    const stored = await sessionStorage.get(CLEANER_SESSION_KEY);
    const tabId = normalizeTabId(stored?.[CLEANER_SESSION_KEY]?.tabId);

    return {
      tabId,
      hasCleanerTab: tabId !== null,
    };
  };

  const saveCleanerSession = async (tabId) => {
    const normalizedTabId = normalizeTabId(tabId);

    if (normalizedTabId === null) {
      await sessionStorage.remove(CLEANER_SESSION_KEY);
      return {
        tabId: null,
        hasCleanerTab: false,
      };
    }

    const session = {
      tabId: normalizedTabId,
      hasCleanerTab: true,
    };

    await sessionStorage.set({
      [CLEANER_SESSION_KEY]: { tabId: normalizedTabId },
    });

    return session;
  };

  const clearCleanerSession = async () => saveCleanerSession(null);

  const clearCleanerSessionIfMatches = async (tabId) => {
    const session = await getCleanerSession();
    if (session.tabId === tabId) {
      await clearCleanerSession();
    }
  };

  background.handleCleanerSessionMessage = (message, _sender, sendResponse) => {
    if (!message?.type) {
      return false;
    }

    if (message.type === Messages.GET_CLEANER_TAB) {
      getCleanerSession()
        .then((session) => {
          sendResponse({ ok: true, session });
        })
        .catch((error) => {
          sendResponse({ ok: false, error: error.message });
        });
      return true;
    }

    if (message.type === Messages.SET_CLEANER_TAB) {
      saveCleanerSession(message.tabId)
        .then((session) => {
          sendResponse({ ok: true, session });
        })
        .catch((error) => {
          sendResponse({ ok: false, error: error.message });
        });
      return true;
    }

    if (message.type === Messages.CLEAR_CLEANER_TAB) {
      clearCleanerSession()
        .then((session) => {
          sendResponse({ ok: true, session });
        })
        .catch((error) => {
          sendResponse({ ok: false, error: error.message });
        });
      return true;
    }

    return false;
  };

  ext.tabs.onRemoved.addListener((tabId) => {
    void clearCleanerSessionIfMatches(tabId);
  });

  ext.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (!changeInfo.url && !changeInfo.status) {
      return;
    }

    void (async () => {
      const session = await getCleanerSession();
      if (session.tabId !== tabId) {
        return;
      }

      const url = changeInfo.url ?? tab?.url;
      if (typeof url === "string" && !isSupportedUrl(url)) {
        await clearCleanerSession();
      }
    })();
  });
})();
