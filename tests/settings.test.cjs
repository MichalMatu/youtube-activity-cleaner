const test = require("node:test");
const assert = require("node:assert/strict");

const { createContext, loadScript } = require("./helpers/load-script.cjs");

const plain = (value) => JSON.parse(JSON.stringify(value));

test("sanitizeSettings defaults to fast mode and modern defaults", () => {
  const storageState = {};
  const context = createContext({
    YtActivityCleanerShared: {
      ext: {
        storage: {
          local: {
            async get(key) {
              return { [key]: storageState[key] };
            },
            async set(payload) {
              Object.assign(storageState, payload);
            },
          },
        },
      },
    },
  });

  loadScript("extension/shared/settings.js", context);

  const settings = context.YtActivityCleanerShared.sanitizeSettings({});

  assert.deepEqual(plain(settings), {
    speedProfile: "fast",
    betweenItemsMs: 1200,
    scrollPauseMs: 1200,
    retryLimit: 2,
    retryBackoffMs: 1200,
    failureStreakLimit: 4,
  });
});

test("sanitizeSettings migrates legacy defaults into faster defaults", () => {
  const context = createContext({
    YtActivityCleanerShared: {
      ext: {
        storage: {
          local: {
            async get() {
              return {};
            },
            async set() {},
          },
        },
      },
    },
  });

  loadScript("extension/shared/settings.js", context);

  const settings = context.YtActivityCleanerShared.sanitizeSettings({
    betweenItemsMs: 3200,
    scrollPauseMs: 2200,
    retryLimit: 2,
    retryBackoffMs: 1800,
    failureStreakLimit: 4,
  });

  assert.deepEqual(plain(settings), {
    speedProfile: "fast",
    betweenItemsMs: 1200,
    scrollPauseMs: 1200,
    retryLimit: 2,
    retryBackoffMs: 1200,
    failureStreakLimit: 4,
  });
});

test("sanitizeSettings preserves custom legacy values while adding speed profile", () => {
  const context = createContext({
    YtActivityCleanerShared: {
      ext: {
        storage: {
          local: {
            async get() {
              return {};
            },
            async set() {},
          },
        },
      },
    },
  });

  loadScript("extension/shared/settings.js", context);

  const settings = context.YtActivityCleanerShared.sanitizeSettings({
    betweenItemsMs: 1800,
    scrollPauseMs: 900,
    retryLimit: 1,
    retryBackoffMs: 700,
    failureStreakLimit: 3,
  });

  assert.deepEqual(plain(settings), {
    speedProfile: "fast",
    betweenItemsMs: 1800,
    scrollPauseMs: 900,
    retryLimit: 1,
    retryBackoffMs: 700,
    failureStreakLimit: 3,
  });
});

test("saveSettings persists sanitized values to storage", async () => {
  const storageState = {};
  const context = createContext({
    YtActivityCleanerShared: {
      ext: {
        storage: {
          local: {
            async get(key) {
              return { [key]: storageState[key] };
            },
            async set(payload) {
              Object.assign(storageState, payload);
            },
          },
        },
      },
    },
  });

  loadScript("extension/shared/settings.js", context);

  const saved = await context.YtActivityCleanerShared.saveSettings({
    speedProfile: "safe",
    betweenItemsMs: 99999,
    scrollPauseMs: 100,
    retryLimit: 7,
    retryBackoffMs: 50,
    failureStreakLimit: 0,
  });

  assert.deepEqual(plain(saved), {
    speedProfile: "safe",
    betweenItemsMs: 12000,
    scrollPauseMs: 800,
    retryLimit: 5,
    retryBackoffMs: 500,
    failureStreakLimit: 1,
  });

  assert.deepEqual(plain(storageState.cleanerSettings), plain(saved));
});
