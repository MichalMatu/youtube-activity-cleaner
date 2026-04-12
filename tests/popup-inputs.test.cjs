const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { createContext, loadScript } = require("./helpers/load-script.cjs");

const plMessages = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "..", "extension", "_locales", "pl", "messages.json"),
    "utf8"
  )
);

function getLocalizedMessage(key, substitutions) {
  const entry = plMessages[key];
  if (!entry) {
    return "";
  }

  const values =
    substitutions === undefined
      ? []
      : Array.isArray(substitutions)
        ? substitutions
        : [substitutions];

  return entry.message.replace(/\$(\d+)/g, (_match, index) => {
    const value = values[Number(index) - 1];
    return value === undefined ? "" : String(value);
  });
}

function createElement(value = "") {
  return {
    value,
    textContent: "",
    style: {},
    disabled: false,
    addEventListener() {},
  };
}

test("popup accepts comma decimals and shows localized preview text", async () => {
  const supportedUrl =
    "https://myactivity.google.com/page?hl=en-GB&utm_medium=web&utm_source=youtube&page=youtube_comments";

  const context = createContext({
    Intl,
    setInterval() {
      return 0;
    },
    clearInterval() {},
    document: {
      documentElement: { lang: "pl" },
      querySelectorAll() {
        return [];
      },
    },
    YtActivityCleanerShared: {
      ext: {
        i18n: {
          getMessage: getLocalizedMessage,
          getUILanguage() {
            return "pl";
          },
        },
        storage: {
          local: {
            async get() {
              return {};
            },
            async set() {},
          },
        },
        tabs: {
          async query() {
            return [{ id: 1, url: supportedUrl, status: "complete", title: "Your YouTube comments" }];
          },
          async sendMessage() {
            return { status: { deleted: 0, attempted: 0, failed: 0 } };
          },
          async create() {},
          async get(tabId) {
            return { id: tabId, url: supportedUrl, status: "complete", title: "Your YouTube comments" };
          },
        },
        runtime: {
          getManifest() {
            return { version: "1.0.0" };
          },
          async sendMessage(message) {
            if (message.type === "cleaner/get-tab") {
              return { session: { tabId: null, hasCleanerTab: false } };
            }

            if (message.type === "power/get-status") {
              return { keepAwakeActive: false };
            }

            return { ok: true, session: { tabId: null, hasCleanerTab: false } };
          },
        },
      },
    },
    YtActivityCleanerPopup: {
      elements: {
        speedProfileSelect: createElement("safe"),
        betweenItemsSecondsInput: createElement("1.2"),
        scrollPauseSecondsInput: createElement("1.2"),
        retryLimitInput: createElement("2"),
        retryBackoffSecondsInput: createElement("1.2"),
        failureStreakLimitInput: createElement("4"),
        startButton: createElement(),
        stopButton: createElement(),
        openPageButton: createElement(),
        supportButton: createElement(),
        donateButton: createElement(),
        appMetaElement: createElement(),
        settingsForm: createElement(),
        resetSettingsButton: createElement(),
        settingsPreviewElement: createElement(),
        settingsStateElement: createElement(),
      },
      renderStatus() {},
      renderError() {},
      renderDisconnectedPage() {},
      renderSettingsState() {},
      renderSettingsPreview() {},
    },
  });

  loadScript("extension/shared/i18n.js", context);
  loadScript("extension/shared/messages.js", context);
  loadScript("extension/shared/targets.js", context);
  loadScript("extension/shared/constants.js", context);
  loadScript("extension/shared/settings.js", context);
  loadScript("extension/popup/index.js", context);

  await Promise.resolve();

  const popup = context.YtActivityCleanerPopup;

  assert.equal(popup.parseSecondsInput("1,2"), 1200);
  assert.equal(popup.getUiLocaleLabel(), "polski (pl)");
  assert.equal(popup.getAppMetaText(), "Wersja 1.0.0 • UI: polski (pl)");
  assert.equal(
    popup.getSettingsPreviewText({
      speedProfile: "safe",
      betweenItemsMs: 1200,
      scrollPauseMs: 1200,
      retryLimit: 2,
      retryBackoffMs: 1200,
      failureStreakLimit: 4,
    }),
    "Bezpieczny • tempo 1,2 s • 2 ponowień"
  );
});

test("popup recognizes the likes page but does not allow starting it yet", async () => {
  const likesUrl = "https://www.youtube.com/playlist?list=LL";

  const context = createContext({
    Intl,
    setInterval() {
      return 0;
    },
    clearInterval() {},
    document: {
      documentElement: { lang: "en" },
      querySelectorAll() {
        return [];
      },
    },
    YtActivityCleanerShared: {
      ext: {
        i18n: {
          getMessage(key, substitutions, fallback) {
            if (key === "targetLikesLabel") {
              return "Liked videos";
            }

            if (key === "popupTargetNotEnabledYet") {
              const value = Array.isArray(substitutions) ? substitutions[0] : substitutions;
              return `${value} cleanup is not enabled yet.`;
            }

            return fallback || "";
          },
          getUILanguage() {
            return "en";
          },
        },
        storage: {
          local: {
            async get() {
              return {};
            },
            async set() {},
          },
        },
        tabs: {
          async query() {
            return [{ id: 2, url: likesUrl, status: "complete", title: "Liked videos" }];
          },
          async create() {},
          async get() {
            return null;
          },
        },
        runtime: {
          getManifest() {
            return { version: "1.0.0" };
          },
          async sendMessage(message) {
            if (message.type === "cleaner/get-tab") {
              return { session: { tabId: null, hasCleanerTab: false } };
            }

            if (message.type === "power/get-status") {
              return { keepAwakeActive: false };
            }

            return { ok: true, session: { tabId: null, hasCleanerTab: false } };
          },
        },
      },
    },
    YtActivityCleanerPopup: {
      elements: {
        speedProfileSelect: createElement("fast"),
        betweenItemsSecondsInput: createElement("1.2"),
        scrollPauseSecondsInput: createElement("1.2"),
        retryLimitInput: createElement("2"),
        retryBackoffSecondsInput: createElement("1.2"),
        failureStreakLimitInput: createElement("4"),
        startButton: createElement(),
        stopButton: createElement(),
        openPageButton: createElement(),
        supportButton: createElement(),
        donateButton: createElement(),
        appMetaElement: createElement(),
        settingsForm: createElement(),
        resetSettingsButton: createElement(),
        settingsPreviewElement: createElement(),
        settingsStateElement: createElement(),
      },
      renderStatus() {},
      renderError() {},
      renderDisconnectedPage() {},
      renderSettingsState() {},
      renderSettingsPreview() {},
    },
  });

  loadScript("extension/shared/i18n.js", context);
  loadScript("extension/shared/messages.js", context);
  loadScript("extension/shared/targets.js", context);
  loadScript("extension/shared/constants.js", context);
  loadScript("extension/shared/settings.js", context);
  loadScript("extension/popup/index.js", context);

  await Promise.resolve();

  const popup = context.YtActivityCleanerPopup;
  const resolved = await popup.resolveTargetContext();

  assert.equal(resolved.activeTabSupported, true);
  assert.equal(resolved.activeTabRunnable, false);
  assert.equal(resolved.canStartFromActiveTab, false);
  assert.equal(resolved.activeTabTarget?.id, "likes");
  assert.equal(
    popup.getTargetLabel(resolved.activeTabTarget),
    "Liked videos"
  );
});
