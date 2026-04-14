(() => {
  const shared = globalThis.YtActivityCleanerShared;
  const popup = (globalThis.YtActivityCleanerPopup =
    globalThis.YtActivityCleanerPopup || {});
  const { ext, getTargetByUrl, isRunnableUrl, isSupportedUrl } = shared;
  const t = shared.t || ((_key, _substitutions, fallback = "") => fallback);
  const translateWithFallback =
    shared.translateWithFallback ||
    ((key, substitutions, fallbackTemplate) =>
      t(key, substitutions, "") || shared.formatTemplate?.(fallbackTemplate, substitutions));

  popup.getTargetByUrl = getTargetByUrl;
  popup.isSupportedUrl = isSupportedUrl;
  popup.isRunnableUrl = isRunnableUrl;
  popup.getTargetLabel = (target) =>
    target ? t(target.labelKey, undefined, target.labelFallback || target.id) : "";
  popup.getPageShortcutTargets = () =>
    (shared.getTargets?.() || Object.values(shared.Targets || {})).filter((target) =>
      Boolean(target?.pageUrl)
    );
  popup.getOpenTargetButtonLabel = (target) =>
    translateWithFallback(
      "popupOpenTargetButton",
      popup.getTargetLabel(target),
      "Open $1"
    );

  popup.renderQuickLinks = () => {
    const { quickLinksElement } = popup.elements || {};
    if (!quickLinksElement || !globalThis.document?.createElement) {
      return;
    }

    const buttons = popup.getPageShortcutTargets().map((target) => {
      const button = globalThis.document.createElement("button");
      button.type = "button";
      button.className = "secondary compact-button";
      button.dataset.targetId = target.id;
      button.textContent = popup.getOpenTargetButtonLabel(target);
      button.addEventListener("click", async () => {
        await ext.tabs.create({ url: target.pageUrl });
      });
      return button;
    });

    if (typeof quickLinksElement.replaceChildren === "function") {
      quickLinksElement.replaceChildren(...buttons);
      return;
    }

    if (Array.isArray(quickLinksElement.children)) {
      quickLinksElement.children.length = 0;
    }

    buttons.forEach((button) => {
      quickLinksElement.appendChild?.(button);
    });
  };
})();
