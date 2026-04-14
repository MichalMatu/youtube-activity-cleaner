const test = require("node:test");
const assert = require("node:assert/strict");

const { createContext, loadScript } = require("./helpers/load-script.cjs");

function createVisibleElement({
  textContent = "",
  ariaLabel = "",
  jsname = "",
  queryMap = {},
  rect = {},
  closestMap = {},
  visible = true,
} = {}) {
  return {
    textContent,
    innerText: textContent,
    disabled: false,
    isConnected: true,
    click() {},
    scrollIntoView() {},
    querySelectorAll(selector) {
      return queryMap[selector] || [];
    },
    closest(selector) {
      return closestMap[selector] || null;
    },
    getAttribute(name) {
      if (name === "aria-label") {
        return ariaLabel;
      }

      if (name === "jsname") {
        return jsname;
      }

      return "";
    },
    getBoundingClientRect() {
      return {
        top: 120,
        bottom: 160,
        width: 20,
        height: 20,
        ...rect,
      };
    },
    __visible: visible,
  };
}

function loadDomScripts(context) {
  loadScript("extension/content/cleaner/dom.js", context);
  loadScript("extension/content/cleaner/dom-viewport.js", context);
  loadScript("extension/content/cleaner/dom-dialogs.js", context);
  loadScript("extension/content/cleaner/dom-retry.js", context);
}

test("getLoadMoreButton ignores the verification banner button", () => {
  const verificationButton = createVisibleElement({
    textContent: "Zarządzaj weryfikacją na stronie Moja aktywność",
  });

  const context = createContext({
    document: {
      documentElement: {
        clientHeight: 900,
      },
      querySelectorAll(selector) {
        if (selector === ".ksBjEc.lKxP2d.LQeN7") {
          return [verificationButton];
        }

        return [];
      },
    },
    window: {
      innerHeight: 900,
    },
    getComputedStyle(element) {
      return {
        visibility: element?.__visible === false ? "hidden" : "visible",
        display: element?.__visible === false ? "none" : "block",
      };
    },
    YtActivityCleanerContent: {
      getSelectorList(key) {
        if (key === "loadMore") {
          return ['button[jsname="T8gEfd"]', ".ksBjEc.lKxP2d.LQeN7"];
        }

        return [];
      },
    },
  });

  loadDomScripts(context);

  assert.equal(context.YtActivityCleanerContent.getLoadMoreButton(), null);
});

test("dismissKnownBlockingDialog clicks the visible close button", async () => {
  let clickedElement = null;
  const closeButton = createVisibleElement({
    textContent: "",
    ariaLabel: "Zamknij",
  });
  closeButton.click = () => {
    clickedElement = closeButton;
  };
  const dialog = createVisibleElement({
    textContent:
      "Zarządzaj weryfikacją na stronie Moja aktywność Jeśli włączysz dodatkową weryfikację...",
    queryMap: {
      'button, [role="button"]': [closeButton],
    },
  });

  const context = createContext({
    document: {
      visibilityState: "visible",
      documentElement: {
        clientHeight: 900,
      },
      querySelectorAll(selector) {
        if (selector === '[role="dialog"]' || selector === '[aria-modal="true"]') {
          return [dialog];
        }

        return [];
      },
    },
    window: {
      innerHeight: 900,
    },
    getComputedStyle(element) {
      return {
        visibility: element?.__visible === false ? "hidden" : "visible",
        display: element?.__visible === false ? "none" : "block",
      };
    },
    YtActivityCleanerContent: {
      getSelectorList() {
        return [];
      },
      pauseUntilVisible: async () => true,
      pauseAwareSleep: async () => true,
      getSettingValue() {
        return 0;
      },
    },
  });

  loadDomScripts(context);

  const result = await context.YtActivityCleanerContent.dismissKnownBlockingDialog();

  assert.equal(result, true);
  assert.equal(clickedElement, closeButton);
});

