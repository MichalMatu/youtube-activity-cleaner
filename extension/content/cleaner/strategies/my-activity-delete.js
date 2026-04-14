(() => {
  const shared = globalThis.YtActivityCleanerShared;
  const content = (globalThis.YtActivityCleanerContent =
    globalThis.YtActivityCleanerContent || {});
  const t = shared.t || ((_key, _substitutions, fallback = "") => fallback);
  const translateWithFallback =
    shared.translateWithFallback ||
    ((key, substitutions, fallbackTemplate) =>
      t(key, substitutions, "") || shared.formatTemplate?.(fallbackTemplate, substitutions));
  const verificationDialogBlockedReason = () =>
    t(
      "contentVerificationDialogBlocked",
      undefined,
      "A My Activity verification dialog blocked the delete flow. Close it or disable extra verification for My Activity."
    );

  const toDeleteCandidate = (actionButtonOrCandidate, description) => {
    const actionButton =
      content.getCandidateElement?.(actionButtonOrCandidate) || actionButtonOrCandidate;

    return content.resolveActionCandidate(actionButtonOrCandidate, {
      description,
      itemContainer: actionButton ? content.getItemContainer(actionButton) : null,
      kind: "delete",
    });
  };

  const myActivityDeleteStrategy = Object.freeze({
    id: "myActivityDelete",
    collectActionCandidates: () =>
      content
        .getVisibleDeleteButtons()
        .map((actionButton) =>
          toDeleteCandidate(actionButton, content.describeItem(actionButton))
        )
        .filter(Boolean),
    getActionButtons() {
      return this.collectActionCandidates()
        .map((candidate) => content.getCandidateElement(candidate))
        .filter(Boolean);
    },
    describeAction: (actionCandidate) => content.getCandidateDescription(actionCandidate),
    findRetryAction: (previousActionCandidate, description) => {
      const previousActionButton = content.getCandidateElement(previousActionCandidate);
      const nextActionButton = content.findRetryDeleteButton(
        previousActionButton,
        description
      );

      return nextActionButton ? toDeleteCandidate(nextActionButton, description) : null;
    },
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
    runSingleAttempt: async (actionCandidate, description) => {
      const state = content.getState();
      const candidate = toDeleteCandidate(actionCandidate, description);
      const actionButton = content.getCandidateElement(candidate);
      if (!actionButton) {
        return { success: false, reason: "could not find the delete button" };
      }

      const itemContainer = content.getCandidateItemContainer(candidate);
      const resolvedDescription =
        description || content.getCandidateDescription(candidate) || "unknown item";
      const startDescription = content.describeItem(itemContainer || actionButton);

      state.lastItem = resolvedDescription;
      content.pushDebugEvent?.("delete_attempt:start", {
        description: resolvedDescription,
        targetId: content.getTarget()?.id || "",
        itemDescription: startDescription,
      });
      content.setCleanerMessage(
        t(
          "contentPreparingToDelete",
          resolvedDescription,
          `Preparing to delete: ${resolvedDescription}`
        )
      );
      content.setCleanerError("");
      state.retryAttempt = 0;
      state.retryDelayMs = 0;

      await content.dismissKnownBlockingDialog?.();
      await content.waitForStatusIdle();

      if (!(await content.clickElement(actionButton))) {
        console.warn("Could not click delete button for:", resolvedDescription);
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

        if (content.hasMeaningfulDescriptionChange?.(itemContainer, resolvedDescription)) {
          return { type: "removed_without_confirm" };
        }

        return null;
      }, content.getSettingValue("waitForPostClickStateMs"));

      if (!firstState) {
        content.pushDebugEvent?.("delete_attempt:no_initial_signal", {
          description: resolvedDescription,
        });
        const lateOutcome = await content.waitForDeleteOutcome(itemContainer, {
          firstStateType: "unknown_after_click",
          expectedDescription: resolvedDescription,
          actionButton,
        });

        if (lateOutcome.success) {
          console.log(`Confirmed deletion after delayed UI update: ${resolvedDescription}`);
          content.pushDebugEvent?.("delete_attempt:late_success", {
            description: resolvedDescription,
            reason: lateOutcome.reason,
          });
          content.setCleanerMessage(
            t(
              "contentConfirmedDeletion",
              resolvedDescription,
              `Confirmed deletion: ${resolvedDescription}`
            )
          );
          await content.waitForStatusIdle();
          content.setCleanerError("");
          return { success: true, description: resolvedDescription };
        }

        console.warn(
          "No confirm dialog and no visible deletion state after click for:",
          resolvedDescription
        );
        content.pushDebugEvent?.("delete_attempt:late_failure", {
          description: resolvedDescription,
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
          description: resolvedDescription,
        });
        return {
          success: false,
          reason: verificationDialogBlockedReason(),
        };
      }

      if (firstState.type === "failure") {
        console.warn("Delete failed for:", resolvedDescription, `(${firstState.message})`);
        content.pushDebugEvent?.("delete_attempt:failure_status", {
          description: resolvedDescription,
          reason: firstState.message || "delete failed",
        });
        return { success: false, reason: firstState.message || "delete failed" };
      }

      if (firstState.type === "confirm") {
        if (!(await content.pauseAwareSleep(content.getSettingValue("beforeConfirmClickMs")))) {
          return { success: false, reason: "stopped" };
        }

        if (!(await content.clickElement(firstState.confirmButton))) {
          console.warn("Could not click confirm button for:", resolvedDescription);
          return { success: false, reason: "could not click the confirmation button" };
        }

        if (!(await content.pauseAwareSleep(content.getSettingValue("afterConfirmClickMs")))) {
          return { success: false, reason: "stopped" };
        }
      }

      const outcome = await content.waitForDeleteOutcome(itemContainer, {
        firstStateType: firstState.type,
        expectedDescription: resolvedDescription,
        actionButton,
      });
      if (!outcome.success) {
        console.warn(`Delete not confirmed for: ${resolvedDescription} (${outcome.reason})`);
        content.pushDebugEvent?.("delete_attempt:outcome_failure", {
          description: resolvedDescription,
          reason: outcome.reason,
        });
        return { success: false, reason: outcome.reason };
      }

      console.log(`Confirmed deletion: ${resolvedDescription}`);
      content.pushDebugEvent?.("delete_attempt:success", {
        description: resolvedDescription,
        reason: outcome.reason,
      });
      content.setCleanerMessage(
        t(
          "contentConfirmedDeletion",
          resolvedDescription,
          `Confirmed deletion: ${resolvedDescription}`
        )
      );
      await content.waitForStatusIdle();
      content.setCleanerError("");
      return { success: true, description: resolvedDescription };
    },
  });

  content.Strategies = {
    ...(content.Strategies || {}),
    myActivityDelete: myActivityDeleteStrategy,
  };
})();
