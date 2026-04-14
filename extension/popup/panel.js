(() => {
  const shared = globalThis.YtActivityCleanerShared;
  const popup = (globalThis.YtActivityCleanerPopup =
    globalThis.YtActivityCleanerPopup || {});
  const { ext } = shared;
  const t = shared.t || ((_key, _substitutions, fallback = "") => fallback);
  const translateWithFallback =
    shared.translateWithFallback ||
    ((key, substitutions, fallbackTemplate) =>
      t(key, substitutions, "") || shared.formatTemplate?.(fallbackTemplate, substitutions));

  popup.getAppVersion = () => ext?.runtime?.getManifest?.()?.version || "dev";

  popup.getAppMetaText = () =>
    translateWithFallback(
      "popupVersionValue",
      popup.getAppVersion(),
      `Version ${popup.getAppVersion()}`
    );

  popup.renderAppMeta = () => {
    if (popup.elements?.appMetaElement) {
      popup.elements.appMetaElement.textContent = popup.getAppMetaText();
    }
  };

  popup.setSettingsPanelOpen = (isOpen) => {
    const { settingsPanel, settingsToggleButton } = popup.elements || {};
    if (!settingsPanel || !settingsToggleButton) {
      return;
    }

    settingsPanel.hidden = !isOpen;
    settingsPanel.setAttribute("aria-hidden", String(!isOpen));
    settingsToggleButton.setAttribute("aria-expanded", String(isOpen));
  };

  popup.bindPanelControls = () => {
    popup.elements.supportButton?.addEventListener("click", async () => {
      await ext.tabs.create({ url: shared.Constants.SUPPORT_URL });
    });

    popup.elements.donateButton?.addEventListener("click", async () => {
      await ext.tabs.create({ url: shared.Constants.DONATE_URL });
    });

    popup.elements.projectBannerButton?.addEventListener("click", async () => {
      await ext.tabs.create({ url: shared.Constants.OTHER_PROJECT_URL });
    });

    popup.elements.settingsToggleButton.addEventListener("click", () => {
      popup.setSettingsPanelOpen(popup.elements.settingsPanel.hidden);
    });

    popup.elements.settingsCloseButton.addEventListener("click", () => {
      popup.setSettingsPanelOpen(false);
    });

    popup.elements.settingsPanel.addEventListener("click", (event) => {
      if (event.target === popup.elements.settingsPanel) {
        popup.setSettingsPanelOpen(false);
      }
    });

    globalThis.document?.addEventListener?.("keydown", (event) => {
      if (
        event.key === "Escape" &&
        popup.elements?.settingsPanel &&
        !popup.elements.settingsPanel.hidden
      ) {
        popup.setSettingsPanelOpen(false);
      }
    });
  };
})();
