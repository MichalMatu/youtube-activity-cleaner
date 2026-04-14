(() => {
  const content = (globalThis.YtActivityCleanerContent =
    globalThis.YtActivityCleanerContent || {});

  content.isActionCandidate = (value) =>
    Boolean(
      value &&
        typeof value === "object" &&
        ("element" in value ||
          "itemContainer" in value ||
          "description" in value ||
          "kind" in value ||
          "metadata" in value)
    );

  content.createActionCandidate = ({
    element = null,
    itemContainer = null,
    description = "",
    kind = "action",
    metadata = null,
  } = {}) =>
    Object.freeze({
      element,
      itemContainer,
      description,
      kind,
      metadata,
    });

  content.getCandidateElement = (candidate) => {
    if (!candidate) {
      return null;
    }

    return content.isActionCandidate(candidate) ? candidate.element || null : candidate;
  };

  content.getCandidateItemContainer = (candidate) => {
    if (content.isActionCandidate(candidate) && candidate.itemContainer) {
      return candidate.itemContainer;
    }

    const element = content.getCandidateElement(candidate);
    return element ? content.getItemContainer?.(element) || null : null;
  };

  content.getCandidateDescription = (candidate) => {
    if (content.isActionCandidate(candidate) && candidate.description) {
      return candidate.description;
    }

    const itemContainer = content.getCandidateItemContainer(candidate);
    const describable = itemContainer || content.getCandidateElement(candidate);
    return describable ? content.describeItem?.(describable) || "" : "";
  };

  content.toActionCandidate = (element, overrides = {}) => {
    if (!element) {
      return null;
    }

    const itemContainer =
      overrides.itemContainer ?? content.getItemContainer?.(element) ?? null;
    const description =
      overrides.description ?? content.describeItem?.(itemContainer || element) ?? "";

    return content.createActionCandidate({
      element,
      itemContainer,
      description,
      kind: overrides.kind ?? "action",
      metadata: overrides.metadata ?? null,
    });
  };

  content.resolveActionCandidate = (candidate, overrides = {}) => {
    if (!candidate) {
      return null;
    }

    if (!content.isActionCandidate(candidate)) {
      return content.toActionCandidate(candidate, overrides);
    }

    const element = candidate.element || overrides.element || null;
    const itemContainer =
      candidate.itemContainer ??
      overrides.itemContainer ??
      (element ? content.getItemContainer?.(element) || null : null);
    const description =
      candidate.description ||
      overrides.description ||
      (element ? content.describeItem?.(itemContainer || element) || "" : "");

    return content.createActionCandidate({
      element,
      itemContainer,
      description,
      kind: candidate.kind || overrides.kind || "action",
      metadata: candidate.metadata || overrides.metadata || null,
    });
  };

  content.collectActionCandidates = (strategy = content.getTargetStrategy?.()) => {
    if (!strategy) {
      return [];
    }

    if (typeof strategy.collectActionCandidates === "function") {
      return strategy
        .collectActionCandidates()
        .map((candidate) =>
          content.resolveActionCandidate(candidate, { kind: strategy.id || "action" })
        )
        .filter(Boolean);
    }

    const actionButtons =
      typeof strategy.getActionButtons === "function" ? strategy.getActionButtons() : [];

    return actionButtons
      .map((actionButton) =>
        content.toActionCandidate(actionButton, {
          description:
            typeof strategy.describeAction === "function"
              ? strategy.describeAction(actionButton)
              : undefined,
          kind: strategy.id || "action",
        })
      )
      .filter(Boolean);
  };

  content.getFirstActionCandidate = (strategy = content.getTargetStrategy?.()) =>
    content.collectActionCandidates(strategy)[0] || null;
})();
