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

  const toPlaylistActionCandidate = (actionButtonOrCandidate, description) => {
    const actionButton =
      content.getCandidateElement?.(actionButtonOrCandidate) || actionButtonOrCandidate;

    return content.resolveActionCandidate(actionButtonOrCandidate, {
      description,
      itemContainer: actionButton ? content.getItemContainer(actionButton) : null,
      kind: "playlist-action",
    });
  };

  const playlistRemoveStrategy = Object.freeze({
    id: "playlistRemove",
    collectActionCandidates: () =>
      content
        .getVisibleActionButtons()
        .map((actionButton) =>
          toPlaylistActionCandidate(actionButton, content.describeItem(actionButton))
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
      const nextActionButton = content.findRetryActionButton(
        previousActionButton,
        description
      );

      return nextActionButton
        ? toPlaylistActionCandidate(nextActionButton, description)
        : null;
    },
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
    runSingleAttempt: async (actionCandidate, description) => {
      const state = content.getState();
      const candidate = toPlaylistActionCandidate(actionCandidate, description);
      const actionButton = content.getCandidateElement(candidate);
      const itemContainer = content.getCandidateItemContainer(candidate);
      const resolvedDescription =
        description || content.getCandidateDescription(candidate) || "unknown item";

      if (!actionButton) {
        return { success: false, reason: "could not find the action menu button" };
      }

      state.lastItem = resolvedDescription;
      content.pushDebugEvent?.("like_attempt:start", {
        description: resolvedDescription,
      });
      content.setCleanerMessage(
        t(
          "contentPreparingToRemoveLike",
          resolvedDescription,
          `Preparing to remove like: ${resolvedDescription}`
        )
      );
      content.setCleanerError("");
      state.retryAttempt = 0;
      state.retryDelayMs = 0;

      if (!(await content.clickElement(actionButton))) {
        console.warn("Could not click action menu button for:", resolvedDescription);
        return { success: false, reason: "could not click the action menu button" };
      }

      const removeMenuItem = await content.waitFor(
        () => getVisibleUnlikeMenuItem(),
        content.getSettingValue("waitForPostClickStateMs")
      );

      if (!removeMenuItem) {
        console.warn("Could not find the unlike menu item for:", resolvedDescription);
        content.pushDebugEvent?.("like_attempt:no_menu_item", {
          description: resolvedDescription,
        });
        return {
          success: false,
          reason: "could not find the remove-from-liked-videos menu item",
        };
      }

      if (!(await content.clickElement(removeMenuItem))) {
        console.warn("Could not click the unlike menu item for:", resolvedDescription);
        content.pushDebugEvent?.("like_attempt:menu_click_failed", {
          description: resolvedDescription,
        });
        return {
          success: false,
          reason: "could not click the remove-from-liked-videos menu item",
        };
      }

      const outcome = await waitForItemRemoval(
        itemContainer,
        resolvedDescription,
        content.getSettingValue("waitForRemovalMs"),
        "timed out while waiting for the liked video to disappear"
      );
      if (!outcome.success) {
        console.warn(
          `Like removal not confirmed for: ${resolvedDescription} (${outcome.reason})`
        );
        content.pushDebugEvent?.("like_attempt:failure", {
          description: resolvedDescription,
          reason: outcome.reason,
        });
        return outcome;
      }

      console.log(`Removed like: ${resolvedDescription}`);
      content.pushDebugEvent?.("like_attempt:success", {
        description: resolvedDescription,
        reason: outcome.reason,
      });
      content.setCleanerMessage(
        t(
          "contentConfirmedUnlike",
          resolvedDescription,
          `Removed like: ${resolvedDescription}`
        )
      );
      content.setCleanerError("");
      return { success: true, description: resolvedDescription };
    },
  });

  content.Strategies = {
    ...(content.Strategies || {}),
    playlistRemove: playlistRemoveStrategy,
  };
})();
