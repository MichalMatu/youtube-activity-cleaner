(() => {
  const content = (globalThis.YtActivityCleanerContent =
    globalThis.YtActivityCleanerContent || {});

  content.config = Object.freeze({
    beforeClickMs: 650,
    beforeConfirmClickMs: 1100,
    afterConfirmClickMs: 500,
    betweenItemsMs: 3200,
    scrollPauseMs: 2200,
    scrollStepPx: 900,
    waitForRemovalMs: 25000,
    waitForPostClickStateMs: 9000,
    waitForStatusIdleMs: 12000,
    statusQuietMs: 1200,
    pollMs: 250,
    idleRoundsLimit: 7,
    failureStreakLimit: 4,
  });
})();
