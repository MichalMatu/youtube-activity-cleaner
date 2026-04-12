(() => {
  const content = (globalThis.YtActivityCleanerContent =
    globalThis.YtActivityCleanerContent || {});

  const defaultDomConfig = Object.freeze({
    itemContainers: ['c-wiz[jsname="Ttx95"]', '[role="listitem"]', "c-wiz", "li"],
    descriptionSelectors: [".QTGV3c", ".SiEggd"],
  });

  content.getTargetDomConfig = () => content.getTarget?.()?.dom || defaultDomConfig;

  content.normalizeText = (value) =>
    (value || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

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

  content.getVisibleDeleteButtons = () =>
    content.getVisibleMatches(content.getSelectorList("deleteButtons"));

  content.isConfirmLabel = (element) => {
    const label = content.normalizeText(
      element.innerText || element.textContent || element.getAttribute("aria-label")
    );

    return label === "delete" || label === "usuń" || label === "usun";
  };

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

    element.scrollIntoView({
      block: "center",
      inline: "center",
      behavior: "auto",
    });

    if (!(await content.pauseAwareSleep(content.getSettingValue("beforeClickMs")))) {
      return false;
    }

    if (!content.isVisible(element)) {
      return false;
    }

    element.click();
    return true;
  };

  content.describeItem = (element) => {
    if (!element || !element.isConnected) {
      return "unknown item";
    }

    const card =
      content.getTargetDomConfig()
        .itemContainers.map((selector) => element.closest(selector))
        .find(Boolean) || element.parentElement;

    const primary =
      content
        .getTargetDomConfig()
        .descriptionSelectors.map((selector) => card?.querySelector(selector)?.textContent)
        .find(Boolean) ||
      element.innerText ||
      "";

    return content.normalizeText(primary).slice(0, 120) || "unknown item";
  };

  content.getItemContainer = (element) =>
    content
      .getTargetDomConfig()
      .itemContainers.map((selector) => element?.closest(selector))
      .find(Boolean) ||
    element?.parentElement ||
    null;

  content.isItemGone = (itemContainer) => {
    if (!itemContainer?.isConnected) {
      return true;
    }

    return !content.isVisible(itemContainer);
  };

  content.getLoadMoreButton = () =>
    content.getVisibleMatches(content.getSelectorList("loadMore"))[0] || null;

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
})();