test("getVisibleDeleteButtons keeps only delete buttons from the current viewport", () => {
  const inViewportButton = createVisibleElement({
    ariaLabel: "Usuń element aktywności Widoczny wpis",
    rect: { top: 140, bottom: 180 },
  });
  const belowViewportButton = createVisibleElement({
    ariaLabel: "Usuń element aktywności Niżej",
    rect: { top: 1280, bottom: 1320 },
  });

  const context = createContext({
    document: {
      documentElement: {
        clientHeight: 900,
      },
      querySelectorAll(selector) {
        if (selector === 'button[aria-label*="Usu\\u0144 element aktywno\\u015bci"]') {
          return [belowViewportButton, inViewportButton];
        }

        return [];
      },
    },
    window: {
      innerHeight: 900,
    },
    getComputedStyle(element) {
      return {
        visibility: element?.__visible === false ? "hidden" : "visible",
        display: element?.__visible === false ? "none" : "block",
      };
    },
    YtActivityCleanerContent: {
      getSelectorList(key) {
        if (key === "deleteButtons") {
          return ['button[aria-label*="Usu\\u0144 element aktywno\\u015bci"]'];
        }

        return [];
      },
    },
  });

  loadDomScripts(context);

  const buttons = context.YtActivityCleanerContent.getVisibleDeleteButtons();

  assert.equal(buttons.length, 1);
  assert.equal(buttons[0], inViewportButton);
});

test("getItemContainer prefers the most specific matching ancestor", () => {
  const outerCard = createVisibleElement({
    rect: { width: 400, height: 220 },
  });
  const innerRow = createVisibleElement({
    rect: { width: 360, height: 120 },
  });
  const button = createVisibleElement({
    closestMap: {
      '[role="listitem"]': innerRow,
      'c-wiz[jsname="Ttx95"]': outerCard,
      "c-wiz": outerCard,
    },
  });

  const context = createContext({
    document: {
      documentElement: {
        clientHeight: 900,
      },
      querySelectorAll() {
        return [];
      },
    },
    window: {
      innerHeight: 900,
    },
    getComputedStyle(element) {
      return {
        visibility: element?.__visible === false ? "hidden" : "visible",
        display: element?.__visible === false ? "none" : "block",
      };
    },
    YtActivityCleanerContent: {},
  });

  loadDomScripts(context);

  const container = context.YtActivityCleanerContent.getItemContainer(button);

  assert.equal(container, innerRow);
});

test("getVisibleDeleteButtons falls back to hidden buttons using the visible item row viewport", () => {
  const visibleRow = createVisibleElement({
    rect: { top: 140, bottom: 240, width: 360, height: 100 },
  });
  const hiddenButton = createVisibleElement({
    ariaLabel: "Usuń element aktywności Ukryty wpis",
    rect: { top: 0, bottom: 0, width: 0, height: 0 },
    visible: false,
    closestMap: {
      '[role="listitem"]': visibleRow,
    },
  });

  const context = createContext({
    document: {
      documentElement: {
        clientHeight: 900,
      },
      querySelectorAll(selector) {
        if (selector === 'button[aria-label*="Usu\\u0144 element aktywno\\u015bci"]') {
          return [hiddenButton];
        }

        return [];
      },
    },
    window: {
      innerHeight: 900,
    },
    getComputedStyle(element) {
      return {
        visibility: element?.__visible === false ? "hidden" : "visible",
        display: element?.__visible === false ? "none" : "block",
      };
    },
    YtActivityCleanerContent: {
      getSelectorList(key) {
        if (key === "deleteButtons") {
          return ['button[aria-label*="Usu\\u0144 element aktywno\\u015bci"]'];
        }

        return [];
      },
    },
  });

  loadDomScripts(context);

  const buttons = context.YtActivityCleanerContent.getVisibleDeleteButtons();

  assert.equal(buttons.length, 1);
  assert.equal(buttons[0], hiddenButton);
});

test("findRetryDeleteButton prefers a button from the same item container", () => {
  const currentRow = createVisibleElement();
  const otherRow = createVisibleElement();
  const previousButton = createVisibleElement({
    closestMap: {
      '[role="listitem"]': currentRow,
    },
  });
  const retryButton = createVisibleElement({
    closestMap: {
      '[role="listitem"]': currentRow,
    },
  });
  const otherButton = createVisibleElement({
    closestMap: {
      '[role="listitem"]': otherRow,
    },
  });

  const context = createContext({
    document: {
      documentElement: {
        clientHeight: 900,
      },
      querySelectorAll() {
        return [];
      },
    },
    window: {
      innerHeight: 900,
    },
    getComputedStyle(element) {
      return {
        visibility: element?.__visible === false ? "hidden" : "visible",
        display: element?.__visible === false ? "none" : "block",
      };
    },
    YtActivityCleanerContent: {},
  });

  loadDomScripts(context);

  context.YtActivityCleanerContent.getVisibleDeleteButtons = () => [otherButton, retryButton];
  context.YtActivityCleanerContent.describeItem = () => "test comment";

  const retryCandidate = context.YtActivityCleanerContent.findRetryDeleteButton(
    previousButton,
    "test comment"
  );

  assert.equal(retryCandidate, retryButton);
});
