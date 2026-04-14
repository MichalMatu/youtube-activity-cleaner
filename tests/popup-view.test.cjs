const test = require("node:test");
const assert = require("node:assert/strict");

const { createContext, loadScript } = require("./helpers/load-script.cjs");

function createElement() {
  return {
    textContent: "",
    style: {},
    disabled: false,
    hidden: false,
  };
}

function formatFallback(fallback = "", substitutions) {
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

function createViewTestContext() {
  const selectors = [
    "#page-state",
    "#tab-state",
    "#run-state",
    "#power-state",
    "#debug-state",
    "#settings-state",
    "#settings-preview",
    "#deleted-count",
    "#attempted-count",
    "#failed-count",
    "#start-button",
    "#stop-button",
    "#quick-links",
    "#support-button",
    "#donate-button",
    "#project-banner-button",
    "#app-meta",
    "#settings-panel",
    "#settings-toggle-button",
    "#settings-close-button",
    "#settings-form",
    "#reset-settings-button",
    "#speed-profile",
    "#between-items-seconds",
    "#scroll-pause-seconds",
    "#retry-limit",
    "#retry-backoff-seconds",
    "#failure-streak-limit",
  ];

  const elements = Object.fromEntries(selectors.map((selector) => [selector, createElement()]));
  const context = createContext({
    document: {
      querySelector(selector) {
        return elements[selector] || null;
      },
    },
    YtActivityCleanerShared: {
      t(_key, substitutions, fallback = "") {
        return formatFallback(fallback, substitutions);
      },
    },
    YtActivityCleanerPopup: {
      isSupportedUrl(url) {
        return url === "https://supported/current" || url === "https://supported/future";
      },
      getTargetByUrl(url) {
        if (url === "https://supported/current") {
          return { id: "comments" };
        }

        if (url === "https://supported/future") {
          return { id: "commentLikes" };
        }

        return null;
      },
      getTargetLabel(target) {
        if (target?.id === "comments") {
          return "YouTube comments";
        }

        if (target?.id === "commentLikes") {
          return "Comment likes";
        }

        return "Unknown";
      },
    },
  });

  loadScript("extension/popup/view.js", context);
  return { popup: context.YtActivityCleanerPopup, elements };
}

test("popup view unhides the secondary line when a later state needs it", () => {
  const { popup, elements } = createViewTestContext();

  popup.renderStatus(
    { deleted: 1, attempted: 1, failed: 0 },
    {
      activeTab: { id: 1, url: "https://supported/current" },
      activeTabSupported: true,
      activeTabTarget: { id: "comments" },
      targetTab: { id: 1, url: "https://supported/current", title: "Current tab" },
      isTrackedTab: false,
      isUsingActiveTab: true,
      canStartFromActiveTab: true,
    }
  );

  assert.equal(elements["#tab-state"].hidden, true);
  assert.equal(elements["#tab-state"].textContent, "");

  popup.renderStatus(
    { deleted: 1, attempted: 1, failed: 0 },
    {
      activeTab: { id: 2, url: "https://supported/future" },
      activeTabSupported: true,
      activeTabTarget: { id: "commentLikes" },
      targetTab: null,
      isTrackedTab: false,
      isUsingActiveTab: false,
      canStartFromActiveTab: false,
    }
  );

  assert.equal(elements["#tab-state"].hidden, false);
  assert.equal(
    elements["#tab-state"].textContent,
    "Comment likes cleanup is planned, but it is not enabled yet."
  );
});
