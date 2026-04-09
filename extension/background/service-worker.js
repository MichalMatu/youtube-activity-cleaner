importScripts("../shared/browser-api.js", "../shared/messages.js", "./power.js");

(() => {
  const { ext } = globalThis.YtActivityCleanerShared;
  const background = globalThis.YtActivityCleanerBackground;

  ext.runtime.onMessage.addListener((message, _sender, sendResponse) =>
    background.handlePowerMessage(message, sendResponse)
  );
})();
