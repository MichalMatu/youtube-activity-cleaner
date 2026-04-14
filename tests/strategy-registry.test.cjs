const test = require("node:test");
const assert = require("node:assert/strict");

const { createContext, loadScript } = require("./helpers/load-script.cjs");

test("strategy registry keeps legacy aliases pointing at flow-family ids", () => {
  const context = createContext({
    YtActivityCleanerContent: {
      Strategies: {
        myActivityDelete: {
          id: "myActivityDelete",
          collectActionCandidates() {
            return [];
          },
          describeAction() {
            return "";
          },
          findRetryAction() {
            return null;
          },
          getLoadMoreButton() {
            return null;
          },
          getCompletedCountMessage() {
            return "";
          },
          getNoMoreActionsMessage() {
            return "";
          },
          async runSingleAttempt() {
            return { success: true };
          },
        },
        playlistRemove: {
          id: "playlistRemove",
          collectActionCandidates() {
            return [];
          },
          describeAction() {
            return "";
          },
          findRetryAction() {
            return null;
          },
          getLoadMoreButton() {
            return null;
          },
          getCompletedCountMessage() {
            return "";
          },
          getNoMoreActionsMessage() {
            return "";
          },
          async runSingleAttempt() {
            return { success: true };
          },
        },
      },
    },
  });

  loadScript("extension/content/cleaner/strategy.js", context);

  assert.equal(
    context.YtActivityCleanerContent.getStrategyById("comments")?.id,
    "myActivityDelete"
  );
  assert.equal(
    context.YtActivityCleanerContent.getStrategyById("likes")?.id,
    "playlistRemove"
  );
});

test("strategy registry rejects incomplete strategy definitions", () => {
  const context = createContext({
    YtActivityCleanerContent: {
      Strategies: {
        broken: {
          id: "broken",
          describeAction() {
            return "";
          },
        },
      },
    },
  });

  assert.throws(
    () => loadScript("extension/content/cleaner/strategy.js", context),
    /must implement collectActionCandidates\(\) or getActionButtons\(\)/
  );
});
