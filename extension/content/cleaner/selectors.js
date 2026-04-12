(() => {
  const content = (globalThis.YtActivityCleanerContent =
    globalThis.YtActivityCleanerContent || {});

  const defaultSelectors = Object.freeze({
    deleteButtons: [
      'button[aria-label*="Delete activity item"]',
      'button[aria-label*="Delete activity"]',
      'button[aria-label*="Usu\\u0144 element aktywno\\u015bci"]',
      'button[aria-label*="Usu\\u0144 aktywno\\u015b\\u0107"]',
    ],
    actionButtons: [],
    menuItems: [],
    confirmButtons: ['button[aria-label="Delete"]', 'button[aria-label="Usu\\u0144"]'],
    status: [
      '[jsname="PJEsad"]',
      '[jsname="vyyg5"]',
      '[role="status"]',
      '[aria-live="assertive"]',
      '[aria-live="polite"]',
    ],
    loadMore: ['button[jsname="T8gEfd"]', ".ksBjEc.lKxP2d.LQeN7"],
  });

  content.getTargetSelectors = () => content.getTarget?.()?.selectors || defaultSelectors;

  content.getSelectorList = (key) => content.getTargetSelectors()?.[key] || [];
})();
