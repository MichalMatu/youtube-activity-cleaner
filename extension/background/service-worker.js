importScripts(
  "../shared/browser-api.js",
  "../shared/messages.js",
  "../shared/targets.js",
  "../shared/constants.js",
  "./power.js",
  "./session.js"
);

(() => {
  const { ext } = globalThis.YtActivityCleanerShared;
  const background = globalThis.YtActivityCleanerBackground;

  ext.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (background.handlePowerMessage(message, sender, sendResponse)) {
      return true;
    }

    if (background.handleCleanerSessionMessage(message, sender, sendResponse)) {
      return true;
    }

    return false;
  });
})();
