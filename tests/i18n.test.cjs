const test = require("node:test");
const assert = require("node:assert/strict");

const { createContext, loadScript } = require("./helpers/load-script.cjs");

function createElement(attributes = {}, textContent = "") {
  return {
    attributes: { ...attributes },
    textContent,
    getAttribute(name) {
      return this.attributes[name];
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
  };
}

test("t returns translated messages and falls back cleanly", () => {
  const context = createContext({
    document: {
      documentElement: { lang: "en" },
      querySelectorAll: () => [],
    },
    YtActivityCleanerShared: {
      ext: {
        i18n: {
          getMessage(key, substitutions) {
            if (key === "hello") {
              return `Hello ${substitutions[0]}`;
            }

            return "";
          },
          getUILanguage() {
            return "en";
          },
        },
      },
    },
  });

  loadScript("extension/shared/i18n.js", context);

  assert.equal(context.YtActivityCleanerShared.t("hello", "Michal"), "Hello Michal");
  assert.equal(context.YtActivityCleanerShared.t("missing", undefined, "fallback"), "fallback");
});

test("localizeDocument translates text and attributes and updates html lang", () => {
  const title = createElement({ "data-i18n": "popupTitle" }, "Old title");
  const button = createElement({ "data-i18n": "popupStartButton" }, "Old button");
  const input = createElement(
    { "data-i18n-placeholder": "popupCheckingPage", placeholder: "Old placeholder" },
    ""
  );
  const link = createElement({ "data-i18n-title": "popupHelpSupportButton", title: "Old title attr" }, "");

  const document = {
    documentElement: { lang: "en" },
    querySelectorAll(selector) {
      return {
        "[data-i18n]": [title, button],
        "[data-i18n-placeholder]": [input],
        "[data-i18n-title]": [link],
        "[data-i18n-aria-label]": [],
      }[selector] || [];
    },
  };

  const context = createContext({
    document,
    YtActivityCleanerShared: {
      ext: {
        i18n: {
          getMessage(key) {
            return (
              {
                popupTitle: "YouTube Activity Cleaner",
                popupStartButton: "Start",
                popupCheckingPage: "Checking page...",
                popupHelpSupportButton: "Help & support",
              }[key] || ""
            );
          },
          getUILanguage() {
            return "pl";
          },
        },
      },
    },
  });

  loadScript("extension/shared/i18n.js", context);
  context.YtActivityCleanerShared.localizeDocument();

  assert.equal(title.textContent, "YouTube Activity Cleaner");
  assert.equal(button.textContent, "Start");
  assert.equal(input.attributes.placeholder, "Checking page...");
  assert.equal(link.attributes.title, "Help & support");
  assert.equal(document.documentElement.lang, "pl");
});
