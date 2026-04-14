(() => {
  const shared = globalThis.YtActivityCleanerShared;
  const content = (globalThis.YtActivityCleanerContent =
    globalThis.YtActivityCleanerContent || {});
  const { ext, Messages, getSettings } = shared;
  const t = shared.t || ((_key, _substitutions, fallback = "") => fallback);

  content.requestKeepAwake = async () => {
    try {
      await ext.runtime.sendMessage({ type: Messages.REQUEST_KEEP_AWAKE });
    } catch (error) {
      console.warn(
        t("logCouldNotEnableKeepAwake", undefined, "Could not enable keep-awake mode."),
        error
      );
    }
  };

  content.releaseKeepAwake = async () => {
    try {
      await ext.runtime.sendMessage({ type: Messages.RELEASE_KEEP_AWAKE });
    } catch (error) {
      console.warn(
        t("logCouldNotReleaseKeepAwake", undefined, "Could not release keep-awake mode."),
        error
      );
    }
  };

  content.resetCleanerStateForStart = (targetId) => {
    const state = content.getState();

    content.setCleanerTarget(targetId);
    state.starting = true;
    state.running = false;
    state.stopRequested = false;
    state.paused = false;
    state.attempted = 0;
    state.deleted = 0;
    state.failed = 0;
    state.lastItem = "";
    state.lastError = "";
    state.retryAttempt = 0;
    state.retryDelayMs = 0;
    content.clearDebugEvents();
    content.setCleanerMessage(
      t("contentLoadingSavedSettings", undefined, "Loading saved settings...")
    );

    return state;
  };

  content.prepareCleanerRun = async () => {
    const state = content.getState();

    state.starting = false;
    await content.requestKeepAwake();
    content.pushDebugEvent?.("run:start", {
      targetId: content.getTarget()?.id || "",
    });
    const pageSignals = content.collectPageSignals?.();
    if (pageSignals) {
      content.pushDebugEvent?.("run:page_signals", {
        deleteButtons: pageSignals.counts?.deleteButtons ?? "",
        visibleDeleteButtons: pageSignals.counts?.visibleDeleteButtons ?? "",
        confirmButtons: pageSignals.counts?.confirmButtons ?? "",
        visibleConfirmButtons: pageSignals.counts?.visibleConfirmButtons ?? "",
        statusNodes: pageSignals.counts?.statusNodes ?? "",
        visibleStatusNodes: pageSignals.counts?.visibleStatusNodes ?? "",
        delayedUpdateHint: pageSignals.delayedUpdateHint ?? false,
      });
    }
    content.setCleanerMessage(t("contentCleanerStarted", undefined, "Cleaner started."));
    console.log(
      t(
        "logCleanerStartedFromExtension",
        undefined,
        "YouTube Activity Cleaner started from the extension."
      )
    );
  };

  content.finalizeCleanerRun = async () => {
    const state = content.getState();

    state.starting = false;
    state.running = false;
    state.paused = false;
    await content.releaseKeepAwake();

    if (state.stopRequested) {
      content.setCleanerMessage(
        t("contentStoppedByUser", undefined, "Stopped by the user.")
      );
    } else if (!state.lastMessage) {
      content.setCleanerMessage(t("contentFinished", undefined, "Finished."));
    }

    state.stopRequested = false;
    console.log(
      t("logCleanerFinished", undefined, "YouTube Activity Cleaner finished."),
      content.getCleanerStatus()
    );
  };

  content.handleCleanerRunError = async (error) => {
    const state = content.getState();

    state.starting = false;
    state.running = false;
    state.paused = false;
    state.stopRequested = false;
    state.failed += 1;
    content.setCleanerError(error.message);
    content.setCleanerMessage(
      t(
        "contentCleanerStoppedError",
        error.message,
        `Cleaner stopped because of an error: ${error.message}`
      )
    );
    await content.releaseKeepAwake();
    console.error(
      t(
        "logCleanerStoppedBecauseOfError",
        undefined,
        "YouTube Activity Cleaner stopped because of an error:"
      ),
      error
    );
    return content.getCleanerStatus();
  };

  content.startCleaner = async () => {
    const state = content.getState();
    const pageTarget = content.getPageTarget();

    if (state.running || state.starting) {
      return content.getCleanerStatus();
    }

    if (!pageTarget) {
      content.setCleanerMessage(
        t(
          "contentOpenCommentsPageFirst",
          undefined,
          "Open a supported cleaner page first."
        )
      );
      return content.getCleanerStatus();
    }

    if (!content.isRunnablePage()) {
      content.setCleanerMessage(
        t(
          "contentTargetNotEnabledYet",
          content.getTargetLabel(pageTarget),
          `${content.getTargetLabel(pageTarget)} cleanup is not enabled yet.`
        )
      );
      return content.getCleanerStatus();
    }

    content.resetCleanerStateForStart(pageTarget.id);

    const settings = await getSettings();
    content.setCleanerSettings(settings);

    if (state.stopRequested) {
      state.starting = false;
      content.setCleanerMessage(
        t("contentStoppedByUser", undefined, "Stopped by the user.")
      );
      return content.getCleanerStatus();
    }

    state.starting = false;
    state.running = true;
    content.pushDebugEvent?.("run:settings_loaded", {
      speedProfile: settings.speedProfile,
      betweenItemsMs: settings.betweenItemsMs,
      retryLimit: settings.retryLimit,
    });
    const speedProfileLabel =
      shared.Settings?.profiles?.[settings.speedProfile]?.label || settings.speedProfile;
    content.setCleanerMessage(
      t(
        "contentStartingCleaner",
        [
          speedProfileLabel,
          settings.retryLimit,
          content.formatDurationMs(settings.betweenItemsMs),
        ],
        `Starting ${speedProfileLabel} cleaner with ${settings.retryLimit} retries and ${content.formatDurationMs(
          settings.betweenItemsMs
        )} pacing...`
      )
    );

    content.runCleaner().catch((error) => {
      void content.handleCleanerRunError(error);
    });

    return content.getCleanerStatus();
  };

  content.stopCleaner = () => {
    const state = content.getState();

    state.stopRequested = true;
    content.setCleanerMessage(
      state.starting
        ? t(
            "contentStoppingBeforeStart",
            undefined,
            "Stopping before the cleaner starts..."
          )
        : t(
            "contentStoppingAfterCurrentStep",
            undefined,
            "Stopping after the current step..."
          )
    );
    return content.getCleanerStatus();
  };
})();
