(() => {
  const shared = globalThis.YtActivityCleanerShared;
  const content = (globalThis.YtActivityCleanerContent =
    globalThis.YtActivityCleanerContent || {});
  const t = shared.t || ((_key, _substitutions, fallback = "") => fallback);

  const likesRemoveActionPatterns = [
    /remove from liked videos/,
    /usuń z filmów, które mi się podobają/,
    /usun z filmow, ktore mi sie podobaja/,
    /usuń z polubionych filmów/,
    /usun z polubionych filmow/,
  ];

  const waitForItemRemoval = async (
    itemContainer,
    expectedDescription,
    timeoutMs,
    timeoutReason
  ) => {
    let deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      if (content.getState().stopRequested) {
        return { success: false, reason: "stopped" };
      }

      if (document.visibilityState !== "visible") {
        const pausedAt = Date.now();
        const stillRunning = await content.pauseUntilVisible();
        if (!stillRunning) {
          return { success: false, reason: "stopped" };
        }

        deadline += Date.now() - pausedAt;
      }

      if (content.isItemGone(itemContainer)) {
        return { success: true, reason: "item disappeared after removing the like" };
      }

      const currentDescription = content.describeItem(itemContainer);
      if (currentDescription && currentDescription !== expectedDescription) {
        return {
          success: true,
          reason: "the playlist row changed after removing the like",
        };
      }

      await content.sleep(content.getSettingValue("pollMs"));
    }

    return {
      success: false,
      reason: timeoutReason,
    };
  };

  const getVisibleUnlikeMenuItem = () =>
    content.getVisibleMenuItems().find((element) => {
      const label = content.normalizeText(
        element.innerText ||
          element.textContent ||
          element.getAttribute?.("aria-label") ||
          element.getAttribute?.("title")
      );

      return likesRemoveActionPatterns.some((pattern) => pattern.test(label));
    });

  const commentsStrategy = Object.freeze({
    id: "comments",
    getActionButtons: () => content.getVisibleDeleteButtons(),
    describeAction: (actionButton) => content.describeItem(actionButton),
    findRetryAction: (previousActionButton, description) =>
      content.findRetryDeleteButton(previousActionButton, description),
    getLoadMoreButton: () => content.getLoadMoreButton(),
    getCompletedCountMessage: (count) =>
      t("contentDeletedComments", count, `Deleted comments: ${count}`),
    getNoMoreActionsMessage: () =>
      t(
        "contentNoMoreDeleteButtons",
        undefined,
        "No more visible delete buttons were found."
      ),
    runSingleAttempt: async (actionButton, description) => {
      const state = content.getState();
      const itemContainer = content.getItemContainer(actionButton);

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

      if (!(await content.clickElement(actionButton))) {
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
    },
  });

  const likesStrategy = Object.freeze({
    id: "likes",
    getActionButtons: () => content.getVisibleActionButtons(),
    describeAction: (actionButton) => content.describeItem(actionButton),
    findRetryAction: (previousActionButton, description) =>
      content.findRetryActionButton(previousActionButton, description),
    getLoadMoreButton: () => null,
    getCompletedCountMessage: (count) =>
      t("contentRemovedLikes", count, `Removed likes: ${count}`),
    getNoMoreActionsMessage: () =>
      t(
        "contentNoMoreLikes",
        undefined,
        "No more removable liked videos were found."
      ),
    getLoadingMoreMessage: () =>
      t("contentLoadingMoreLikes", undefined, "Loading more liked videos..."),
    runSingleAttempt: async (actionButton, description) => {
      const state = content.getState();
      const itemContainer = content.getItemContainer(actionButton);

      state.lastItem = description;
      content.setCleanerMessage(
        t(
          "contentPreparingToRemoveLike",
          description,
          `Preparing to remove like: ${description}`
        )
      );
      content.setCleanerError("");
      state.retryAttempt = 0;
      state.retryDelayMs = 0;

      if (!(await content.clickElement(actionButton))) {
        console.warn("Could not click action menu button for:", description);
        return { success: false, reason: "could not click the action menu button" };
      }

      const removeMenuItem = await content.waitFor(
        () => getVisibleUnlikeMenuItem(),
        content.getSettingValue("waitForPostClickStateMs")
      );

      if (!removeMenuItem) {
        console.warn("Could not find the unlike menu item for:", description);
        return {
          success: false,
          reason: "could not find the remove-from-liked-videos menu item",
        };
      }

      if (!(await content.clickElement(removeMenuItem))) {
        console.warn("Could not click the unlike menu item for:", description);
        return {
          success: false,
          reason: "could not click the remove-from-liked-videos menu item",
        };
      }

      const outcome = await waitForItemRemoval(
        itemContainer,
        description,
        content.getSettingValue("waitForRemovalMs"),
        "timed out while waiting for the liked video to disappear"
      );
      if (!outcome.success) {
        console.warn(`Like removal not confirmed for: ${description} (${outcome.reason})`);
        return outcome;
      }

      console.log(`Removed like: ${description}`);
      content.setCleanerMessage(
        t("contentConfirmedUnlike", description, `Removed like: ${description}`)
      );
      content.setCleanerError("");
      return { success: true, description };
    },
  });

  const strategies = Object.freeze({
    comments: commentsStrategy,
    likes: likesStrategy,
  });

  content.getTargetStrategy = () =>
    strategies[content.getTarget()?.id] || commentsStrategy;
})();
