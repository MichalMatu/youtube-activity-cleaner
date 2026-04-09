(() => {
  const shared = globalThis.YtActivityCleanerShared;
  const content = (globalThis.YtActivityCleanerContent =
    globalThis.YtActivityCleanerContent || {});
  const { ext, Messages } = shared;

  content.requestKeepAwake = async () => {
    try {
      await ext.runtime.sendMessage({ type: Messages.REQUEST_KEEP_AWAKE });
    } catch (error) {
      console.warn("Could not enable keep-awake mode.", error);
    }
  };

  content.releaseKeepAwake = async () => {
    try {
      await ext.runtime.sendMessage({ type: Messages.RELEASE_KEEP_AWAKE });
    } catch (error) {
      console.warn("Could not release keep-awake mode.", error);
    }
  };

  content.deleteOneItem = async (deleteButton) => {
    const state = content.getState();
    const itemContainer = content.getItemContainer(deleteButton);
    const description = content.describeItem(deleteButton);

    state.lastItem = description;
    content.setCleanerMessage(`Preparing to delete: ${description}`);

    await content.waitForStatusIdle();

    if (!(await content.clickElement(deleteButton))) {
      console.warn("Could not click delete button for:", description);
      content.setCleanerMessage(`Could not click delete for: ${description}`);
      return false;
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
    }, content.config.waitForPostClickStateMs);

    if (!firstState) {
      console.warn(
        "No confirm dialog and no visible deletion state after click for:",
        description
      );
      content.setCleanerMessage(`No deletion state after click for: ${description}`);
      return false;
    }

    if (firstState.type === "failure") {
      console.warn("Delete failed for:", description, `(${firstState.message})`);
      content.setCleanerMessage(`Delete failed for: ${description}`);
      return false;
    }

    if (firstState.type === "confirm") {
      if (!(await content.pauseAwareSleep(content.config.beforeConfirmClickMs))) {
        return false;
      }

      if (!(await content.clickElement(firstState.confirmButton))) {
        console.warn("Could not click confirm button for:", description);
        content.setCleanerMessage(`Could not confirm delete for: ${description}`);
        return false;
      }

      if (!(await content.pauseAwareSleep(content.config.afterConfirmClickMs))) {
        return false;
      }
    }

    const outcome = await content.waitForDeleteOutcome(itemContainer);
    if (!outcome.success) {
      console.warn(`Delete not confirmed for: ${description} (${outcome.reason})`);
      content.setCleanerMessage(`Delete not confirmed for: ${description}`);
      return false;
    }

    console.log(`Confirmed deletion: ${description}`);
    content.setCleanerMessage(`Confirmed deletion: ${description}`);
    await content.waitForStatusIdle();
    return true;
  };

  content.runCleaner = async () => {
    const state = content.getState();
    let idleRounds = 0;
    let failureStreak = 0;

    await content.requestKeepAwake();
    content.setCleanerMessage("Cleaner started.");
    console.log("YouTube Activity Cleaner started from the extension.");

    while (!state.stopRequested) {
      const deleteButton = content.getVisibleDeleteButtons()[0];

      if (deleteButton) {
        state.attempted += 1;
        const success = await content.deleteOneItem(deleteButton);

        if (success) {
          state.deleted += 1;
          idleRounds = 0;
          failureStreak = 0;
          content.setCleanerMessage(`Deleted comments: ${state.deleted}`);

          if (!(await content.pauseAwareSleep(content.config.betweenItemsMs))) {
            break;
          }

          continue;
        }

        state.failed += 1;
        failureStreak += 1;
        content.setCleanerMessage(
          `Failed attempts in a row: ${failureStreak}. Total failed: ${state.failed}`
        );

        if (failureStreak >= content.config.failureStreakLimit) {
          content.setCleanerMessage("Stopped after several unconfirmed deletions in a row.");
          break;
        }

        await content.waitForStatusIdle();
        if (!(await content.pauseAwareSleep(content.config.scrollPauseMs))) {
          break;
        }

        continue;
      }

      const loadMoreButton = content.getLoadMoreButton();
      if (loadMoreButton) {
        content.setCleanerMessage("Loading more activity items...");
        await content.clickElement(loadMoreButton);

        if (!(await content.pauseAwareSleep(content.config.scrollPauseMs))) {
          break;
        }

        idleRounds = 0;
        continue;
      }

      const scrollSnapshot = content.captureScrollSnapshot();
      content.scrollPageStep();

      if (!(await content.pauseAwareSleep(content.config.scrollPauseMs))) {
        break;
      }

      if (!content.hasScrollSnapshotChanged(scrollSnapshot)) {
        idleRounds += 1;
      } else {
        idleRounds = 0;
      }

      if (idleRounds >= content.config.idleRoundsLimit) {
        content.setCleanerMessage("No more visible delete buttons were found.");
        break;
      }
    }

    state.running = false;
    state.paused = false;
    await content.releaseKeepAwake();

    if (state.stopRequested) {
      content.setCleanerMessage("Stopped by the user.");
    } else if (!state.lastMessage) {
      content.setCleanerMessage("Finished.");
    }

    state.stopRequested = false;
    console.log("YouTube Activity Cleaner finished.", content.getCleanerStatus());
  };

  content.startCleaner = () => {
    const state = content.getState();

    if (state.running) {
      return content.getCleanerStatus();
    }

    if (!content.isSupportedPage()) {
      content.setCleanerMessage("Open the Your YouTube comments page in Google My Activity first.");
      return content.getCleanerStatus();
    }

    state.running = true;
    state.stopRequested = false;
    state.paused = false;
    state.attempted = 0;
    state.deleted = 0;
    state.failed = 0;
    state.lastItem = "";
    content.setCleanerMessage("Starting cleaner...");

    content.runCleaner().catch((error) => {
      state.running = false;
      state.paused = false;
      state.stopRequested = false;
      state.failed += 1;
      content.setCleanerMessage(`Cleaner stopped because of an error: ${error.message}`);
      content.releaseKeepAwake();
      console.error("YouTube Activity Cleaner stopped because of an error:", error);
    });

    return content.getCleanerStatus();
  };

  content.stopCleaner = () => {
    const state = content.getState();

    state.stopRequested = true;
    content.setCleanerMessage("Stopping after the current step...");
    return content.getCleanerStatus();
  };
})();
