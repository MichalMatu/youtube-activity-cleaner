(() => {
  const shared = globalThis.YtActivityCleanerShared;
  const background = (globalThis.YtActivityCleanerBackground =
    globalThis.YtActivityCleanerBackground || {});
  const { ext, Messages } = shared;

  let keepAwakeActive = false;

  const getKeepAwakeStatus = () => ({ keepAwakeActive });

  background.handlePowerMessage = (message, sendResponse) => {
    if (!message?.type) {
      return false;
    }

    if (message.type === Messages.REQUEST_KEEP_AWAKE) {
      ext.power.requestKeepAwake("display");
      keepAwakeActive = true;
      sendResponse({ ok: true, ...getKeepAwakeStatus() });
      return true;
    }

    if (message.type === Messages.RELEASE_KEEP_AWAKE) {
      ext.power.releaseKeepAwake();
      keepAwakeActive = false;
      sendResponse({ ok: true, ...getKeepAwakeStatus() });
      return true;
    }

    if (message.type === Messages.GET_KEEP_AWAKE_STATUS) {
      sendResponse({ ok: true, ...getKeepAwakeStatus() });
      return true;
    }

    return false;
  };
})();
