const test = require("node:test");
const assert = require("node:assert/strict");

const { createContext, loadScript } = require("./helpers/load-script.cjs");

test("popup status exposes only the compact UI payload", () => {
  const context = createContext({
    document: {
      visibilityState: "visible",
    },
    YtActivityCleanerShared: {
      DEFAULT_TARGET_ID: "comments",
      Settings: {
        defaults: {
          speedProfile: "fast",
          betweenItemsMs: 1200,
          scrollPauseMs: 1200,
          retryLimit: 2,
          retryBackoffMs: 1200,
          failureStreakLimit: 4,
        },
      },
      sanitizeSettings(settings) {
        return settings;
      },
      t(_key, _substitutions, fallback = "") {
        return fallback;
      },
    },
  });

  loadScript("extension/content/cleaner/state.js", context);

  const content = context.YtActivityCleanerContent;
  const state = content.getState();
  state.starting = false;
  state.running = true;
  state.paused = false;
  state.attempted = 7;
  state.deleted = 5;
  state.failed = 2;
  state.lastMessage = "Cleaner is running on the current page.";
  state.lastError = "temporary issue";
  state.retryAttempt = 2;
  state.retryDelayMs = 1500;
  state.settings = { speedProfile: "safe" };
  state.lastItem = "debug item";
  state.debugEvents = [{ type: "debug" }];
  state.lastDebugEvent = "debug";

  assert.equal(
    JSON.stringify(content.getPopupStatus()),
    JSON.stringify({
      starting: false,
      running: true,
      paused: false,
      attempted: 7,
      deleted: 5,
      failed: 2,
      lastMessage: "Cleaner is running on the current page.",
      lastError: "temporary issue",
      retryAttempt: 2,
      retryDelayMs: 1500,
    })
  );
});
