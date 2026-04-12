(() => {
  const content = (globalThis.YtActivityCleanerContent =
    globalThis.YtActivityCleanerContent || {});

  const DEFAULT_DEBUG_SELECTOR = 'button, [role="button"], [role="menuitem"], a[href]';

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

  globalThis.YtActivityCleanerDebug = Object.freeze({
    collectCandidates: (options) => content.collectDebugCandidates(options),
    logCandidates: (options) => content.logDebugCandidates(options),
  });
})();
