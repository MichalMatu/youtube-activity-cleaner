(() => {
  const shared = (globalThis.YtActivityCleanerShared =
    globalThis.YtActivityCleanerShared || {});

  const freezeArray = (values = []) => Object.freeze([...values]);
  const myActivityDeleteSelectors = Object.freeze({
    deleteButtons: Object.freeze([
      'button[aria-label*="Delete activity item"]',
      'button[aria-label*="Delete activity"]',
      'button[aria-label*="Usu\\u0144 element aktywno\\u015bci"]',
      'button[aria-label*="Usu\\u0144 aktywno\\u015b\\u0107"]',
      '[role="listitem"] .YxbmAc button',
      '[role="listitem"] [jscontroller="Fs3gzb"] > button',
      'c-wiz[jsname="Ttx95"] .YxbmAc button',
    ]),
    actionButtons: Object.freeze([]),
    menuItems: Object.freeze([]),
    confirmButtons: Object.freeze([
      'button[aria-label="Delete"]',
      'button[aria-label="Usu\\u0144"]',
    ]),
    status: Object.freeze([
      '[jsname="PJEsad"]',
      '[jsname="vyyg5"]',
      '[role="status"]',
      '[aria-live="assertive"]',
      '[aria-live="polite"]',
    ]),
    loadMore: Object.freeze(['button[jsname="T8gEfd"]', ".ksBjEc.lKxP2d.LQeN7"]),
  });
  const myActivityDeleteDom = Object.freeze({
    itemContainers: Object.freeze(['c-wiz[jsname="Ttx95"]', '[role="listitem"]', "c-wiz", "li"]),
    descriptionSelectors: Object.freeze([".QTGV3c", ".SiEggd"]),
  });
  const myActivityDeleteStatusPatterns = Object.freeze({
    pending: Object.freeze([/deleting now|deleting|removing|usuwanie|trwa usuwanie/]),
    success: Object.freeze([
      /\bitem deleted\b|\bitems deleted\b|deleted successfully|usunięto|element usunięty/,
    ]),
    failure: Object.freeze([
      /couldn.?t delete|unable to delete|failed|something went wrong|nie udało się usunąć|nie można usunąć|błąd/,
    ]),
  });

  const createTarget = (definition) =>
    Object.freeze({
      ...definition,
      urlPrefixes: freezeArray(definition.urlPrefixes),
      requiredUrlFragments: freezeArray(definition.requiredUrlFragments),
      selectors: Object.freeze({
        deleteButtons: freezeArray(definition.selectors?.deleteButtons),
        actionButtons: freezeArray(definition.selectors?.actionButtons),
        menuItems: freezeArray(definition.selectors?.menuItems),
        confirmButtons: freezeArray(definition.selectors?.confirmButtons),
        status: freezeArray(definition.selectors?.status),
        loadMore: freezeArray(definition.selectors?.loadMore),
      }),
      dom: Object.freeze({
        itemContainers: freezeArray(definition.dom?.itemContainers),
        descriptionSelectors: freezeArray(definition.dom?.descriptionSelectors),
      }),
      statusPatterns: Object.freeze({
        pending: freezeArray(definition.statusPatterns?.pending),
        success: freezeArray(definition.statusPatterns?.success),
        failure: freezeArray(definition.statusPatterns?.failure),
      }),
    });
  const createMyActivityDeleteTarget = (definition) =>
    createTarget({
      supportedHost: "myactivity.google.com",
      urlPrefixes: ["https://myactivity.google.com/"],
      selectors: myActivityDeleteSelectors,
      dom: myActivityDeleteDom,
      statusPatterns: myActivityDeleteStatusPatterns,
      strategyId: "myActivityDelete",
      ...definition,
    });

  const targets = Object.freeze({
    comments: createMyActivityDeleteTarget({
      id: "comments",
      labelKey: "targetCommentsLabel",
      labelFallback: "YouTube comments",
      enabled: true,
      pageUrl:
        "https://myactivity.google.com/page?hl=en-GB&utm_medium=web&utm_source=youtube&page=youtube_comments",
      requiredUrlFragments: ["page=youtube_comments"],
      completedCountKey: "contentDeletedComments",
      completedCountFallback: "Deleted comments: $1",
      noMoreActionsKey: "contentNoMoreDeleteButtons",
      noMoreActionsFallback: "No more visible delete buttons were found.",
    }),
    commentLikes: createMyActivityDeleteTarget({
      id: "commentLikes",
      labelKey: "targetCommentLikesLabel",
      labelFallback: "Comment likes",
      enabled: true,
      pageUrl: "https://myactivity.google.com/page?page=youtube_comment_likes",
      requiredUrlFragments: ["page=youtube_comment_likes"],
      completedCountKey: "contentDeletedCommentLikes",
      completedCountFallback: "Deleted comment likes: $1",
      noMoreActionsKey: "contentNoMoreCommentLikes",
      noMoreActionsFallback: "No more visible comment-like delete buttons were found.",
    }),
    likes: createTarget({
      id: "likes",
      strategyId: "playlistRemove",
      labelKey: "targetLikesLabel",
      labelFallback: "Liked videos",
      enabled: true,
      pageUrl: "https://www.youtube.com/playlist?list=LL",
      supportedHost: "www.youtube.com",
      urlPrefixes: ["https://www.youtube.com/playlist", "https://youtube.com/playlist"],
      requiredUrlFragments: ["list=LL"],
      selectors: {
        actionButtons: [
          'ytd-playlist-video-renderer button[aria-label*="Action menu"]',
          'ytd-playlist-video-renderer button[aria-label*="More actions"]',
          'ytd-playlist-video-renderer button[aria-label*="Wi\\u0119cej"]',
          'ytd-playlist-video-renderer ytd-menu-renderer yt-icon-button button',
        ],
        menuItems: [
          "ytd-menu-popup-renderer ytd-menu-service-item-renderer",
          "tp-yt-paper-listbox ytd-menu-service-item-renderer",
          'tp-yt-iron-dropdown [role="menuitem"]',
        ],
        deleteButtons: [],
        confirmButtons: [],
        status: [],
        loadMore: [],
      },
      dom: {
        itemContainers: ["ytd-playlist-video-renderer", '[role="listitem"]'],
        descriptionSelectors: ["#video-title", "a#video-title", "#video-title span"],
      },
      statusPatterns: {
        pending: [],
        success: [],
        failure: [],
      },
    }),
  });

  const targetList = Object.freeze(Object.values(targets));
  const defaultTargetId = "comments";

  shared.Targets = targets;
  shared.DEFAULT_TARGET_ID = defaultTargetId;
  shared.getTargetById = (targetId) => targets[targetId] || null;
  shared.getDefaultTarget = () => shared.getTargetById(defaultTargetId);
  shared.isRunnableTarget = (target) => Boolean(target && target.enabled !== false);
  shared.getTargets = () => targetList;
  shared.getRunnableTargets = () => targetList.filter(shared.isRunnableTarget);
  shared.getTargetLabel = (
    target,
    translate = (_key, _substitutions, fallback = "") => fallback
  ) => (target ? translate(target.labelKey, undefined, target.labelFallback || target.id) : "");
  shared.matchesTargetUrl = (target, url) =>
    Boolean(
      target &&
        typeof url === "string" &&
        target.urlPrefixes.some((prefix) => url.startsWith(prefix)) &&
        target.requiredUrlFragments.every((fragment) => url.includes(fragment))
    );
  shared.getTargetByUrl = (url) =>
    targetList.find((target) => shared.matchesTargetUrl(target, url)) || null;
  shared.getRunnableTargetByUrl = (url) => {
    const target = shared.getTargetByUrl(url);
    return shared.isRunnableTarget(target) ? target : null;
  };
  shared.isSupportedUrl = (url) => Boolean(shared.getTargetByUrl(url));
  shared.isRunnableUrl = (url) => Boolean(shared.getRunnableTargetByUrl(url));
})();
