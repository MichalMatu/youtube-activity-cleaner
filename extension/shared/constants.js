(() => {
  const shared = (globalThis.YtActivityCleanerShared =
    globalThis.YtActivityCleanerShared || {});

  shared.Constants = Object.freeze({
    COMMENTS_PAGE_URL:
      "https://myactivity.google.com/page?hl=en-GB&utm_medium=web&utm_source=youtube&page=youtube_comments",
    SUPPORTED_PAGE_HOST: "myactivity.google.com",
    SUPPORTED_PAGE_FRAGMENT: "page=youtube_comments",
    SUPPORT_URL: "https://buymeacoffee.com/michalmatuh",
  });

  shared.isSupportedUrl = (url) =>
    typeof url === "string" &&
    url.startsWith(`https://${shared.Constants.SUPPORTED_PAGE_HOST}/`) &&
    url.includes(shared.Constants.SUPPORTED_PAGE_FRAGMENT);
})();
