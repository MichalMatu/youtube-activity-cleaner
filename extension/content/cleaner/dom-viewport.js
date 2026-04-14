(() => {
  const content = (globalThis.YtActivityCleanerContent =
    globalThis.YtActivityCleanerContent || {});
  const viewportMarginPx = 80;

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
      return {
        top: Number.POSITIVE_INFINITY,
        bottom: Number.POSITIVE_INFINITY,
        distance: Number.POSITIVE_INFINITY,
        inViewport: false,
      };
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
})();
