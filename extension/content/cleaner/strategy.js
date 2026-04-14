(() => {
  const shared = globalThis.YtActivityCleanerShared;
  const content = (globalThis.YtActivityCleanerContent =
    globalThis.YtActivityCleanerContent || {});
  const t = shared.t || ((_key, _substitutions, fallback = "") => fallback);
  const formatTemplate = (template, substitutions) => {
    const values =
      substitutions === undefined
        ? []
        : Array.isArray(substitutions)
          ? substitutions
          : [substitutions];

    return String(template || "").replace(/\$(\d+)/g, (_match, index) => {
      const value = values[Number(index) - 1];
      return value === undefined ? "" : String(value);
    });
  };
  const translateWithFallback = (key, substitutions, fallbackTemplate) =>
    t(key, substitutions, "") || formatTemplate(fallbackTemplate, substitutions);
  const verificationDialogBlockedReason = () =>
    t(
      "contentVerificationDialogBlocked",
      undefined,
      "A My Activity verification dialog blocked the delete flow. Close it or disable extra verification for My Activity."
    );

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
    getCompletedCountMessage: (count) => {
      const target = content.getTarget();

      return translateWithFallback(
        target?.completedCountKey || "contentDeletedComments",
        count,
        target?.completedCountFallback || "Deleted comments: $1"
      );
    },
    getNoMoreActionsMessage: () => {
      const target = content.getTarget();

      return translateWithFallback(
        target?.noMoreActionsKey || "contentNoMoreDeleteButtons",
        undefined,
        target?.noMoreActionsFallback || "No more visible delete buttons were found."
      );
    },
    runSingleAttempt: async (actionButton, description) => {
      const state = content.getState();
      const itemContainer = content.getItemContainer(actionButton);
      const startDescription = content.describeItem(itemContainer);

      state.lastItem = description;
      content.pushDebugEvent?.("delete_attempt:start", {
        description,
        targetId: content.getTarget()?.id || "",
        itemDescription: startDescription,
      });
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

      await content.dismissKnownBlockingDialog?.();
      await content.waitForStatusIdle();

      if (!(await content.clickElement(actionButton))) {
        console.warn("Could not click delete button for:", description);
        return { success: false, reason: "could not click the delete button" };
      }

      const firstState = await content.waitFor(() => {
        if (content.getKnownBlockingDialog?.()) {
          return { type: "blocking_dialog" };
        }

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

        if (!actionButton.isConnected) {
          return { type: "removed_without_confirm" };
        }

        if (content.hasMeaningfulDescriptionChange?.(itemContainer, description)) {
          return { type: "removed_without_confirm" };
        }

        return null;
      }, content.getSettingValue("waitForPostClickStateMs"));

      if (!firstState) {
        content.pushDebugEvent?.("delete_attempt:no_initial_signal", {
          description,
        });
        const lateOutcome = await content.waitForDeleteOutcome(itemContainer, {
          firstStateType: "unknown_after_click",
          expectedDescription: description,
          actionButton,
        });

        if (lateOutcome.success) {
          console.log(`Confirmed deletion after delayed UI update: ${description}`);
          content.pushDebugEvent?.("delete_attempt:late_success", {
            description,
            reason: lateOutcome.reason,
          });
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
        }

        console.warn(
          "No confirm dialog and no visible deletion state after click for:",
          description
        );
        content.pushDebugEvent?.("delete_attempt:late_failure", {
          description,
          reason: lateOutcome.reason,
        });
        return {
          success: false,
          reason:
            lateOutcome.reason || "no confirmation dialog or delete status appeared after clicking",
        };
      }

      if (firstState.type === "blocking_dialog") {
        await content.dismissKnownBlockingDialog?.();
        content.pushDebugEvent?.("delete_attempt:blocked_dialog", {
          description,
        });
        return {
          success: false,
          reason: verificationDialogBlockedReason(),
        };
      }

      if (firstState.type === "failure") {
        console.warn("Delete failed for:", description, `(${firstState.message})`);
        content.pushDebugEvent?.("delete_attempt:failure_status", {
          description,
          reason: firstState.message || "delete failed",
        });
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
        expectedDescription: description,
        actionButton,
      });
      if (!outcome.success) {
        console.warn(`Delete not confirmed for: ${description} (${outcome.reason})`);
        content.pushDebugEvent?.("delete_attempt:outcome_failure", {
          description,
          reason: outcome.reason,
        });
        return { success: false, reason: outcome.reason };
      }

      console.log(`Confirmed deletion: ${description}`);
      content.pushDebugEvent?.("delete_attempt:success", {
        description,
        reason: outcome.reason,
      });
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
      content.pushDebugEvent?.("like_attempt:start", {
        description,
      });
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
        content.pushDebugEvent?.("like_attempt:no_menu_item", {
          description,
        });
        return {
          success: false,
          reason: "could not find the remove-from-liked-videos menu item",
        };
      }

      if (!(await content.clickElement(removeMenuItem))) {
        console.warn("Could not click the unlike menu item for:", description);
        content.pushDebugEvent?.("like_attempt:menu_click_failed", {
          description,
        });
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
        content.pushDebugEvent?.("like_attempt:failure", {
          description,
          reason: outcome.reason,
        });
        return outcome;
      }

      console.log(`Removed like: ${description}`);
      content.pushDebugEvent?.("like_attempt:success", {
        description,
        reason: outcome.reason,
      });
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
    strategies[content.getTarget()?.strategyId || content.getTarget()?.id] || commentsStrategy;
})();
