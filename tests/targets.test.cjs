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
  const commentLikesUrl = "https://myactivity.google.com/page?page=youtube_comment_likes";
  const liveChatsUrl = "https://myactivity.google.com/page?page=youtube_live_chat";
  const communityPostsUrl =
    "https://myactivity.google.com/page?utm_source=my-activity&hl=en&page=youtube_posts_activity";
  const commentsTarget = shared.getTargetByUrl(commentsUrl);
  const commentLikesTarget = shared.getTargetByUrl(commentLikesUrl);
  const liveChatsTarget = shared.getTargetByUrl(liveChatsUrl);
  const communityPostsTarget = shared.getTargetByUrl(communityPostsUrl);

  assert.equal(shared.DEFAULT_TARGET_ID, "comments");
  assert.equal(commentsTarget?.id, "comments");
  assert.equal(commentsTarget?.strategyId, "myActivityDelete");
  assert.equal(commentLikesTarget?.id, "commentLikes");
  assert.equal(commentLikesTarget?.strategyId, "myActivityDelete");
  assert.equal(liveChatsTarget?.id, "liveChats");
  assert.equal(liveChatsTarget?.strategyId, "myActivityDelete");
  assert.equal(communityPostsTarget?.id, "communityPosts");
  assert.equal(communityPostsTarget?.strategyId, "myActivityDelete");
  assert.equal(shared.isSupportedUrl(commentsUrl), true);
  assert.equal(shared.isRunnableUrl(commentsUrl), true);
  assert.equal(shared.isSupportedUrl(commentLikesUrl), true);
  assert.equal(shared.isRunnableUrl(commentLikesUrl), true);
  assert.equal(shared.isSupportedUrl(liveChatsUrl), true);
  assert.equal(shared.isRunnableUrl(liveChatsUrl), true);
  assert.equal(shared.isSupportedUrl(communityPostsUrl), true);
  assert.equal(shared.isRunnableUrl(communityPostsUrl), false);
  assert.equal(shared.getTargetById("commentLikes")?.id, "commentLikes");
  assert.equal(shared.getTargetById("liveChats")?.id, "liveChats");
  assert.equal(shared.getTargetById("communityPosts")?.id, "communityPosts");
  assert.equal(shared.getTargetById("likes")?.id, "likes");
  assert.equal(shared.getTargetById("likes")?.strategyId, "playlistRemove");
  assert.equal(shared.Constants.COMMENT_LIKES_PAGE_URL, commentLikesUrl);
  assert.equal(shared.Constants.LIVE_CHATS_PAGE_URL, liveChatsUrl);
  assert.equal(shared.Constants.COMMUNITY_POSTS_PAGE_URL, communityPostsUrl);
  assert.equal(shared.Constants.LIKES_PAGE_URL, "https://www.youtube.com/playlist?list=LL");
  assert.equal(shared.isSupportedUrl("https://www.youtube.com/playlist?list=LL"), true);
  assert.equal(shared.isRunnableUrl("https://www.youtube.com/playlist?list=LL"), true);
  assert.equal(shared.isSupportedUrl("https://www.youtube.com/watch?v=abc"), false);
  assert.equal(shared.Constants.COMMENTS_PAGE_URL, commentsUrl);
});
