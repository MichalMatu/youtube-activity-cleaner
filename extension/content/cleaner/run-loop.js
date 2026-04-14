(() => {
  const shared = globalThis.YtActivityCleanerShared;
  const content = (globalThis.YtActivityCleanerContent =
    globalThis.YtActivityCleanerContent || {});
  const t = shared.t || ((_key, _substitutions, fallback = "") => fallback);

  content.formatDurationMs = (ms) => {
    const seconds = ms / 1000;

    return Number.isInteger(seconds) ? `${seconds}s` : `${seconds.toFixed(1)}s`;
  };

  content.getRetryDelayMs = (failedAttemptNumber) =>
    content.getSettingValue("retryBackoffMs") * failedAttemptNumber;

  content.performSingleActionAttempt = async (actionCandidate, description) =>
    content.getTargetStrategy().runSingleAttempt(actionCandidate, description);

  content.processOneAction = async (actionCandidate) => {
    const state = content.getState();
    const strategy = content.getTargetStrategy();
    const description = strategy.describeAction(actionCandidate);
    const maxAttempts = content.getSettingValue("retryLimit") + 1;
    let currentActionCandidate = actionCandidate;
    let lastFailureReason = "unknown error";

    for (let attemptNumber = 1; attemptNumber <= maxAttempts; attemptNumber += 1) {
      if (state.stopRequested) {
        return { success: false, reason: "stopped" };
      }

      state.attempted += 1;
      content.pushDebugEvent?.("action:attempt", {
        description,
        attemptNumber,
        maxAttempts,
      });
      const actionResult = await content.performSingleActionAttempt(
        currentActionCandidate,
        description
      );
      if (actionResult.success) {
        state.retryAttempt = 0;
        state.retryDelayMs = 0;
        content.pushDebugEvent?.("action:success", {
          description,
          attemptNumber,
        });
        return actionResult;
      }

      lastFailureReason = actionResult.reason || "unknown error";
      content.setCleanerError(lastFailureReason);
      content.pushDebugEvent?.("action:failure", {
        description,
        attemptNumber,
        reason: lastFailureReason,
      });

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
      currentActionCandidate = strategy.findRetryAction(
        currentActionCandidate,
        description
      );

      if (!content.getCandidateElement?.(currentActionCandidate)) {
        lastFailureReason = "the action button disappeared before retrying";
        content.setCleanerError(lastFailureReason);
        content.pushDebugEvent?.("action:retry_target_missing", {
          description,
          attemptNumber: nextAttemptNumber,
        });
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

  content.runCleanerLoop = async () => {
    const state = content.getState();
    let idleRounds = 0;
    let failureStreak = 0;

    while (!state.stopRequested) {
      const strategy = content.getTargetStrategy();
      const actionCandidate =
        content.getFirstActionCandidate?.(strategy) || strategy.getActionButtons?.()[0] || null;

      if (actionCandidate) {
        content.pushDebugEvent?.("run:action_visible", {
          description: strategy.describeAction(actionCandidate),
        });
        const actionResult = await content.processOneAction(actionCandidate);

        if (actionResult.success) {
          state.deleted += 1;
          idleRounds = 0;
          failureStreak = 0;
          content.setCleanerError("");
          content.setCleanerMessage(strategy.getCompletedCountMessage(state.deleted));
          content.pushDebugEvent?.("run:deleted_incremented", {
            deleted: state.deleted,
            description: actionResult.description || "",
          });

          if (!(await content.pauseAwareSleep(content.getSettingValue("betweenItemsMs")))) {
            break;
          }

          continue;
        }

        state.failed += 1;
        failureStreak += 1;
        content.setCleanerError(actionResult.reason);
        content.pushDebugEvent?.("run:failed_incremented", {
          failed: state.failed,
          reason: actionResult.reason,
          failureStreak,
        });
        content.setCleanerMessage(
          t(
            "contentFailedAttempt",
            [actionResult.reason, failureStreak, state.failed],
            `Failed attempt: ${actionResult.reason}. Consecutive failures: ${failureStreak}. Total failed: ${state.failed}`
          )
        );

        if (failureStreak >= content.getSettingValue("failureStreakLimit")) {
          content.setCleanerMessage(
            t(
              "contentStoppedAfterFailures",
              [failureStreak, actionResult.reason],
              `Stopped after ${failureStreak} failures in a row. Last issue: ${actionResult.reason}`
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

      const loadMoreButton = strategy.getLoadMoreButton();
      if (loadMoreButton) {
        content.pushDebugEvent?.("run:load_more", {
          label:
            content.getElementLabel?.(loadMoreButton) ||
            loadMoreButton.getAttribute?.("aria-label") ||
            "",
        });
        content.setCleanerMessage(
          strategy.getLoadingMoreMessage
            ? strategy.getLoadingMoreMessage()
            : t("contentLoadingMoreItems", undefined, "Loading more activity items...")
        );
        await content.clickElement(loadMoreButton);

        if (!(await content.pauseAwareSleep(content.getSettingValue("scrollPauseMs")))) {
          break;
        }

        idleRounds = 0;
        continue;
      }

      const scrollSnapshot = content.captureScrollSnapshot();
      content.pushDebugEvent?.("run:scroll_step", {
        top: scrollSnapshot.top,
        height: scrollSnapshot.height,
      });
      content.scrollPageStep();

      if (!(await content.pauseAwareSleep(content.getSettingValue("scrollPauseMs")))) {
        break;
      }

      if (!content.hasScrollSnapshotChanged(scrollSnapshot)) {
        idleRounds += 1;
        content.pushDebugEvent?.("run:scroll_unchanged", {
          idleRounds,
        });
      } else {
        idleRounds = 0;
        content.pushDebugEvent?.("run:scroll_changed", {
          top: content.scrollRoot?.scrollTop || 0,
        });
      }

      if (idleRounds >= content.getSettingValue("idleRoundsLimit")) {
        content.pushDebugEvent?.("run:finished_no_more_actions", {
          idleRounds,
        });
        content.setCleanerMessage(strategy.getNoMoreActionsMessage());
        break;
      }
    }
  };
})();
