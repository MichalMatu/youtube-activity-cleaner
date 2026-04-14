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
    hidden: false,
    attributes: {},
    children: [],
    dataset: {},
    listeners: {},
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    },
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    replaceChildren(...nextChildren) {
      this.children = [...nextChildren];
    },
    click() {
      return this.listeners.click?.({ currentTarget: this, target: this });
    },
    setAttribute(name, nextValue) {
      this.attributes[name] = nextValue;
    },
    getAttribute(name) {
      return this.attributes[name];
    },
  };
}

function createPopupElements() {
  return {
    speedProfileSelect: createElement("safe"),
    betweenItemsSecondsInput: createElement("1.2"),
    scrollPauseSecondsInput: createElement("1.2"),
    retryLimitInput: createElement("2"),
    retryBackoffSecondsInput: createElement("1.2"),
    failureStreakLimitInput: createElement("4"),
    startButton: createElement(),
    stopButton: createElement(),
    quickLinksElement: createElement(),
    supportButton: createElement(),
    donateButton: createElement(),
    appMetaElement: createElement(),
    settingsPanel: createElement(),
    settingsToggleButton: createElement(),
    settingsCloseButton: createElement(),
    settingsForm: createElement(),
    resetSettingsButton: createElement(),
    settingsPreviewElement: createElement(),
    settingsStateElement: createElement(),
  };
}

function loadPopupStack(context) {
  loadScript("extension/shared/i18n.js", context);
  loadScript("extension/shared/text.js", context);
  loadScript("extension/shared/messages.js", context);
  loadScript("extension/shared/targets.js", context);
  loadScript("extension/shared/constants.js", context);
  loadScript("extension/shared/settings.js", context);
  loadScript("extension/popup/targets.js", context);
  loadScript("extension/popup/settings-form.js", context);
  loadScript("extension/popup/panel.js", context);
  loadScript("extension/popup/runtime.js", context);
  loadScript("extension/popup/index.js", context);
}

