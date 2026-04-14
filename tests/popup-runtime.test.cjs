const test = require("node:test");
const assert = require("node:assert/strict");

const { createContext, loadScript } = require("./helpers/load-script.cjs");

const supportedUrl =
  "https://myactivity.google.com/page?hl=en-GB&utm_medium=web&utm_source=youtube&page=youtube_comments";

function loadPopupRuntime(context) {
  loadScript("extension/shared/messages.js", context);
  loadScript("extension/shared/targets.js", context);
  loadScript("extension/popup/targets.js", context);
  loadScript("extension/popup/runtime.js", context);
}

test("popup runtime queues one follow-up refresh instead of overlapping polls", async () => {
  const renderedStatuses = [];
  let statusRequestCount = 0;
  let releaseFirstStatusRequest;

  const context = createContext({
    setInterval() {
      return 0;
    },
    document: {},
    YtActivityCleanerShared: {
      ext: {
        tabs: {
          async query() {
            return [{ id: 1, url: supportedUrl, status: "complete", title: "Comments" }];
          },
          async get(tabId) {
            return { id: tabId, url: supportedUrl, status: "complete", title: "Comments" };
          },
          async sendMessage(_tabId, message) {
            if (message.type !== "cleaner/get-status") {
              return {};
            }

            statusRequestCount += 1;
            if (statusRequestCount === 1) {
              return new Promise((resolve) => {
                releaseFirstStatusRequest = () =>
                  resolve({ status: { deleted: 1, attempted: 1, failed: 0 } });
              });
            }

            return { status: { deleted: 2, attempted: 2, failed: 0 } };
          },
        },
        runtime: {
          async sendMessage(message) {
            if (message.type === "cleaner/get-tab") {
              return { ok: true, session: { tabId: null, hasCleanerTab: false } };
            }

            if (message.type === "power/get-status") {
              return { ok: true, keepAwakeActive: false };
            }

            return { ok: true, session: { tabId: null, hasCleanerTab: false } };
          },
        },
      },
      t(_key, _substitutions, fallback = "") {
        return fallback;
      },
    },
    YtActivityCleanerPopup: {
      renderStatus(status) {
        renderedStatuses.push(status);
      },
      renderError(error) {
        throw new Error(`Unexpected renderError: ${error}`);
      },
      renderDisconnectedPage() {
        throw new Error("Unexpected renderDisconnectedPage call");
      },
    },
  });

  loadPopupRuntime(context);

  const popup = context.YtActivityCleanerPopup;
  const firstRefresh = popup.refreshStatus();
  const secondRefresh = popup.refreshStatus();

  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(statusRequestCount, 1);

  releaseFirstStatusRequest();
  await firstRefresh;
  await secondRefresh;
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(statusRequestCount, 2);
  assert.equal(renderedStatuses.length, 2);
  assert.equal(renderedStatuses[0].deleted, 1);
  assert.equal(renderedStatuses[1].deleted, 2);
});
