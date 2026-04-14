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
    quickLinksElement: document.querySelector("#quick-links"),
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

  popup.setText = (element, message) => {
    if (!element) {
      return;
    }

    const text = String(message || "");
    element.textContent = text;
  };

  popup.setLineText = (element, message) => {
    if (!element) {
      return;
    }

    const text = String(message || "");
    element.hidden = !text;
    popup.setText(element, text);
  };

  popup.renderPowerState = (status) => {
    if (status?.keepAwakeActive) {
      popup.setText(
        popup.elements.powerStateElement,
        t(
        "popupKeepAwakeEnabled",
        undefined,
        "Keep-awake is enabled. Chrome should keep the display awake while cleaning runs."
        )
      );
      return;
    }

    popup.setText(
      popup.elements.powerStateElement,
      t(
        "popupKeepAwakeAuto",
        undefined,
        "Keep-awake will be enabled automatically while cleaning is running."
      )
    );
  };

  popup.renderDebugState = (message, isError = false) => {
    popup.setText(popup.elements.debugStateElement, message);
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
      popup.setText(
        popup.elements.pageStateElement,
        isUsingActiveTab
          ? t(
              "popupPageReadyCurrentTarget",
              currentTargetLabel,
              `Ready on: ${currentTargetLabel}.`
            )
          : t(
            "popupPageConnectedOtherTabTarget",
            currentTargetLabel,
            `Connected to a ${currentTargetLabel} cleaner tab in another tab.`
            )
      );
      popup.setLineText(
        popup.elements.tabStateElement,
        isUsingActiveTab
          ? ""
          : t(
            "popupTabUsingTitle",
            targetTab?.title ||
              t("popupFallbackTabTitleTarget", currentTargetLabel, `${currentTargetLabel} tab`),
            `Using: ${targetTab?.title || `${currentTargetLabel} tab`}`
            )
      );
    } else if (popup.isSupportedUrl(activeTab?.url)) {
      if (canStartFromActiveTab) {
        popup.setText(
          popup.elements.pageStateElement,
          t(
            "popupPageReadyStartCurrentTab",
            undefined,
            "Ready to start on the current tab."
          )
        );
        popup.setLineText(popup.elements.tabStateElement, "");
      } else {
        popup.setText(
          popup.elements.pageStateElement,
          t(
            "popupPageDetectedTarget",
            popup.getTargetLabel(activeTabTarget),
            `Detected page: ${popup.getTargetLabel(activeTabTarget)}.`
          )
        );
        popup.setLineText(
          popup.elements.tabStateElement,
          t(
            "popupTargetComingSoon",
            popup.getTargetLabel(activeTabTarget),
            `${popup.getTargetLabel(activeTabTarget)} cleanup is planned, but it is not enabled yet.`
          )
        );
      }
    } else {
        popup.setText(
          popup.elements.pageStateElement,
          t(
            "popupPageOpenCommentsPrompt",
            undefined,
            "Use one of the supported page shortcuts below."
          )
        );
      popup.setLineText(popup.elements.tabStateElement, "");
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
      popup.setText(
        popup.elements.runStateElement,
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
                "Open one of the supported cleaner pages to continue."
              )
      );
      popup.setButtonsState({ canStart: canStartFromActiveTab, canStop: false });
      return;
    }

    if (status?.starting || status?.running) {
      popup.setText(
        popup.elements.runStateElement,
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
              ))
      );
      popup.setButtonsState({ canStart: false, canStop: true });
      return;
    }

    popup.setText(
      popup.elements.runStateElement,
      status?.lastMessage || t("popupCleanerIdle", undefined, "Cleaner is idle.")
    );
    popup.setButtonsState({ canStart: canStartFromActiveTab, canStop: false });
  };

  popup.renderError = (message, context) => {
    popup.renderStatus(null, context);
    popup.setText(popup.elements.runStateElement, message);
  };

  popup.renderDisconnectedPage = (message, context) => {
    popup.renderStatus(null, context);
    popup.setText(popup.elements.runStateElement, message);
    popup.setButtonsState({ canStart: false, canStop: false });
    popup.renderDebugState(message, true);
  };

  popup.renderSettingsState = (message, isError = false) => {
    popup.setText(popup.elements.settingsStateElement, message);
    popup.elements.settingsStateElement.style.color = isError ? "#fca5a5" : "#cbd5e1";
  };

  popup.renderSettingsPreview = (message) => {
    popup.setText(popup.elements.settingsPreviewElement, message);
  };
})();
