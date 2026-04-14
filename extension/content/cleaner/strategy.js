(() => {
  const content = (globalThis.YtActivityCleanerContent =
    globalThis.YtActivityCleanerContent || {});
  const fallbackStrategyId = "myActivityDelete";
  const strategyAliases = Object.freeze({
    comments: "myActivityDelete",
    likes: "playlistRemove",
  });
  const requiredMethods = Object.freeze([
    "describeAction",
    "findRetryAction",
    "getLoadMoreButton",
    "getCompletedCountMessage",
    "getNoMoreActionsMessage",
    "runSingleAttempt",
  ]);
  const validateStrategy = (strategyId, strategy) => {
    if (!strategy || typeof strategy !== "object") {
      throw new Error(`Cleaner strategy "${strategyId}" must be an object.`);
    }

    if (strategy.id !== strategyId) {
      throw new Error(
        `Cleaner strategy "${strategyId}" must expose the same id, got "${strategy.id || ""}".`
      );
    }

    if (
      typeof strategy.collectActionCandidates !== "function" &&
      typeof strategy.getActionButtons !== "function"
    ) {
      throw new Error(
        `Cleaner strategy "${strategyId}" must implement collectActionCandidates() or getActionButtons().`
      );
    }

    const missingMethods = requiredMethods.filter(
      (methodName) => typeof strategy[methodName] !== "function"
    );

    if (missingMethods.length) {
      throw new Error(
        `Cleaner strategy "${strategyId}" is missing methods: ${missingMethods.join(", ")}.`
      );
    }

    return strategy;
  };
  const registerStrategies = (registeredStrategies) =>
    Object.freeze(
      Object.fromEntries(
        Object.entries(registeredStrategies || {}).map(([strategyId, strategy]) => [
          strategyId,
          validateStrategy(strategyId, strategy),
        ])
      )
    );
  const normalizeStrategyId = (strategyId) =>
    strategyAliases[strategyId] || strategyId || fallbackStrategyId;
  const strategies = Object.freeze({
    ...registerStrategies(content.Strategies),
  });

  content.Strategies = strategies;
  content.normalizeStrategyId = normalizeStrategyId;
  content.getStrategyById = (strategyId) => strategies[normalizeStrategyId(strategyId)] || null;
  content.getTargetStrategy = () =>
    content.getStrategyById(
      content.getTarget()?.strategyId || content.getTarget()?.id || fallbackStrategyId
    ) || content.getStrategyById(fallbackStrategyId);
})();