test("popup accepts comma decimals and shows localized preview text", async () => {
  const supportedUrl =
    "https://myactivity.google.com/page?hl=en-GB&utm_medium=web&utm_source=youtube&page=youtube_comments";
  const createdUrls = [];

  const context = createContext({
    Intl,
    setInterval() {
      return 0;
    },
    clearInterval() {},
    document: {
      documentElement: { lang: "pl" },
      createElement() {
        return createElement();
      },
      addEventListener() {},
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
          async create({ url }) {
            createdUrls.push(url);
          },
          async get(tabId) {
            return { id: tabId, url: supportedUrl, status: "complete", title: "Your YouTube comments" };
          },
        },
        runtime: {
          getManifest() {
            return { version: "4.0.0" };
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
      elements: createPopupElements(),
      renderStatus() {},
      renderError() {},
      renderDisconnectedPage() {},
      renderSettingsState() {},
      renderSettingsPreview() {},
    },
  });

  loadPopupStack(context);

  await Promise.resolve();

  const popup = context.YtActivityCleanerPopup;

  assert.equal(popup.parseSecondsInput("1,2"), 1200);
  assert.equal(popup.getAppMetaText(), "Wersja 4.0.0");
  assert.equal(
    popup.getSettingsPreviewText({
      speedProfile: "safe",
      betweenItemsMs: 1200,
      scrollPauseMs: 1200,
      retryLimit: 2,
      retryBackoffMs: 1200,
      failureStreakLimit: 4,
    }),
    "Bezpieczny • 1,2 s • 2x"
  );
  assert.deepEqual(
    popup.elements.quickLinksElement.children.map((child) => child.textContent),
    [
      "Otwórz komentarze YouTube",
      "Otwórz polubienia komentarzy",
      "Otwórz historia czatów na żywo",
      "Otwórz posty społeczności",
      "Otwórz Polubione filmy",
    ]
  );

  await popup.elements.quickLinksElement.children[1].click();
  assert.deepEqual(createdUrls, ["https://myactivity.google.com/page?page=youtube_comment_likes"]);
});

test("popup recognizes the likes page and allows starting it", async () => {
  const likesUrl = "https://www.youtube.com/playlist?list=LL";

  const context = createContext({
    Intl,
    setInterval() {
      return 0;
    },
    clearInterval() {},
    document: {
      documentElement: { lang: "en" },
      createElement() {
        return createElement();
      },
      addEventListener() {},
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
          async sendMessage() {
            return { response: { status: { deleted: 0, attempted: 0, failed: 0 } } };
          },
          async create() {},
          async get() {
            return null;
          },
        },
        runtime: {
          getManifest() {
            return { version: "4.0.0" };
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
        ...createPopupElements(),
        speedProfileSelect: createElement("fast"),
      },
      renderStatus() {},
      renderError() {},
      renderDisconnectedPage() {},
      renderSettingsState() {},
      renderSettingsPreview() {},
    },
  });

  loadPopupStack(context);

  await Promise.resolve();

  const popup = context.YtActivityCleanerPopup;
  const resolved = await popup.resolveTargetContext();

  assert.equal(resolved.activeTabSupported, true);
  assert.equal(resolved.activeTabRunnable, true);
  assert.equal(resolved.canStartFromActiveTab, true);
  assert.equal(resolved.activeTabTarget?.id, "likes");
  assert.equal(
    popup.getTargetLabel(resolved.activeTabTarget),
    "Liked videos"
  );
  assert.equal(popup.elements.quickLinksElement.children.length, 5);
});

test("popup recognizes the live chat history page and allows starting it", async () => {
  const liveChatsUrl = "https://myactivity.google.com/page?page=youtube_live_chat";

  const context = createContext({
    Intl,
    setInterval() {
      return 0;
    },
    clearInterval() {},
    document: {
      documentElement: { lang: "en" },
      createElement() {
        return createElement();
      },
      addEventListener() {},
      querySelectorAll() {
        return [];
      },
    },
    YtActivityCleanerShared: {
      ext: {
        i18n: {
          getMessage(key, substitutions, fallback) {
            if (key === "targetLiveChatsLabel") {
              return "Live chat history";
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
            return [{ id: 4, url: liveChatsUrl, status: "complete", title: "Live chat history" }];
          },
          async sendMessage() {
            return { response: { status: { deleted: 0, attempted: 0, failed: 0 } } };
          },
          async create() {},
          async get() {
            return null;
          },
        },
        runtime: {
          getManifest() {
            return { version: "4.0.0" };
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
        ...createPopupElements(),
        speedProfileSelect: createElement("fast"),
      },
      renderStatus() {},
      renderError() {},
      renderDisconnectedPage() {},
      renderSettingsState() {},
      renderSettingsPreview() {},
    },
  });

  loadPopupStack(context);

  await Promise.resolve();

  const popup = context.YtActivityCleanerPopup;
  const resolved = await popup.resolveTargetContext();

  assert.equal(resolved.activeTabSupported, true);
  assert.equal(resolved.activeTabRunnable, true);
  assert.equal(resolved.canStartFromActiveTab, true);
  assert.equal(resolved.activeTabTarget?.id, "liveChats");
  assert.equal(
    popup.getTargetLabel(resolved.activeTabTarget),
    "Live chat history"
  );
});

test("popup recognizes the community-post page and allows starting it", async () => {
  const communityPostsUrl =
    "https://myactivity.google.com/page?utm_source=my-activity&hl=en&page=youtube_posts_activity";

  const context = createContext({
    Intl,
    setInterval() {
      return 0;
    },
    clearInterval() {},
    document: {
      documentElement: { lang: "en" },
      createElement() {
        return createElement();
      },
      addEventListener() {},
      querySelectorAll() {
        return [];
      },
    },
    YtActivityCleanerShared: {
      ext: {
        i18n: {
          getMessage(_key, _substitutions, fallback) {
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
            return [{ id: 3, url: communityPostsUrl, status: "complete", title: "Community posts" }];
          },
          async sendMessage() {
            return { response: { status: { deleted: 0, attempted: 0, failed: 0 } } };
          },
          async create() {},
          async get() {
            return null;
          },
        },
        runtime: {
          getManifest() {
            return { version: "4.0.0" };
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
      elements: createPopupElements(),
      renderStatus() {},
      renderError() {},
      renderDisconnectedPage() {},
      renderSettingsState() {},
      renderSettingsPreview() {},
    },
  });

  loadPopupStack(context);

  await Promise.resolve();

  const popup = context.YtActivityCleanerPopup;
  const resolved = await popup.resolveTargetContext();

  assert.equal(resolved.activeTabSupported, true);
  assert.equal(resolved.activeTabRunnable, true);
  assert.equal(resolved.canStartFromActiveTab, true);
  assert.equal(resolved.activeTabTarget?.id, "communityPosts");
  assert.equal(
    popup.getTargetLabel(resolved.activeTabTarget),
    "Community posts"
  );
});

test("popup recognizes the alternate community-post page URL and allows starting it", async () => {
  const communityPostsUrl = "https://myactivity.google.com/page?page=youtube_community_posts";

  const context = createContext({
    Intl,
    setInterval() {
      return 0;
    },
    clearInterval() {},
    document: {
      documentElement: { lang: "en" },
      createElement() {
        return createElement();
      },
      addEventListener() {},
      querySelectorAll() {
        return [];
      },
    },
    YtActivityCleanerShared: {
      ext: {
        i18n: {
          getMessage(_key, _substitutions, fallback) {
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
            return [{ id: 5, url: communityPostsUrl, status: "complete", title: "Community posts" }];
          },
          async sendMessage() {
            return { response: { status: { deleted: 0, attempted: 0, failed: 0 } } };
          },
          async create() {},
          async get() {
            return null;
          },
        },
        runtime: {
          getManifest() {
            return { version: "4.0.0" };
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
      elements: createPopupElements(),
      renderStatus() {},
      renderError() {},
      renderDisconnectedPage() {},
      renderSettingsState() {},
      renderSettingsPreview() {},
    },
  });

  loadPopupStack(context);

  await Promise.resolve();

  const popup = context.YtActivityCleanerPopup;
  const resolved = await popup.resolveTargetContext();

  assert.equal(resolved.activeTabSupported, true);
  assert.equal(resolved.activeTabRunnable, true);
  assert.equal(resolved.canStartFromActiveTab, true);
  assert.equal(resolved.activeTabTarget?.id, "communityPosts");
});
