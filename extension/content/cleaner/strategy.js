(() => {
  const content = (globalThis.YtActivityCleanerContent =
    globalThis.YtActivityCleanerContent || {});
  const fallbackStrategyId = "comments";
  const strategies = Object.freeze({
    ...(content.Strategies || {}),
  });

  content.Strategies = strategies;
  content.getStrategyById = (strategyId) => strategies[strategyId] || null;
  content.getTargetStrategy = () =>
    content.getStrategyById(
      content.getTarget()?.strategyId || content.getTarget()?.id || fallbackStrategyId
    ) || content.getStrategyById(fallbackStrategyId);
})();
