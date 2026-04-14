(() => {
  const content = (globalThis.YtActivityCleanerContent =
    globalThis.YtActivityCleanerContent || {});

  const DEFAULT_DEBUG_SELECTOR = 'button, [role="button"], [role="menuitem"], a[href]';
  const DEBUG_EVENT_LIMIT = 60;
  const delayedUpdateHintPatterns = [
    /may take a few hours/i,
    /może minąć kilka godzin/i,
    /moze minac kilka godzin/i,
  ];

  const truncate = (value, limit = 160) => {
    const text = String(value || "");
    return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
  };

  const summarizeElement = (element) => {
    if (!element) {
      return "";
    }

    const tagName = element.tagName?.toLowerCase?.() || "unknown";
    const id = element.id ? `#${element.id}` : "";
    const className =
      typeof element.className === "string" && element.className.trim()
        ? `.${element.className.trim().replace(/\s+/g, ".")}`
        : "";

    return `${tagName}${id}${className}`;
  };

  const appendDebugEvent = (events, type, details = {}) => {
    if (events.length >= DEBUG_EVENT_LIMIT) {
      return;
    }

    events.push({
      time: new Date().toISOString(),
      type,
      ...details,
    });
  };

  const safeQuerySelectorAll = (selector) => {
    try {
      return [...document.querySelectorAll(selector)];
    } catch (_error) {
      return [];
    }
  };

  const getElementsForKey = (key) => {
    const seen = new Set();

    return (content.getSelectorList?.(key) || [])
      .flatMap((selector) => safeQuerySelectorAll(selector))
      .filter((element) => {
        if (!element || seen.has(element)) {
          return false;
        }

        seen.add(element);
        return true;
      });
  };

  const getMatchingSelectors = (element, key) =>
    (content.getSelectorList?.(key) || []).filter((selector) => {
      try {
        return Boolean(element?.matches?.(selector));
      } catch (_error) {
        return false;
      }
    });

  const hasDelayedRemovalHint = () =>
    delayedUpdateHintPatterns.some((pattern) => pattern.test(document.body?.innerText || ""));

  content.collectDebugCandidates = ({
    limit = 40,
    selector = DEFAULT_DEBUG_SELECTOR,
  } = {}) => {
    const target = content.getPageTarget?.() || content.getTarget?.();
    const candidates = [...document.querySelectorAll(selector)]
      .filter((element) => content.isVisible?.(element))
      .slice(0, limit)
      .map((element, index) => ({
        index: index + 1,
        tag: element.tagName?.toLowerCase?.() || "",
        role: element.getAttribute?.("role") || "",
        ariaLabel: truncate(element.getAttribute?.("aria-label") || ""),
        title: truncate(element.getAttribute?.("title") || ""),
        text: truncate(
          content.normalizeText?.(element.innerText || element.textContent || "") || ""
        ),
        href: truncate(element.getAttribute?.("href") || ""),
        jsname: truncate(element.getAttribute?.("jsname") || ""),
        testId: truncate(element.getAttribute?.("data-testid") || ""),
        summary: summarizeElement(element),
        parent: summarizeElement(element.parentElement),
      }));

    return {
      targetId: target?.id || "",
      pageTitle: document.title || "",
      url: window.location.href,
      count: candidates.length,
      selector,
      candidates,
    };
  };

  content.logDebugCandidates = (options) => {
    const snapshot = content.collectDebugCandidates(options);

    console.log("YtActivityCleaner debug snapshot", {
      targetId: snapshot.targetId,
      pageTitle: snapshot.pageTitle,
      url: snapshot.url,
      count: snapshot.count,
      selector: snapshot.selector,
    });
    console.table(snapshot.candidates);

    return snapshot;
  };

  const summarizeCleanerCandidate = (element, index) => {
    const metrics = content.getElementViewportMetrics?.(element) || {};

    return {
      index: index + 1,
      summary: summarizeElement(element),
      label: truncate(content.getElementLabel?.(element) || ""),
      item: truncate(content.describeItem?.(element) || ""),
      top: Number.isFinite(metrics.top) ? Math.round(metrics.top) : "",
      bottom: Number.isFinite(metrics.bottom) ? Math.round(metrics.bottom) : "",
      inViewport: Boolean(metrics.inViewport),
      distance:
        Number.isFinite(metrics.distance) && metrics.distance !== 0
          ? Math.round(metrics.distance)
          : "",
    };
  };

  content.collectCleanerCandidates = ({ limit = 8 } = {}) => ({
    targetId: content.getPageTarget?.()?.id || content.getTarget?.()?.id || "",
    deleteButtons: (content.getVisibleDeleteButtons?.() || [])
      .slice(0, limit)
      .map(summarizeCleanerCandidate),
    actionButtons: (content.getVisibleActionButtons?.() || [])
      .slice(0, limit)
      .map(summarizeCleanerCandidate),
    menuItems: (content.getVisibleMenuItems?.() || [])
      .slice(0, limit)
      .map(summarizeCleanerCandidate),
    loadMore: ((content.getLoadMoreButton?.() && [content.getLoadMoreButton()]) || [])
      .map(summarizeCleanerCandidate),
  });

  content.logCleanerCandidates = (options) => {
    const snapshot = content.collectCleanerCandidates(options);

    console.log("YtActivityCleaner cleaner candidates", snapshot);
    return snapshot;
  };

  content.collectPageSignals = () => {
    const deleteButtons = getElementsForKey("deleteButtons");
    const confirmButtons = getElementsForKey("confirmButtons");
    const statusNodes = getElementsForKey("status");
    const loadMoreButtons = getElementsForKey("loadMore");
    const blockingDialogs = safeQuerySelectorAll('[role="dialog"], [aria-modal="true"]');

    return {
      targetId: content.getPageTarget?.()?.id || content.getTarget?.()?.id || "",
      url: window.location.href,
      title: document.title || "",
      delayedUpdateHint: hasDelayedRemovalHint(),
      counts: {
        deleteButtons: deleteButtons.length,
        visibleDeleteButtons: deleteButtons.filter((element) => content.isVisible?.(element))
          .length,
        confirmButtons: confirmButtons.length,
        visibleConfirmButtons: confirmButtons.filter((element) => content.isVisible?.(element))
          .length,
        statusNodes: statusNodes.length,
        visibleStatusNodes: statusNodes.filter((element) => content.isVisible?.(element)).length,
        loadMoreButtons: loadMoreButtons.length,
        blockingDialogs: blockingDialogs.length,
      },
      sample: {
        firstDeleteButton:
          (content.getVisibleDeleteButtons?.() || []).slice(0, 1).map((element) => ({
            label: truncate(content.getElementLabel?.(element) || ""),
            description: truncate(content.describeItem?.(element) || ""),
            selectors: getMatchingSelectors(element, "deleteButtons"),
          }))[0] || null,
        statusMessages: content.getStatusMessages?.() || [],
      },
    };
  };

  content.logPageSignals = () => {
    const snapshot = content.collectPageSignals();
    console.log("YtActivityCleaner page signals", snapshot);
    return snapshot;
  };

  content.probeDeleteAttempt = async ({
    index = 0,
    observeMs = 5000,
    pollMs = 200,
    performClick = true,
  } = {}) => {
    const button = (content.getVisibleDeleteButtons?.() || [])[index] || null;

    if (!button) {
      const result = {
        ok: false,
        error: "No visible delete button found for the requested index.",
        pageSignals: content.collectPageSignals(),
      };
      console.warn("YtActivityCleaner delete probe", result);
      return result;
    }

    const itemContainer = content.getItemContainer?.(button) || null;
    const events = [];
    const buildSnapshot = () => ({
      buttonConnected: Boolean(button?.isConnected),
      buttonVisible: Boolean(content.isVisible?.(button)),
      buttonLabel: truncate(content.getElementLabel?.(button) || ""),
      buttonSelectors: getMatchingSelectors(button, "deleteButtons"),
      itemConnected: Boolean(itemContainer?.isConnected),
      itemVisible: Boolean(content.isVisible?.(itemContainer)),
      itemDescription: truncate(content.describeItem?.(itemContainer || button) || ""),
      confirmVisible: Boolean(content.getConfirmButton?.()),
      blockingDialogVisible: Boolean(content.getKnownBlockingDialog?.()),
      statusMessages: content.getStatusMessages?.() || [],
      scrollTop:
        content.scrollRoot?.scrollTop ||
        document.scrollingElement?.scrollTop ||
        document.documentElement?.scrollTop ||
        0,
    });

    const result = {
      ok: true,
      targetId: content.getPageTarget?.()?.id || content.getTarget?.()?.id || "",
      url: window.location.href,
      title: document.title || "",
      delayedUpdateHint: hasDelayedRemovalHint(),
      performClick,
      candidate: {
        index,
        label: truncate(content.getElementLabel?.(button) || ""),
        description: truncate(content.describeItem?.(button) || ""),
        selectors: getMatchingSelectors(button, "deleteButtons"),
        viewport: content.getElementViewportMetrics?.(button) || {},
      },
      pageSignals: content.collectPageSignals(),
      events,
    };

    let lastSignature = "";
    const pushSnapshot = (type) => {
      const snapshot = buildSnapshot();
      const signature = JSON.stringify(snapshot);

      if (type === "poll" && signature === lastSignature) {
        return;
      }

      lastSignature = signature;
      appendDebugEvent(events, type, snapshot);
    };

    const observer = new MutationObserver((mutations) => {
      mutations.slice(0, 5).forEach((mutation) => {
        appendDebugEvent(events, "mutation", {
          mutationType: mutation.type,
          target: summarizeElement(mutation.target),
          attributeName: mutation.attributeName || "",
          addedNodes: mutation.addedNodes?.length || 0,
          removedNodes: mutation.removedNodes?.length || 0,
          text: truncate(mutation.target?.textContent || "", 120),
        });
      });
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: false,
    });

    pushSnapshot("before");

    if (performClick) {
      const clicked = await content.clickElement(button);
      appendDebugEvent(events, "click", { clicked });
      pushSnapshot("after_click");
    }

    const deadline = Date.now() + observeMs;
    while (Date.now() < deadline) {
      await content.sleep?.(pollMs);
      pushSnapshot("poll");
    }

    observer.disconnect();
    result.finishedAt = new Date().toISOString();
    result.final = buildSnapshot();

    console.log("YtActivityCleaner delete probe", result);
    return result;
  };

  content.getDebugState = () => content.getCleanerStatus?.() || {};

  content.logDebugState = () => {
    const snapshot = content.getDebugState();
    console.log("YtActivityCleaner cleaner state", snapshot);
    return snapshot;
  };

  globalThis.YtActivityCleanerDebug = Object.freeze({
    collectCandidates: (options) => content.collectDebugCandidates(options),
    logCandidates: (options) => content.logDebugCandidates(options),
    getCleanerCandidates: (options) => content.collectCleanerCandidates(options),
    logCleanerCandidates: (options) => content.logCleanerCandidates(options),
    getPageSignals: () => content.collectPageSignals(),
    logPageSignals: () => content.logPageSignals(),
    probeDeleteAttempt: (options) => content.probeDeleteAttempt(options),
    getState: () => content.getDebugState(),
    logState: () => content.logDebugState(),
  });
})();
