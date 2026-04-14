const test = require("node:test");
const assert = require("node:assert/strict");

const { createContext, loadScript } = require("./helpers/load-script.cjs");

test("engine composes prepare, loop, and finalize phases in order", async () => {
  const calls = [];
  const context = createContext({
    YtActivityCleanerContent: {
      async prepareCleanerRun() {
        calls.push("prepare");
      },
      async runCleanerLoop() {
        calls.push("loop");
      },
      async finalizeCleanerRun() {
        calls.push("finalize");
      },
    },
  });

  loadScript("extension/content/cleaner/engine.js", context);

  await context.YtActivityCleanerContent.runCleaner();

  assert.deepEqual(calls, ["prepare", "loop", "finalize"]);
});
