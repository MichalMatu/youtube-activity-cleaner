(() => {
  const shared = (globalThis.YtActivityCleanerShared =
    globalThis.YtActivityCleanerShared || {});

  const freezeArray = (values = []) => Object.freeze([...values]);

  const createTarget = (definition) =>
    Object.freeze({
      ...definition,
      urlPrefixes: freezeArray(definition.urlPrefixes),
      requiredUrlFragments: freezeArray(definition.requiredUrlFragments),
      selectors: Object.freeze({
        deleteButtons: freezeArray(definition.selectors?.deleteButtons),
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

  const targets = Object.freeze({
    comments: createTarget({
      id: "comments",
      labelKey: "targetCommentsLabel",
      labelFallback: "YouTube comments",
      enabled: true,
      pageUrl:
        "https://myactivity.google.com/page?hl=en-GB&utm_medium=web&utm_source=youtube&page=youtube_comments",
      supportedHost: "myactivity.google.com",
      urlPrefixes: ["https://myactivity.google.com/"],
      requiredUrlFragments: ["page=youtube_comments"],
      selectors: {
        deleteButtons: [
          'button[aria-label*="Delete activity item"]',
          'button[aria-label*="Delete activity"]',
          'button[aria-label*="Usu\\u0144 element aktywno\\u015bci"]',
          'button[aria-label*="Usu\\u0144 aktywno\\u015b\\u0107"]',
        ],
        confirmButtons: ['button[aria-label="Delete"]', 'button[aria-label="Usu\\u0144"]'],
        status: [
          '[jsname="PJEsad"]',
          '[jsname="vyyg5"]',
          '[role="status"]',
          '[aria-live="assertive"]',
          '[aria-live="polite"]',
        ],
        loadMore: ['button[jsname="T8gEfd"]', ".ksBjEc.lKxP2d.LQeN7"],
      },
      dom: {
        itemContainers: ['c-wiz[jsname="Ttx95"]', '[role="listitem"]', "c-wiz", "li"],
        descriptionSelectors: [".QTGV3c", ".SiEggd"],
      },
      statusPatterns: {
        pending: [/deleting now|deleting|removing|usuwanie|trwa usuwanie/],
        success: [
          /\bitem deleted\b|\bitems deleted\b|deleted successfully|usunięto|element usunięty/,
        ],
        failure: [
          /couldn.?t delete|unable to delete|failed|something went wrong|nie udało się usunąć|nie można usunąć|błąd/,
        ],
      },
    }),
    likes: createTarget({
      id: "likes",
      labelKey: "targetLikesLabel",
      labelFallback: "Liked videos",
      enabled: false,
      pageUrl: "https://www.youtube.com/playlist?list=LL",
      supportedHost: "www.youtube.com",
      urlPrefixes: ["https://www.youtube.com/playlist", "https://youtube.com/playlist"],
      requiredUrlFragments: ["list=LL"],
      selectors: {
        deleteButtons: [],
        confirmButtons: [],
        status: [],
        loadMore: [],
      },
      dom: {
        itemContainers: [],
        descriptionSelectors: [],
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
