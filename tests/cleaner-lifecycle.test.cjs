const test = require("node:test");
const assert = require("node:assert/strict");

const { createContext, loadScript } = require("./helpers/load-script.cjs");

function translate(_key, substitutions, fallback = "") {
  const values =
    substitutions === undefined
      ? []
      : Array.isArray(substitutions)
        ? substitutions
        : [substitutions];

  return fallback.replace(/\$(\d+)/g, (_match, index) => {
    const value = values[Number(index) - 1];
    return value === undefined ? "" : String(value);
  });
}

test("startCleaner resets run state, loads settings, and starts the run in the background", async () => {
  const state = {
    targetId: "",
    starting: false,
    running: false,
    stopRequested: false,
    paused: false,
    attempted: 7,
    deleted: 5,
    failed: 2,
    lastMessage: "old message",
    lastItem: "old item",
    lastError: "old error",
    retryAttempt: 3,
    retryDelayMs: 1800,
    settings: {},
  };
  let runCleanerCalls = 0;
  let clearDebugEventsCalls = 0;

  const context = createContext({
    YtActivityCleanerShared: {
      Settings: {
        profiles: {
          fast: { label: "Fast" },
        },
      },
      getSettings: async () => ({
        speedProfile: "fast",
        betweenItemsMs: 1200,
        retryLimit: 2,
      }),
      t: translate,
    },
    YtActivityCleanerContent: {
      getState: () => state,
      getPageTarget: () => ({ id: "comments" }),
      isRunnablePage: () => true,
      getTargetLabel: () => "YouTube comments",
      setCleanerTarget(targetId) {
        state.targetId = targetId;
        return targetId;
      },
      clearDebugEvents() {
        clearDebugEventsCalls += 1;
      },
      setCleanerMessage(message) {
        state.lastMessage = message;
      },
      setCleanerError(message) {
        state.lastError = message || "";
      },
      setCleanerSettings(settings) {
        state.settings = settings;
        return settings;
      },
      getCleanerStatus() {
        return {
          targetId: state.targetId,
          starting: state.starting,
          running: state.running,
          stopRequested: state.stopRequested,
          paused: state.paused,
          attempted: state.attempted,
          deleted: state.deleted,
          failed: state.failed,
          lastMessage: state.lastMessage,
          lastError: state.lastError,
          retryAttempt: state.retryAttempt,
          retryDelayMs: state.retryDelayMs,
        };
      },
      pushDebugEvent() {},
      formatDurationMs: (ms) => `${ms / 1000}s`,
      runCleaner: async () => {
        runCleanerCalls += 1;
        return new Promise(() => {});
      },
    },
  });

  loadScript("extension/content/cleaner/lifecycle.js", context);

  const status = await context.YtActivityCleanerContent.startCleaner();

  assert.equal(runCleanerCalls, 1);
  assert.equal(clearDebugEventsCalls, 1);
  assert.equal(state.targetId, "comments");
  assert.equal(state.starting, false);
  assert.equal(state.running, true);
  assert.equal(state.attempted, 0);
  assert.equal(state.deleted, 0);
  assert.equal(state.failed, 0);
  assert.equal(state.lastItem, "");
  assert.equal(state.lastError, "");
  assert.equal(state.retryAttempt, 0);
  assert.equal(state.retryDelayMs, 0);
  assert.equal(
    state.lastMessage,
    "Starting Fast cleaner with 2 retries and 1.2s pacing..."
  );
  assert.deepEqual(state.settings, {
    speedProfile: "fast",
    betweenItemsMs: 1200,
    retryLimit: 2,
  });
  assert.deepEqual(status, {
    targetId: "comments",
    starting: false,
    running: true,
    stopRequested: false,
    paused: false,
    attempted: 0,
    deleted: 0,
    failed: 0,
    lastMessage: "Starting Fast cleaner with 2 retries and 1.2s pacing...",
    lastError: "",
    retryAttempt: 0,
    retryDelayMs: 0,
  });
});

test("stopCleaner uses the pre-start message while the cleaner is still starting", () => {
  const state = {
    starting: true,
    stopRequested: false,
    lastMessage: "",
  };

  const context = createContext({
    YtActivityCleanerShared: {
      t: translate,
    },
    YtActivityCleanerContent: {
      getState: () => state,
      setCleanerMessage(message) {
        state.lastMessage = message;
      },
      getCleanerStatus() {
        return {
          starting: state.starting,
          stopRequested: state.stopRequested,
          lastMessage: state.lastMessage,
        };
      },
    },
  });

  loadScript("extension/content/cleaner/lifecycle.js", context);

  const status = context.YtActivityCleanerContent.stopCleaner();

  assert.equal(state.stopRequested, true);
  assert.equal(state.lastMessage, "Stopping before the cleaner starts...");
  assert.deepEqual(status, {
    starting: true,
    stopRequested: true,
    lastMessage: "Stopping before the cleaner starts...",
  });
});
