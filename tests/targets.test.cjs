const test = require("node:test");
const assert = require("node:assert/strict");

const { createContext, loadScript } = require("./helpers/load-script.cjs");

test("target registry resolves the comments page and keeps compatibility constants", () => {
  const context = createContext();

  loadScript("extension/shared/targets.js", context);
  loadScript("extension/shared/constants.js", context);

  const shared = context.YtActivityCleanerShared;
  const commentsUrl =
    "https://myactivity.google.com/page?hl=en-GB&utm_medium=web&utm_source=youtube&page=youtube_comments";
  const commentsTarget = shared.getTargetByUrl(commentsUrl);

  assert.equal(shared.DEFAULT_TARGET_ID, "comments");
  assert.equal(commentsTarget?.id, "comments");
  assert.equal(shared.isSupportedUrl(commentsUrl), true);
  assert.equal(shared.isRunnableUrl(commentsUrl), true);
  assert.equal(shared.getTargetById("likes")?.id, "likes");
  assert.equal(shared.Constants.LIKES_PAGE_URL, "https://www.youtube.com/playlist?list=LL");
  assert.equal(shared.isSupportedUrl("https://www.youtube.com/playlist?list=LL"), true);
  assert.equal(shared.isRunnableUrl("https://www.youtube.com/playlist?list=LL"), false);
  assert.equal(shared.isSupportedUrl("https://www.youtube.com/watch?v=abc"), false);
  assert.equal(shared.Constants.COMMENTS_PAGE_URL, commentsUrl);
});
