const test = require("node:test");
const assert = require("node:assert/strict");

const { createContext, loadScript } = require("./helpers/load-script.cjs");

function createStatusContext(overrides = {}) {
  const content = {
    selectors: {
      status: [".status"],
    },
    getVisibleMatches: () => [],
    normalizeText: (value) =>
      (value || "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase(),
    getState: () => ({ stopRequested: false }),
    pauseUntilVisible: async () => true,
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    getSettingValue: (key) =>
      ({
        waitForBusyStateMs: 5,
        busyQuietMs: 0,
        pollMs: 1,
        waitForRemovalMs: 6,
        allowRemovalWithoutSuccess: true,
      })[key],
    isItemGone: () => false,
    hasMeaningfulDescriptionChange: () => false,
    ...overrides,
  };

  const context = createContext({
    document: {
      visibilityState: "visible",
    },
    YtActivityCleanerContent: content,
  });

  loadScript("extension/content/cleaner/status.js", context);
  return context;
}

test("getStatusMessages keeps only cleaner-related visible status messages", () => {
  const context = createStatusContext({
    getVisibleMatches: () => [
      { innerText: "Deleting now" },
      { innerText: "Item deleted" },
      { innerText: "Something went wrong" },
      { innerText: "Keyboard shortcuts available" },
      { innerText: "Item deleted" },
    ],
  });

  const messages = context.YtActivityCleanerContent.getStatusMessages();

  assert.deepEqual(messages, ["deleting now", "item deleted", "something went wrong"]);
});

test("waitForStatusIdle ignores lingering success messages and returns quickly", async () => {
  const context = createStatusContext({
    getVisibleMatches: () => [{ innerText: "Item deleted" }],
  });

  const result = await context.YtActivityCleanerContent.waitForStatusIdle();

  assert.equal(result, true);
});

test("fast mode accepts removal without a success toast after a confirmed delete", async () => {
  const context = createStatusContext({
    isItemGone: () => true,
  });

  const result = await context.YtActivityCleanerContent.waitForDeleteOutcome(
    { id: "comment-card" },
    { firstStateType: "confirm" }
  );

  assert.equal(result.success, true);
  assert.equal(result.reason, "item disappeared or changed after the delete request");
});

test("safe mode still requires final success confirmation", async () => {
  const context = createStatusContext({
    getSettingValue: (key) =>
      ({
        waitForBusyStateMs: 5,
        busyQuietMs: 0,
        pollMs: 1,
        waitForRemovalMs: 6,
        allowRemovalWithoutSuccess: false,
      })[key],
    isItemGone: () => true,
  });

  const result = await context.YtActivityCleanerContent.waitForDeleteOutcome(
    { id: "comment-card" },
    { firstStateType: "confirm" }
  );

  assert.equal(result.success, false);
  assert.equal(result.reason, "item disappeared or changed without a final success message");
});

test("fast mode accepts a recycled activity row as a successful delete", async () => {
  const context = createStatusContext({
    hasMeaningfulDescriptionChange: () => true,
  });

  const result = await context.YtActivityCleanerContent.waitForDeleteOutcome(
    { id: "comment-card" },
    { firstStateType: "removed_without_confirm", expectedDescription: "old item" }
  );

  assert.equal(result.success, true);
  assert.equal(result.reason, "item disappeared or changed after the delete request");
});

test("fast mode accepts delayed removal even without an initial UI signal", async () => {
  const context = createStatusContext({
    isItemGone: () => true,
  });

  const result = await context.YtActivityCleanerContent.waitForDeleteOutcome(
    { id: "comment-card" },
    { firstStateType: "unknown_after_click", expectedDescription: "old item" }
  );

  assert.equal(result.success, true);
  assert.equal(result.reason, "item disappeared or changed after the delete request");
});

test("fast mode accepts the original delete button disappearing from the DOM", async () => {
  const actionButton = { isConnected: false };
  const context = createStatusContext();

  const result = await context.YtActivityCleanerContent.waitForDeleteOutcome(
    { id: "comment-card" },
    {
      firstStateType: "unknown_after_click",
      expectedDescription: "old item",
      actionButton,
    }
  );

  assert.equal(result.success, true);
  assert.equal(result.reason, "item disappeared or changed after the delete request");
});
