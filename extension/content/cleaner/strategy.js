(() => {
  const shared = globalThis.YtActivityCleanerShared;
  const content = (globalThis.YtActivityCleanerContent =
    globalThis.YtActivityCleanerContent || {});
  const t = shared.t || ((_key, _substitutions, fallback = "") => fallback);

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

  const strategies = Object.freeze({
    comments: commentsStrategy,
  });

  content.getTargetStrategy = () =>
    strategies[content.getTarget()?.id] || commentsStrategy;
})();
