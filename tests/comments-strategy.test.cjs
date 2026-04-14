const test = require("node:test");
const assert = require("node:assert/strict");

const { createContext, loadScript } = require("./helpers/load-script.cjs");

function loadStrategyScripts(context) {
  loadScript("extension/shared/text.js", context);
  loadScript("extension/content/cleaner/candidates.js", context);
  loadScript("extension/content/cleaner/strategies/my-activity-delete.js", context);
  loadScript("extension/content/cleaner/strategies/playlist-remove.js", context);
  loadScript("extension/content/cleaner/strategy.js", context);
}

test("comments strategy exposes structured delete candidates", () => {
  const itemContainer = {
    isConnected: true,
  };
  const actionButton = {
    id: "delete-button",
    isConnected: true,
  };

  const content = {
    getTarget: () => ({ id: "comments" }),
    getVisibleDeleteButtons: () => [actionButton],
    getItemContainer: () => itemContainer,
    describeItem: () => "test comment",
    findRetryDeleteButton: () => actionButton,
    getLoadMoreButton: () => null,
  };

  const context = createContext({
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

  loadStrategyScripts(context);

  const strategy = context.YtActivityCleanerContent.getTargetStrategy();
  const candidate = strategy.collectActionCandidates()[0];

  assert.equal(candidate.element, actionButton);
  assert.equal(candidate.itemContainer, itemContainer);
  assert.equal(candidate.description, "test comment");
  assert.equal(candidate.kind, "delete");
});

test("comments strategy counts a recycled row as a successful delete", async () => {
  const itemContainer = {
    isConnected: true,
  };
  const actionButton = {
    id: "delete-button",
    isConnected: true,
  };
  let deletionCommitted = false;
  let lastMessage = "";
  let lastError = "";

  const content = {
    getTarget: () => ({ id: "comments" }),
    getState: () => ({
      stopRequested: false,
      retryAttempt: 0,
      retryDelayMs: 0,
      lastItem: "",
    }),
    getVisibleDeleteButtons: () => [actionButton],
    findRetryDeleteButton: () => actionButton,
    getLoadMoreButton: () => null,
    getItemContainer: () => itemContainer,
    describeItem: () => (deletionCommitted ? "next activity row" : "test comment"),
    hasMeaningfulDescriptionChange: (_element, expectedDescription) =>
      deletionCommitted && expectedDescription === "test comment",
    setCleanerMessage(message) {
      lastMessage = message;
    },
    setCleanerError(message) {
      lastError = message || "";
    },
    dismissKnownBlockingDialog: async () => false,
    waitForStatusIdle: async () => true,
    clickElement: async (element) => {
      if (element === actionButton) {
        deletionCommitted = true;
      }

      return true;
    },
    waitFor: async (fn) => fn(),
    getConfirmButton: () => null,
    getStatusMessages: () => [],
    matchesFailureStatus: () => false,
    matchesPendingStatus: () => false,
    matchesSuccessStatus: () => false,
    isItemGone: () => false,
    waitForDeleteOutcome: async (_itemContainer, options = {}) => ({
      success: options.expectedDescription === "test comment",
      reason: "item disappeared or changed after the delete request",
    }),
    pauseAwareSleep: async () => true,
    getSettingValue: (key) =>
      ({
        waitForPostClickStateMs: 10,
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

  loadStrategyScripts(context);

  const result = await context.YtActivityCleanerContent
    .getTargetStrategy()
    .runSingleAttempt(actionButton, "test comment");

  assert.equal(result.success, true);
  assert.equal(result.description, "test comment");
  assert.equal(lastError, "");
  assert.equal(lastMessage, "Confirmed deletion: test comment");
});

test("comments strategy accepts a delayed success when no initial status appears", async () => {
  const itemContainer = {
    isConnected: true,
  };
  const actionButton = {
    id: "delete-button",
    isConnected: true,
  };
  let lastMessage = "";
  let lastError = "";

  const content = {
    getTarget: () => ({ id: "comments" }),
    getState: () => ({
      stopRequested: false,
      retryAttempt: 0,
      retryDelayMs: 0,
      lastItem: "",
    }),
    getVisibleDeleteButtons: () => [actionButton],
    findRetryDeleteButton: () => actionButton,
    getLoadMoreButton: () => null,
    getItemContainer: () => itemContainer,
    describeItem: () => "test comment",
    hasMeaningfulDescriptionChange: () => false,
    setCleanerMessage(message) {
      lastMessage = message;
    },
    setCleanerError(message) {
      lastError = message || "";
    },
    dismissKnownBlockingDialog: async () => false,
    waitForStatusIdle: async () => true,
    clickElement: async () => true,
    waitFor: async () => null,
    getKnownBlockingDialog: () => null,
    getConfirmButton: () => null,
    getStatusMessages: () => [],
    matchesFailureStatus: () => false,
    matchesPendingStatus: () => false,
    matchesSuccessStatus: () => false,
    isItemGone: () => false,
    waitForDeleteOutcome: async (_itemContainer, options = {}) => ({
      success: options.firstStateType === "unknown_after_click",
      reason: "item disappeared or changed after the delete request",
    }),
    pauseAwareSleep: async () => true,
    getSettingValue: (key) =>
      ({
        waitForPostClickStateMs: 10,
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

  loadStrategyScripts(context);

  const result = await context.YtActivityCleanerContent
    .getTargetStrategy()
    .runSingleAttempt(actionButton, "test comment");

  assert.equal(result.success, true);
  assert.equal(result.description, "test comment");
  assert.equal(lastError, "");
  assert.equal(lastMessage, "Confirmed deletion: test comment");
});
