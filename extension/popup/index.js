(() => {
  const shared = globalThis.YtActivityCleanerShared;
  const popup = (globalThis.YtActivityCleanerPopup =
    globalThis.YtActivityCleanerPopup || {});
  const { ext, Messages } = shared;
  const t = shared.t || ((_key, _substitutions, fallback = "") => fallback);

  shared.localizeDocument?.();
  popup.renderAppMeta?.();
  popup.setSettingsPanelOpen(false);
  popup.renderQuickLinks?.();
  popup.bindSettingsForm?.();
  popup.bindPanelControls?.();

  popup.elements.startButton.addEventListener("click", async () => {
    try {
      const context = await popup.resolveTargetContext();
      if (context.activeTabSupported && !context.activeTabRunnable) {
        throw new Error(
          t(
            "popupTargetNotEnabledYet",
            popup.getTargetLabel(context.activeTabTarget),
            `${popup.getTargetLabel(context.activeTabTarget)} cleanup is not enabled yet.`
          )
        );
      }

      if (!context.activeTabRunnable || !context.activeTab?.id) {
        throw new Error(
          t(
            "popupOpenCommentsPageInCurrentTabFirst",
            undefined,
            "Open a supported cleaner page in the current tab first."
          )
        );
      }

      await popup.saveSettingsFromForm(
        t(
          "popupSettingsSavedStarting",
          undefined,
          "Settings saved. Starting cleaner with the saved values."
        )
      );
      await popup.setCleanerTab(context.activeTab.id);
      const { tab, response } = await popup.sendMessageToTab(context.activeTab, {
        type: Messages.START_CLEANER,
      });
      if (response?.ok === false) {
        throw new Error(
          response.error ||
            t("popupCouldNotStartCleaner", undefined, "Could not start cleaner.")
        );
      }

      popup.renderStatus(response?.status, {
        ...context,
        targetTab: tab,
        isTrackedTab: true,
        isUsingActiveTab: true,
      });
    } catch (error) {
      const context = await popup.resolveTargetContext();

      if (popup.isMissingReceiverError(error)) {
        const message = popup.getDisconnectedPageMessage(
          context.activeTab,
          Boolean(context.isTrackedTab && context.isUsingActiveTab)
        );
        popup.renderDisconnectedPage(message, context);
        popup.renderSettingsState(message, true);
        return;
      }

      popup.renderError(error.message, context);
      popup.renderSettingsState(
        t(
          "popupCouldNotStartCleanerPrefix",
          error.message,
          `Could not start cleaner: ${error.message}`
        ),
        true
      );
      console.error(error);
    }
  });

  popup.elements.stopButton.addEventListener("click", async () => {
    try {
      const context = await popup.resolveTargetContext();
      if (!context.targetTab) {
        throw new Error(
          t(
            "popupNoCleanerTabConnected",
            undefined,
            "No cleaner tab is connected right now."
          )
        );
      }

      const { tab, response } = await popup.sendMessageToTab(context.targetTab, {
        type: Messages.STOP_CLEANER,
      });
      popup.renderStatus(response?.status, {
        ...context,
        targetTab: tab,
      });
    } catch (error) {
      popup.renderError(error.message, await popup.resolveTargetContext());
      console.error(error);
    }
  });

  popup.loadSavedSettings?.()
    .then(() => undefined)
    .catch((error) => {
      popup.renderSettingsState(
        t(
          "popupCouldNotLoadSettings",
          error.message,
          `Could not load settings: ${error.message}`
        ),
        true
      );
      console.error(error);
    });

  popup.startStatusPolling?.(1000);
})();
