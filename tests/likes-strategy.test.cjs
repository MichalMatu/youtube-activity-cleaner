const test = require("node:test");
const assert = require("node:assert/strict");

const { createContext, loadScript } = require("./helpers/load-script.cjs");

test("likes strategy opens the action menu and removes the liked video", async () => {
  const itemContainer = {
    isConnected: true,
  };
  const actionButton = {
    id: "action-button",
    isConnected: true,
  };
  const removeMenuItem = {
    id: "remove-menu-item",
    innerText: "Remove from Liked videos",
    textContent: "Remove from Liked videos",
    getAttribute() {
      return "";
    },
    isConnected: true,
  };
  let removalCommitted = false;
  let lastMessage = "";
  let lastError = "";

  const content = {
    getTarget: () => ({ id: "likes" }),
    getState: () => ({
      stopRequested: false,
      retryAttempt: 0,
      retryDelayMs: 0,
      lastItem: "",
    }),
    getVisibleActionButtons: () => [actionButton],
    findRetryActionButton: () => actionButton,
    getItemContainer: () => itemContainer,
    describeItem: () => (removalCommitted ? "next video" : "test video"),
    setCleanerMessage(message) {
      lastMessage = message;
    },
    setCleanerError(message) {
      lastError = message || "";
    },
    clickElement: async (element) => {
      if (element === removeMenuItem) {
        removalCommitted = true;
      }

      return true;
    },
    waitFor: async (fn) => fn(),
    getVisibleMenuItems: () => [removeMenuItem],
    normalizeText: (value) =>
      (value || "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase(),
    isItemGone: () => false,
    pauseUntilVisible: async () => true,
    sleep: async () => {},
    getSettingValue: (key) =>
      ({
        pollMs: 1,
        waitForPostClickStateMs: 10,
        waitForRemovalMs: 10,
      })[key],
  };

  const context = createContext({
    document: {
      visibilityState: "visible",
    },
    YtActivityCleanerShared: {
      t(_key, substitutions, fallback = "") {
        if (Array.isArray(substitutions)) {
          return fallback.replace(/\$(\d+)/g, (_match, index) => {
            const value = substitutions[Number(index) - 1];
            return value === undefined ? "" : String(value);
          });
        }

        if (substitutions !== undefined) {
          return fallback.replace("$1", String(substitutions));
        }

        return fallback;
      },
    },
    YtActivityCleanerContent: content,
  });

  loadScript("extension/shared/text.js", context);
  loadScript("extension/content/cleaner/strategy.js", context);

  const result = await context.YtActivityCleanerContent
    .getTargetStrategy()
    .runSingleAttempt(actionButton, "test video");

  assert.equal(result.success, true);
  assert.equal(result.description, "test video");
  assert.equal(lastError, "");
  assert.equal(lastMessage, "Removed like: test video");
});
