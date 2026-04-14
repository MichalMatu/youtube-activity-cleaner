(() => {
  const content = (globalThis.YtActivityCleanerContent =
    globalThis.YtActivityCleanerContent || {});
  content.runCleaner = async () => {
    await content.prepareCleanerRun();
    await content.runCleanerLoop();
    await content.finalizeCleanerRun();
  };
})();
