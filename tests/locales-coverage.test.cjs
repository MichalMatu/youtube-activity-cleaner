const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function collectMatches(source, regex) {
  const values = new Set();
  for (const match of source.matchAll(regex)) {
    values.add(match[1]);
  }
  return values;
}

test("locale files cover all popup and runtime message keys", () => {
  const files = [
    "extension/manifest.json",
    "extension/popup/popup.html",
    "extension/popup/index.js",
    "extension/popup/panel.js",
    "extension/popup/runtime.js",
    "extension/popup/targets.js",
    "extension/popup/settings-form.js",
    "extension/popup/view.js",
    "extension/shared/text.js",
    "extension/shared/targets.js",
    "extension/shared/settings.js",
    "extension/content/index.js",
    "extension/content/cleaner/state.js",
    "extension/content/cleaner/scrolling.js",
    "extension/content/cleaner/candidates.js",
    "extension/content/cleaner/strategies/my-activity-delete.js",
    "extension/content/cleaner/strategies/playlist-remove.js",
    "extension/content/cleaner/strategy.js",
    "extension/content/cleaner/run-loop.js",
    "extension/content/cleaner/lifecycle.js",
    "extension/content/cleaner/engine.js",
    "tests/likes-strategy.test.cjs",
  ];

  const requiredKeys = new Set();

  for (const relativePath of files) {
    const source = read(relativePath);

    for (const key of collectMatches(source, /data-i18n="([^"]+)"/g)) {
      requiredKeys.add(key);
    }

    for (const key of collectMatches(source, /\bt\("([^"]+)"/g)) {
      requiredKeys.add(key);
    }

    for (const key of collectMatches(source, /\b(?:labelKey|completedCountKey|noMoreActionsKey): "([^"]+)"/g)) {
      requiredKeys.add(key);
    }

    for (const key of collectMatches(source, /__MSG_([A-Za-z0-9_]+)__/g)) {
      requiredKeys.add(key);
    }
  }

  const en = JSON.parse(read("extension/_locales/en/messages.json"));
  const pl = JSON.parse(read("extension/_locales/pl/messages.json"));
  const enKeys = new Set(Object.keys(en));
  const plKeys = new Set(Object.keys(pl));

  const missingInEn = [...requiredKeys].filter((key) => !enKeys.has(key));
  const missingInPl = [...requiredKeys].filter((key) => !plKeys.has(key));

  assert.deepEqual(missingInEn, []);
  assert.deepEqual(missingInPl, []);
  assert.deepEqual([...enKeys].sort(), [...plKeys].sort());
});
