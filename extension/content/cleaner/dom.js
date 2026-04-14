(() => {
  const content = (globalThis.YtActivityCleanerContent =
    globalThis.YtActivityCleanerContent || {});

  const defaultDomConfig = Object.freeze({
    itemContainers: ['[role="listitem"]', 'c-wiz[jsname="Ttx95"]', "c-wiz", "li"],
    descriptionSelectors: [".QTGV3c", ".SiEggd"],
  });

  content.getTargetDomConfig = () => content.getTarget?.()?.dom || defaultDomConfig;

  content.normalizeText = (value) =>
    (value || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

  content.getElementLabel = (element) =>
    content.normalizeText(
      element?.innerText ||
        element?.textContent ||
        element?.getAttribute?.("aria-label") ||
        element?.getAttribute?.("title")
    );

  content.isVisible = (element) => {
    if (!element || element.disabled || !element.isConnected) {
      return false;
    }

    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);

    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== "hidden" &&
      style.display !== "none"
    );
  };

  content.getVisibleMatches = (selectors) =>
    selectors
      .flatMap((selector) => [...document.querySelectorAll(selector)])
      .filter(content.isVisible);

  content.getConnectedMatches = (selectors) =>
    selectors
      .flatMap((selector) => [...document.querySelectorAll(selector)])
      .filter((element) => element && !element.disabled && element.isConnected);

  content.clickElement = async (element) => {
    if (!element || !element.isConnected) {
      return false;
    }

    if (!(await content.pauseUntilVisible())) {
      return false;
    }

    const metrics = content.getElementViewportMetrics(element);
    if (!metrics.inViewport) {
      element.scrollIntoView({
        block: "nearest",
        inline: "nearest",
        behavior: "auto",
      });
    }

    if (!(await content.pauseAwareSleep(content.getSettingValue("beforeClickMs")))) {
      return false;
    }

    const itemContainer = content.getItemContainer(element);
    if (!content.isVisible(element) && itemContainer?.scrollIntoView) {
      itemContainer.scrollIntoView({
        block: "nearest",
        inline: "nearest",
        behavior: "auto",
      });
    }

    if (!content.isVisible(element) && !itemContainer?.isConnected) {
      return false;
    }

    element.click();
    return true;
  };

  content.describeItem = (element) => {
    if (!element || !element.isConnected) {
      return "unknown item";
    }

    const card = content.getItemContainer(element) || element.parentElement;

    const primary =
      content
        .getTargetDomConfig()
        .descriptionSelectors.map((selector) => card?.querySelector(selector)?.textContent)
        .find(Boolean) ||
      element.innerText ||
      "";

    return content.normalizeText(primary).slice(0, 120) || "unknown item";
  };

  content.hasMeaningfulDescriptionChange = (element, expectedDescription) => {
    if (!expectedDescription) {
      return false;
    }

    const currentDescription = content.describeItem(element);
    if (!currentDescription || currentDescription === "unknown item") {
      return false;
    }

    return currentDescription !== expectedDescription;
  };

  const getElementArea = (element) => {
    const rect = element?.getBoundingClientRect?.();
    if (!rect) {
      return Number.POSITIVE_INFINITY;
    }

    const width = Math.max(0, rect.width || 0);
    const height = Math.max(0, rect.height || 0);
    const area = width * height;

    return area > 0 ? area : Number.POSITIVE_INFINITY;
  };

  const getDomDepth = (element) => {
    let depth = 0;
    let current = element;

    while (current) {
      depth += 1;
      current = current.parentElement || null;
    }

    return depth;
  };

  content.getItemContainer = (element) =>
    [...new Set(
      content
        .getTargetDomConfig()
        .itemContainers.map((selector) => element?.closest(selector))
        .filter(Boolean)
    )].sort((left, right) => {
      const areaDifference = getElementArea(left) - getElementArea(right);
      if (areaDifference !== 0) {
        return areaDifference;
      }

      return getDomDepth(right) - getDomDepth(left);
    })[0] ||
    element?.parentElement ||
    null;

  content.isItemGone = (itemContainer) => {
    if (!itemContainer?.isConnected) {
      return true;
    }

    return !content.isVisible(itemContainer);
  };
})();
