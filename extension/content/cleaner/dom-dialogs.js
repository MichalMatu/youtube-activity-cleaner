(() => {
  const content = (globalThis.YtActivityCleanerContent =
    globalThis.YtActivityCleanerContent || {});

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
})();
