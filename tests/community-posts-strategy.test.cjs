const test = require("node:test");
const assert = require("node:assert/strict");

const { createContext, loadScript } = require("./helpers/load-script.cjs");

function loadStrategyScripts(context) {
  loadScript("extension/shared/text.js", context);
  loadScript("extension/content/cleaner/candidates.js", context);
  loadScript("extension/content/cleaner/strategies/my-activity-delete.js", context);
  loadScript("extension/content/cleaner/strategies/playlist-remove.js", context);
  loadScript("extension/content/cleaner/strategy.js", context);
}

test("community posts reuse the delete strategy with target-specific messages", () => {
  const context = createContext({
    YtActivityCleanerShared: {
      t(_key, substitutions, fallback = "") {
        if (Array.isArray(substitutions)) {
          return fallback.replace(/\$(\d+)/g, (_match, index) => {
            const value = substitutions[Number(index) - 1];
            return value === undefined ? "" : String(value);
          });
        }

        if (substitutions !== undefined) {
          return fallback.replace("$1", String(substitutions));
        }

        return fallback;
      },
    },
    YtActivityCleanerContent: {},
  });

  loadScript("extension/shared/targets.js", context);
  loadStrategyScripts(context);

  const target = context.YtActivityCleanerShared.getTargetById("communityPosts");
  context.YtActivityCleanerContent.getTarget = () => target;
  context.YtActivityCleanerContent.getVisibleDeleteButtons = () => [];
  context.YtActivityCleanerContent.describeItem = () => "test";
  context.YtActivityCleanerContent.findRetryDeleteButton = () => null;
  context.YtActivityCleanerContent.getLoadMoreButton = () => null;

  const strategy = context.YtActivityCleanerContent.getTargetStrategy();

  assert.equal(strategy.id, "myActivityDelete");
  assert.equal(strategy.getCompletedCountMessage(2), "Deleted community posts: 2");
  assert.equal(
    strategy.getNoMoreActionsMessage(),
    "No more visible community-post delete buttons were found."
  );
});
