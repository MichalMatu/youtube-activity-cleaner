const test = require("node:test");
const assert = require("node:assert/strict");

const { createContext, loadScript } = require("./helpers/load-script.cjs");

test("engine refuses to start on a detected but disabled target", async () => {
  const likesTarget = {
    id: "likes",
    enabled: false,
    labelKey: "targetLikesLabel",
    labelFallback: "Liked videos",
  };
  const commentsTarget = {
    id: "comments",
    enabled: true,
    labelKey: "targetCommentsLabel",
    labelFallback: "YouTube comments",
  };
  const likesUrl = "https://www.youtube.com/playlist?list=LL";

  const context = createContext({
    window: {
      location: {
        href: likesUrl,
      },
    },
    document: {
      visibilityState: "visible",
    },
    YtActivityCleanerShared: {
      DEFAULT_TARGET_ID: "comments",
      Settings: {
        defaults: {
          speedProfile: "fast",
        },
      },
      sanitizeSettings(settings) {
        return {
          speedProfile: "fast",
          ...settings,
        };
      },
      getTargetByUrl(url) {
        return url === likesUrl ? likesTarget : null;
      },
      getRunnableTargetByUrl() {
        return null;
      },
      getTargetById(targetId) {
        if (targetId === "comments") {
          return commentsTarget;
        }

        if (targetId === "likes") {
          return likesTarget;
        }

        return null;
      },
      getDefaultTarget() {
        return commentsTarget;
      },
      getTargetLabel(target, translate) {
        return translate(target.labelKey, undefined, target.labelFallback || target.id);
      },
      ext: {
        runtime: {
          async sendMessage() {},
        },
      },
      Messages: {
        REQUEST_KEEP_AWAKE: "power/request-keep-awake",
        RELEASE_KEEP_AWAKE: "power/release-keep-awake",
      },
      async getSettings() {
        return { speedProfile: "fast" };
      },
      t(key, substitutions, fallback = "") {
        if (key === "targetLikesLabel") {
          return "Liked videos";
        }

        if (key === "contentTargetNotEnabledYet") {
          const value = Array.isArray(substitutions) ? substitutions[0] : substitutions;
          return `${value} cleanup is not enabled yet.`;
        }

        return fallback;
      },
    },
    YtActivityCleanerContent: {},
  });

  loadScript("extension/content/cleaner/state.js", context);
  loadScript("extension/content/cleaner/engine.js", context);

  const status = await context.YtActivityCleanerContent.startCleaner();

  assert.equal(status.supportedPage, true);
  assert.equal(status.runnablePage, false);
  assert.equal(status.running, false);
  assert.equal(status.starting, false);
  assert.equal(status.targetId, "likes");
  assert.equal(status.lastMessage, "Liked videos cleanup is not enabled yet.");
});
