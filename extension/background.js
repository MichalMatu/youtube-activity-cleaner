let keepAwakeActive = false;

const getKeepAwakeStatus = () => ({ keepAwakeActive });

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message?.type) {
    return;
  }

  if (message.type === "requestKeepAwake") {
    chrome.power.requestKeepAwake("display");
    keepAwakeActive = true;
    sendResponse({ ok: true, ...getKeepAwakeStatus() });
    return;
  }

  if (message.type === "releaseKeepAwake") {
    chrome.power.releaseKeepAwake();
    keepAwakeActive = false;
    sendResponse({ ok: true, ...getKeepAwakeStatus() });
    return;
  }

  if (message.type === "getKeepAwakeStatus") {
    sendResponse({ ok: true, ...getKeepAwakeStatus() });
  }
});
