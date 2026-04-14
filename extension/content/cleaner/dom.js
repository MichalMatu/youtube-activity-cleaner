(() => {
  const content = (globalThis.YtActivityCleanerContent =
    globalThis.YtActivityCleanerContent || {});

  const defaultDomConfig = Object.freeze({
    itemContainers: ['[role="listitem"]', 'c-wiz[jsname="Ttx95"]', "c-wiz", "li"],
    descriptionSelectors: [".QTGV3c", ".SiEggd"],
  });
  const loadMoreLabelPatterns = Object.freeze([/^more$/, /^więcej$/]);
  const blockingDialogPatterns = Object.freeze([
    /manage verification on my activity/,
    /zarządzaj weryfikacją na stronie moja aktywność/,
    /zarzadzaj weryfikacja na stronie moja aktywnosc/,
    /extra verification/,
    /dodatkową weryfikację/,
    /dodatkowa weryfikacje/,
  ]);
  const dismissDialogLabelPatterns = Object.freeze([
    /^close$/,
    /^zamknij$/,
    /^cancel$/,
    /^anuluj$/,
  ]);
  const viewportMarginPx = 80;

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

  content.getElementViewportMetrics = (element) => {
    const ownRect = element?.getBoundingClientRect?.();
    const itemContainer =
      content.getItemContainer && element ? content.getItemContainer(element) : null;
    const fallbackRect =
      itemContainer && itemContainer !== element ? itemContainer.getBoundingClientRect?.() : null;
    const rect =
      ownRect && (ownRect.width > 0 || ownRect.height > 0 || ownRect.top || ownRect.bottom)
        ? ownRect
        : fallbackRect;
    if (!rect) {
      return { top: Number.POSITIVE_INFINITY, bottom: Number.POSITIVE_INFINITY, distance: Number.POSITIVE_INFINITY, inViewport: false };
    }

    const viewportHeight =
      globalThis.window?.innerHeight || document.documentElement?.clientHeight || 0;
    const inViewport =
      rect.bottom > viewportMarginPx &&
      rect.top < Math.max(viewportMarginPx, viewportHeight - viewportMarginPx);
    let distance = 0;

    if (!inViewport) {
      if (rect.top >= viewportHeight) {
        distance = rect.top - viewportHeight;
      } else if (rect.bottom <= 0) {
        distance = Math.abs(rect.bottom);
      } else if (rect.top < viewportMarginPx) {
        distance = Math.abs(rect.top - viewportMarginPx);
      } else {
        distance = Math.abs(rect.bottom - (viewportHeight - viewportMarginPx));
      }
    }

    return {
      top: rect.top,
      bottom: rect.bottom,
      distance,
      inViewport,
    };
  };

  content.sortByViewportPriority = (elements) =>
    [...elements].sort((left, right) => {
      const leftMetrics = content.getElementViewportMetrics(left);
      const rightMetrics = content.getElementViewportMetrics(right);

      if (leftMetrics.inViewport !== rightMetrics.inViewport) {
        return leftMetrics.inViewport ? -1 : 1;
      }

      if (leftMetrics.distance !== rightMetrics.distance) {
        return leftMetrics.distance - rightMetrics.distance;
      }

      return leftMetrics.top - rightMetrics.top;
    });

  content.isInViewport = (element) => content.getElementViewportMetrics(element).inViewport;

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

  content.getViewportMatches = (selectors) =>
    content
      .sortByViewportPriority(content.getVisibleMatches(selectors))
      .filter(content.isInViewport);

  content.getViewportConnectedMatches = (selectors) =>
    content
      .sortByViewportPriority(content.getConnectedMatches(selectors))
      .filter(content.isInViewport);

  content.getVisibleDeleteButtons = () =>
    content.getViewportMatches(content.getSelectorList("deleteButtons")).length
      ? content.getViewportMatches(content.getSelectorList("deleteButtons"))
      : content.getViewportConnectedMatches(content.getSelectorList("deleteButtons"));

  content.getVisibleActionButtons = () =>
    content.getViewportMatches(content.getSelectorList("actionButtons")).length
      ? content.getViewportMatches(content.getSelectorList("actionButtons"))
      : content.getViewportConnectedMatches(content.getSelectorList("actionButtons"));

  content.getVisibleMenuItems = () =>
    content.getViewportMatches(content.getSelectorList("menuItems"));

  content.isConfirmLabel = (element) => {
    const label = content.getElementLabel(element);

    return label === "delete" || label === "usuń" || label === "usun";
  };

  content.isLoadMoreLabel = (element) =>
    loadMoreLabelPatterns.some((pattern) => pattern.test(content.getElementLabel(element)));

  content.getConfirmButton = () => {
    const buttons = content
      .getVisibleMatches(content.getSelectorList("confirmButtons"))
      .filter(content.isConfirmLabel);

    return (
      buttons.find((element) => element.closest('[role="dialog"]')) || buttons[0] || null
    );
  };

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

  content.getLoadMoreButton = () => {
    const matches = content.getViewportMatches(content.getSelectorList("loadMore"));

    return (
      matches.find(
        (element) =>
          element.getAttribute?.("jsname") === "T8gEfd" || content.isLoadMoreLabel(element)
      ) || null
    );
  };

  content.getKnownBlockingDialog = () =>
    content
      .getVisibleMatches(['[role="dialog"]', '[aria-modal="true"]'])
      .find((dialog) =>
        blockingDialogPatterns.some((pattern) =>
          pattern.test(content.getElementLabel(dialog))
        )
      ) || null;

  content.dismissKnownBlockingDialog = async () => {
    const dialog = content.getKnownBlockingDialog();
    if (!dialog) {
      return false;
    }

    const dismissButton = [...dialog.querySelectorAll('button, [role="button"]')]
      .filter(content.isVisible)
      .find((element) =>
        dismissDialogLabelPatterns.some((pattern) =>
          pattern.test(content.getElementLabel(element))
        )
      );

    if (!dismissButton) {
      return false;
    }

    return content.clickElement(dismissButton);
  };

  content.getDeleteButtonFromItemContainer = (itemContainer) => {
    if (!itemContainer?.isConnected) {
      return null;
    }

    return (
      content
        .getVisibleDeleteButtons()
        .find((button) => content.getItemContainer(button) === itemContainer) || null
    );
  };

  content.getActionButtonFromItemContainer = (itemContainer) => {
    if (!itemContainer?.isConnected) {
      return null;
    }

    return (
      content
        .getVisibleActionButtons()
        .find((button) => content.getItemContainer(button) === itemContainer) || null
    );
  };

  content.findRetryDeleteButton = (previousButton, description) => {
    const previousContainer = content.getItemContainer(previousButton);
    const sameItemButton = content.getDeleteButtonFromItemContainer(previousContainer);
    if (sameItemButton) {
      return sameItemButton;
    }

    return (
      content
        .getVisibleDeleteButtons()
        .find((button) => content.describeItem(button) === description) ||
      content.getVisibleDeleteButtons()[0] ||
      null
    );
  };

  content.findRetryActionButton = (previousButton, description) => {
    const previousContainer = content.getItemContainer(previousButton);
    const sameItemButton = content.getActionButtonFromItemContainer(previousContainer);
    if (sameItemButton) {
      return sameItemButton;
    }

    return (
      content
        .getVisibleActionButtons()
        .find((button) => content.describeItem(button) === description) ||
      content.getVisibleActionButtons()[0] ||
      null
    );
  };
})();
