(() => {
  const shared = (globalThis.YtActivityCleanerShared =
    globalThis.YtActivityCleanerShared || {});
  const commentsTarget = shared.getTargetById?.("comments");
  const defaultTarget = shared.getDefaultTarget?.() || commentsTarget;

  shared.Constants = Object.freeze({
    DEFAULT_TARGET_ID: defaultTarget?.id || "comments",
    COMMENTS_PAGE_URL:
      commentsTarget?.pageUrl ||
      "https://myactivity.google.com/page?hl=en-GB&utm_medium=web&utm_source=youtube&page=youtube_comments",
    SUPPORTED_PAGE_HOST: defaultTarget?.supportedHost || "myactivity.google.com",
    SUPPORTED_PAGE_FRAGMENT: defaultTarget?.requiredUrlFragments?.[0] || "page=youtube_comments",
    PROJECT_SITE_URL: "https://michalmatu.github.io/youtube-activity-cleaner/",
    SUPPORT_URL: "https://michalmatu.github.io/youtube-activity-cleaner/support.html",
    DONATE_URL: "https://buymeacoffee.com/michalmatuh",
  });
})();
