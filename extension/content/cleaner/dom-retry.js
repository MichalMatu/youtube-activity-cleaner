(() => {
  const content = (globalThis.YtActivityCleanerContent =
    globalThis.YtActivityCleanerContent || {});

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
