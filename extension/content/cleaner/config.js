(() => {
  const content = (globalThis.YtActivityCleanerContent =
    globalThis.YtActivityCleanerContent || {});

  content.config = Object.freeze({
    scrollStepPx: 900,
    idleRoundsLimit: 7,
    timingProfiles: Object.freeze({
      fast: Object.freeze({
        beforeClickMs: 120,
        beforeConfirmClickMs: 220,
        afterConfirmClickMs: 120,
        waitForRemovalMs: 7000,
        waitForPostClickStateMs: 2500,
        waitForBusyStateMs: 900,
        busyQuietMs: 150,
        pollMs: 100,
        allowRemovalWithoutSuccess: true,
      }),
      safe: Object.freeze({
        beforeClickMs: 320,
        beforeConfirmClickMs: 520,
        afterConfirmClickMs: 220,
        waitForRemovalMs: 12000,
        waitForPostClickStateMs: 4500,
        waitForBusyStateMs: 2200,
        busyQuietMs: 300,
        pollMs: 150,
        allowRemovalWithoutSuccess: false,
      }),
    }),
  });
})();
