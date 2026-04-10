(() => {
  const shared = globalThis.YtActivityCleanerShared;
  const content = (globalThis.YtActivityCleanerContent =
    globalThis.YtActivityCleanerContent || {});
  const { ext, Messages, getSettings } = shared;
  const t = shared.t || ((_key, _substitutions, fallback = "") => fallback);

  content.formatDurationMs = (ms) => {
    const seconds = ms / 1000;

    return Number.isInteger(seconds) ? `${seconds}s` : `${seconds.toFixed(1)}s`;
  };

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

  content.getRetryDelayMs = (failedAttemptNumber) =>
    content.getSettingValue("retryBackoffMs") * failedAttemptNumber;

  content.runSingleDeleteAttempt = async (deleteButton, description) => {
    const state = content.getState();
    const itemContainer = content.getItemContainer(deleteButton);

    state.lastItem = description;
    content.setCleanerMessage(
      t(
        "contentPreparingToDelete",
        description,
        `Preparing to delete: ${description}`
      )
    );
    content.setCleanerError("");
    state.retryAttempt = 0;
    state.retryDelayMs = 0;

    await content.waitForStatusIdle();

    if (!(await content.clickElement(deleteButton))) {
      console.warn("Could not click delete button for:", description);
      return { success: false, reason: "could not click the delete button" };
    }

    const firstState = await content.waitFor(() => {
      const confirmButton = content.getConfirmButton();
      if (confirmButton) {
        return { type: "confirm", confirmButton };
      }

      const messages = content.getStatusMessages();
      const failureMessage = messages.find(content.matchesFailureStatus);
      if (failureMessage) {
        return { type: "failure", message: failureMessage };
      }

      if (
        messages.some(content.matchesPendingStatus) ||
        messages.some(content.matchesSuccessStatus)
      ) {
        return { type: "status" };
      }

      if (content.isItemGone(itemContainer)) {
        return { type: "removed_without_confirm" };
      }

      return null;
    }, content.getSettingValue("waitForPostClickStateMs"));

    if (!firstState) {
      console.warn(
        "No confirm dialog and no visible deletion state after click for:",
        description
      );
      return {
        success: false,
        reason: "no confirmation dialog or delete status appeared after clicking",
      };
    }

    if (firstState.type === "failure") {
      console.warn("Delete failed for:", description, `(${firstState.message})`);
      return { success: false, reason: firstState.message || "delete failed" };
    }

    if (firstState.type === "confirm") {
      if (!(await content.pauseAwareSleep(content.getSettingValue("beforeConfirmClickMs")))) {
        return { success: false, reason: "stopped" };
      }

      if (!(await content.clickElement(firstState.confirmButton))) {
        console.warn("Could not click confirm button for:", description);
        return { success: false, reason: "could not click the confirmation button" };
      }

      if (!(await content.pauseAwareSleep(content.getSettingValue("afterConfirmClickMs")))) {
        return { success: false, reason: "stopped" };
      }
    }

    const outcome = await content.waitForDeleteOutcome(itemContainer, {
      firstStateType: firstState.type,
    });
    if (!outcome.success) {
      console.warn(`Delete not confirmed for: ${description} (${outcome.reason})`);
      return { success: false, reason: outcome.reason };
    }

    console.log(`Confirmed deletion: ${description}`);
    content.setCleanerMessage(
      t(
        "contentConfirmedDeletion",
        description,
        `Confirmed deletion: ${description}`
      )
    );
    await content.waitForStatusIdle();
    content.setCleanerError("");
    return { success: true, description };
  };

  content.deleteOneItem = async (deleteButton) => {
    const state = content.getState();
    const description = content.describeItem(deleteButton);
    const maxAttempts = content.getSettingValue("retryLimit") + 1;
    let currentButton = deleteButton;
    let lastFailureReason = "unknown error";

    for (let attemptNumber = 1; attemptNumber <= maxAttempts; attemptNumber += 1) {
      if (state.stopRequested) {
        return { success: false, reason: "stopped" };
      }

      state.attempted += 1;
      const deleteResult = await content.runSingleDeleteAttempt(currentButton, description);
      if (deleteResult.success) {
        state.retryAttempt = 0;
        state.retryDelayMs = 0;
        return deleteResult;
      }

      lastFailureReason = deleteResult.reason || "unknown error";
      content.setCleanerError(lastFailureReason);

      if (lastFailureReason === "stopped") {
        return { success: false, reason: lastFailureReason };
      }

      if (attemptNumber >= maxAttempts) {
        break;
      }

      const nextAttemptNumber = attemptNumber + 1;
      const retryDelayMs = content.getRetryDelayMs(attemptNumber);
      state.retryAttempt = nextAttemptNumber;
      state.retryDelayMs = retryDelayMs;

      content.setCleanerMessage(
        t(
          "contentRetryingDelete",
          [
            description,
            nextAttemptNumber,
            maxAttempts,
            content.formatDurationMs(retryDelayMs),
            lastFailureReason,
          ],
          `Retrying ${description} (${nextAttemptNumber}/${maxAttempts}) in ${content.formatDurationMs(
            retryDelayMs
          )}: ${lastFailureReason}`
        )
      );

      await content.waitForStatusIdle();
      currentButton = content.findRetryDeleteButton(currentButton, description);

      if (!currentButton) {
        lastFailureReason = "the delete button disappeared before retrying";
        content.setCleanerError(lastFailureReason);
        break;
      }

      if (!(await content.pauseAwareSleep(retryDelayMs))) {
        return { success: false, reason: "stopped" };
      }
    }

    state.retryAttempt = 0;
    state.retryDelayMs = 0;
    return { success: false, reason: lastFailureReason };
  };

  content.runCleaner = async () => {
    const state = content.getState();
    let idleRounds = 0;
    let failureStreak = 0;

    state.starting = false;
    await content.requestKeepAwake();
    content.setCleanerMessage(t("contentCleanerStarted", undefined, "Cleaner started."));
    console.log(
      t(
        "logCleanerStartedFromExtension",
        undefined,
        "YouTube Activity Cleaner started from the extension."
      )
    );

    while (!state.stopRequested) {
      const deleteButton = content.getVisibleDeleteButtons()[0];

      if (deleteButton) {
        const deleteResult = await content.deleteOneItem(deleteButton);

        if (deleteResult.success) {
          state.deleted += 1;
          idleRounds = 0;
          failureStreak = 0;
          content.setCleanerError("");
          content.setCleanerMessage(
            t(
              "contentDeletedComments",
              state.deleted,
              `Deleted comments: ${state.deleted}`
            )
          );

          if (!(await content.pauseAwareSleep(content.getSettingValue("betweenItemsMs")))) {
            break;
          }

          continue;
        }

        state.failed += 1;
        failureStreak += 1;
        content.setCleanerError(deleteResult.reason);
        content.setCleanerMessage(
          t(
            "contentFailedAttempt",
            [deleteResult.reason, failureStreak, state.failed],
            `Failed attempt: ${deleteResult.reason}. Consecutive failures: ${failureStreak}. Total failed: ${state.failed}`
          )
        );

        if (failureStreak >= content.getSettingValue("failureStreakLimit")) {
          content.setCleanerMessage(
            t(
              "contentStoppedAfterFailures",
              [failureStreak, deleteResult.reason],
              `Stopped after ${failureStreak} failures in a row. Last issue: ${deleteResult.reason}`
            )
          );
          break;
        }

        await content.waitForStatusIdle();
        if (!(await content.pauseAwareSleep(content.getSettingValue("scrollPauseMs")))) {
          break;
        }

        continue;
      }

      const loadMoreButton = content.getLoadMoreButton();
      if (loadMoreButton) {
        content.setCleanerMessage(
          t("contentLoadingMoreItems", undefined, "Loading more activity items...")
        );
        await content.clickElement(loadMoreButton);

        if (!(await content.pauseAwareSleep(content.getSettingValue("scrollPauseMs")))) {
          break;
        }

        idleRounds = 0;
        continue;
      }

      const scrollSnapshot = content.captureScrollSnapshot();
      content.scrollPageStep();

      if (!(await content.pauseAwareSleep(content.getSettingValue("scrollPauseMs")))) {
        break;
      }

      if (!content.hasScrollSnapshotChanged(scrollSnapshot)) {
        idleRounds += 1;
      } else {
        idleRounds = 0;
      }

      if (idleRounds >= content.getSettingValue("idleRoundsLimit")) {
        content.setCleanerMessage(
          t(
            "contentNoMoreDeleteButtons",
            undefined,
            "No more visible delete buttons were found."
          )
        );
        break;
      }
    }

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

  content.startCleaner = async () => {
    const state = content.getState();

    if (state.running || state.starting) {
      return content.getCleanerStatus();
    }

    if (!content.isSupportedPage()) {
      content.setCleanerMessage(
        t(
          "contentOpenCommentsPageFirst",
          undefined,
          "Open the Your YouTube comments page in Google My Activity first."
        )
      );
      return content.getCleanerStatus();
    }

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
    content.setCleanerMessage(
      t("contentLoadingSavedSettings", undefined, "Loading saved settings...")
    );

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
      content.releaseKeepAwake();
      console.error(
        t(
          "logCleanerStoppedBecauseOfError",
          undefined,
          "YouTube Activity Cleaner stopped because of an error:"
        ),
        error
      );
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
