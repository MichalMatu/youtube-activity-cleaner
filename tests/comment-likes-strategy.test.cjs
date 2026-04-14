const test = require("node:test");
const assert = require("node:assert/strict");

const { createContext, loadScript } = require("./helpers/load-script.cjs");

test("comment likes reuse the delete strategy with target-specific messages", () => {
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

  const target = context.YtActivityCleanerShared.getTargetById("commentLikes");
  context.YtActivityCleanerContent.getTarget = () => target;
  context.YtActivityCleanerContent.getVisibleDeleteButtons = () => [];
  context.YtActivityCleanerContent.describeItem = () => "test";
  context.YtActivityCleanerContent.findRetryDeleteButton = () => null;
  context.YtActivityCleanerContent.getLoadMoreButton = () => null;

  loadScript("extension/content/cleaner/strategy.js", context);

  const strategy = context.YtActivityCleanerContent.getTargetStrategy();

  assert.equal(strategy.id, "comments");
  assert.equal(strategy.getCompletedCountMessage(2), "Deleted comment likes: 2");
  assert.equal(
    strategy.getNoMoreActionsMessage(),
    "No more visible comment-like delete buttons were found."
  );
});
