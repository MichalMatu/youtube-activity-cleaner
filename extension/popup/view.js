(() => {
  const shared = globalThis.YtActivityCleanerShared;
  const popup = (globalThis.YtActivityCleanerPopup =
    globalThis.YtActivityCleanerPopup || {});
  const t = shared?.t || ((_key, _substitutions, fallback = "") => fallback);

  popup.elements = {
    pageStateElement: document.querySelector("#page-state"),
    tabStateElement: document.querySelector("#tab-state"),
    runStateElement: document.querySelector("#run-state"),
    powerStateElement: document.querySelector("#power-state"),
    debugStateElement: document.querySelector("#debug-state"),
    settingsStateElement: document.querySelector("#settings-state"),
    settingsPreviewElement: document.querySelector("#settings-preview"),
    deletedCountElement: document.querySelector("#deleted-count"),
    attemptedCountElement: document.querySelector("#attempted-count"),
    failedCountElement: document.querySelector("#failed-count"),
    startButton: document.querySelector("#start-button"),
    stopButton: document.querySelector("#stop-button"),
    openCommentsPageButton: document.querySelector("#open-comments-page-button"),
    openLikedVideosPageButton: document.querySelector("#open-liked-videos-page-button"),
    supportButton: document.querySelector("#support-button"),
    donateButton: document.querySelector("#donate-button"),
    appMetaElement: document.querySelector("#app-meta"),
    settingsPanel: document.querySelector("#settings-panel"),
    settingsToggleButton: document.querySelector("#settings-toggle-button"),
    settingsCloseButton: document.querySelector("#settings-close-button"),
    settingsForm: document.querySelector("#settings-form"),
    resetSettingsButton: document.querySelector("#reset-settings-button"),
    speedProfileSelect: document.querySelector("#speed-profile"),
    betweenItemsSecondsInput: document.querySelector("#between-items-seconds"),
    scrollPauseSecondsInput: document.querySelector("#scroll-pause-seconds"),
    retryLimitInput: document.querySelector("#retry-limit"),
    retryBackoffSecondsInput: document.querySelector("#retry-backoff-seconds"),
    failureStreakLimitInput: document.querySelector("#failure-streak-limit"),
  };

  popup.setButtonsState = ({ canStart, canStop }) => {
    popup.elements.startButton.disabled = !canStart;
    popup.elements.stopButton.disabled = !canStop;
  };

  popup.renderPowerState = (status) => {
    if (status?.keepAwakeActive) {
      popup.elements.powerStateElement.textContent = t(
        "popupKeepAwakeEnabled",
        undefined,
        "Keep-awake is enabled. Chrome should keep the display awake while cleaning runs."
      );
      return;
    }

    popup.elements.powerStateElement.textContent = t(
      "popupKeepAwakeAuto",
      undefined,
      "Keep-awake will be enabled automatically while cleaning is running."
    );
  };

  popup.renderDebugState = (message, isError = false) => {
    popup.elements.debugStateElement.textContent = message;
    popup.elements.debugStateElement.style.color = isError ? "#fca5a5" : "#fcd34d";
  };

  popup.renderStatus = (status, context) => {
    const {
      activeTab,
      activeTabSupported,
      activeTabTarget,
      targetTab,
      isTrackedTab,
      isUsingActiveTab,
      canStartFromActiveTab,
    } = context;
    const targetTabTarget = popup.getTargetByUrl?.(targetTab?.url);
    const onSupportedPage = popup.isSupportedUrl(targetTab?.url);
    const currentTargetLabel = popup.getTargetLabel(targetTabTarget || activeTabTarget);

    if (onSupportedPage) {
      popup.elements.pageStateElement.textContent = isUsingActiveTab
        ? t("popupPageReadyCurrentTarget", currentTargetLabel, `Ready on: ${currentTargetLabel}.`)
        : t(
            "popupPageConnectedOtherTabTarget",
            currentTargetLabel,
            `Connected to a ${currentTargetLabel} cleaner tab in another tab.`
          );
      popup.elements.tabStateElement.textContent = isUsingActiveTab
        ? t("popupTabUsingCurrent", undefined, "Using the current tab for cleaner commands.")
        : t(
            "popupTabUsingTitle",
            targetTab?.title ||
              t("popupFallbackTabTitleTarget", currentTargetLabel, `${currentTargetLabel} tab`),
            `Using: ${targetTab?.title || `${currentTargetLabel} tab`}`
          );
    } else if (popup.isSupportedUrl(activeTab?.url)) {
      if (canStartFromActiveTab) {
        popup.elements.pageStateElement.textContent = t(
          "popupPageReadyStartCurrentTab",
          undefined,
          "Ready to start on the current tab."
        );
        popup.elements.tabStateElement.textContent = t(
          "popupTabStartAttachesCurrent",
          undefined,
          "Start will attach the cleaner to this tab."
        );
      } else {
        popup.elements.pageStateElement.textContent = t(
          "popupPageDetectedTarget",
          popup.getTargetLabel(activeTabTarget),
          `Detected page: ${popup.getTargetLabel(activeTabTarget)}.`
        );
        popup.elements.tabStateElement.textContent = t(
          "popupTargetComingSoon",
          popup.getTargetLabel(activeTabTarget),
          `${popup.getTargetLabel(activeTabTarget)} cleanup is planned, but it is not enabled yet.`
        );
      }
    } else {
      popup.elements.pageStateElement.textContent = t(
        "popupPageOpenCommentsPrompt",
        undefined,
        "Open Google My Activity -> Your YouTube comments."
      );
      popup.elements.tabStateElement.textContent = t(
        "popupTabNoConnectedCleaner",
        undefined,
        "No connected cleaner tab was found right now."
      );
    }

    popup.elements.deletedCountElement.textContent = String(status?.deleted || 0);
    popup.elements.attemptedCountElement.textContent = String(status?.attempted || 0);
    popup.elements.failedCountElement.textContent = String(status?.failed || 0);
    popup.renderPowerState(status);

    if (status?.retryAttempt > 0 && status?.retryDelayMs > 0) {
      popup.renderDebugState(
        t(
          "popupRetryScheduled",
          [status.retryAttempt, (status.retryDelayMs / 1000).toFixed(1)],
          `Retry ${status.retryAttempt} scheduled in ${(status.retryDelayMs / 1000).toFixed(1)}s.`
        )
      );
    } else if (status?.paused) {
      popup.renderDebugState(
        t(
          "popupPausedHidden",
          undefined,
          "Paused because the cleaner tab is not visible."
        )
      );
    } else if (status?.lastError) {
      popup.renderDebugState(
        t("popupLastIssue", status.lastError, `Last issue: ${status.lastError}`),
        true
      );
    } else if (isTrackedTab && !isUsingActiveTab) {
      popup.renderDebugState(
        t(
          "popupMonitorNeedsVisible",
          undefined,
          "You can monitor status here, but the cleaner tab still needs to stay visible."
        )
      );
    } else {
      popup.renderDebugState(
        t("popupNoRetriesOrErrors", undefined, "No active retries or errors.")
      );
    }

    if (!onSupportedPage) {
      popup.elements.runStateElement.textContent =
        canStartFromActiveTab
          ? t(
              "popupStartAvailableSupportedTab",
              undefined,
              "Start is available on the current supported tab."
            )
          : activeTabSupported
            ? t(
                "popupTargetNotEnabledYet",
                popup.getTargetLabel(activeTabTarget),
                `${popup.getTargetLabel(activeTabTarget)} cleanup is not enabled yet.`
              )
          : t(
              "popupOnlyWorksOnCommentsPage",
              undefined,
              "This extension works only on the YouTube comments page."
            );
      popup.setButtonsState({ canStart: canStartFromActiveTab, canStop: false });
      return;
    }

    if (status?.starting || status?.running) {
      popup.elements.runStateElement.textContent =
        status.lastMessage ||
        (status?.starting
          ? t(
              "popupCleanerStartingCurrentPage",
              undefined,
              "Cleaner is starting on the current page."
            )
          : t(
              "popupCleanerRunningCurrentPage",
              undefined,
              "Cleaner is running on the current page."
            ));
      popup.setButtonsState({ canStart: false, canStop: true });
      return;
    }

    popup.elements.runStateElement.textContent =
      status?.lastMessage || t("popupCleanerIdle", undefined, "Cleaner is idle.");
    popup.setButtonsState({ canStart: canStartFromActiveTab, canStop: false });
  };

  popup.renderError = (message, context) => {
    popup.renderStatus(null, context);
    popup.elements.runStateElement.textContent = message;
  };

  popup.renderDisconnectedPage = (message, context) => {
    popup.renderStatus(null, context);
    popup.elements.runStateElement.textContent = message;
    popup.setButtonsState({ canStart: false, canStop: false });
    popup.renderDebugState(message, true);
  };

  popup.renderSettingsState = (message, isError = false) => {
    popup.elements.settingsStateElement.textContent = message;
    popup.elements.settingsStateElement.style.color = isError ? "#fca5a5" : "#cbd5e1";
  };

  popup.renderSettingsPreview = (message) => {
    popup.elements.settingsPreviewElement.textContent = message;
  };
})();
