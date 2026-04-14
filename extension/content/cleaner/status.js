(() => {
  const content = (globalThis.YtActivityCleanerContent =
    globalThis.YtActivityCleanerContent || {});

  const defaultStatusPatterns = Object.freeze({
    pending: [/deleting now|deleting|removing|usuwanie|trwa usuwanie/],
    success: [
      /\bitem deleted\b|\bitems deleted\b|deleted successfully|usunięto|element usunięty/,
    ],
    failure: [
      /couldn.?t delete|unable to delete|failed|something went wrong|nie udało się usunąć|nie można usunąć|błąd/,
    ],
  });

  content.getTargetStatusPatterns = () =>
    content.getTarget?.()?.statusPatterns || defaultStatusPatterns;

  content.matchesStatusPattern = (group, text) =>
    content
      .getTargetStatusPatterns()
      [group].some((pattern) => pattern.test(text));

  content.matchesPendingStatus = (text) =>
    content.matchesStatusPattern("pending", text);

  content.matchesSuccessStatus = (text) =>
    content.matchesStatusPattern("success", text);

  content.matchesFailureStatus = (text) =>
    content.matchesStatusPattern("failure", text);

  content.isCleanerStatusText = (text) =>
    content.matchesPendingStatus(text) ||
    content.matchesSuccessStatus(text) ||
    content.matchesFailureStatus(text);

  content.getStatusMessages = () => {
    const seen = new Set();

    return content
      .getVisibleMatches(content.getSelectorList?.("status") || [])
      .map((element) => content.normalizeText(element.innerText || element.textContent))
      .filter((text) => text && text.length <= 120)
      .filter(content.isCleanerStatusText)
      .filter((text) => {
        if (seen.has(text)) {
          return false;
        }

        seen.add(text);
        return true;
      });
  };

  content.getBusyStatusMessages = () =>
    content.getStatusMessages().filter(content.matchesPendingStatus);

  content.waitForStatusIdle = async () => {
    let quietSince = null;
    let deadline = Date.now() + content.getSettingValue("waitForBusyStateMs");

    while (Date.now() < deadline) {
      if (content.getState().stopRequested) {
        return false;
      }

      if (document.visibilityState !== "visible") {
        const pausedAt = Date.now();
        const stillRunning = await content.pauseUntilVisible();
        if (!stillRunning) {
          return false;
        }

        deadline += Date.now() - pausedAt;
      }

      const busyMessages = content.getBusyStatusMessages();
      if (!busyMessages.length) {
        if (!quietSince) {
          quietSince = Date.now();
        }

        if (Date.now() - quietSince >= content.getSettingValue("busyQuietMs")) {
          return true;
        }
      } else {
        quietSince = null;
      }

      await content.sleep(content.getSettingValue("pollMs"));
    }

    return false;
  };

  content.waitForDeleteOutcome = async (itemContainer, options = {}) => {
    let sawPending = false;
    let sawSuccess = false;
    let sawRemoval = false;
    let lastSuccessMessage = "";
    let deadline = Date.now() + content.getSettingValue("waitForRemovalMs");
    const allowRemovalWithoutSuccess =
      content.getSettingValue("allowRemovalWithoutSuccess") &&
      (options.firstStateType === "confirm" ||
        options.firstStateType === "status" ||
        options.firstStateType === "removed_without_confirm" ||
        options.firstStateType === "unknown_after_click");

    content.pushDebugEvent?.("wait_outcome:start", {
      firstStateType: options.firstStateType || "",
      expectedDescription: options.expectedDescription || "",
    });

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

      const messages = content.getStatusMessages();
      const failureMessage = messages.find(content.matchesFailureStatus);
      if (failureMessage) {
        content.pushDebugEvent?.("wait_outcome:failure", {
          reason: failureMessage,
        });
        return { success: false, reason: failureMessage };
      }

      if (messages.some(content.matchesPendingStatus)) {
        sawPending = true;
      }

      const successMessage = messages.find(content.matchesSuccessStatus);
      if (successMessage) {
        sawSuccess = true;
        lastSuccessMessage = successMessage;
        content.pushDebugEvent?.("wait_outcome:success_status", {
          message: successMessage,
        });
      }

      if (content.isItemGone(itemContainer)) {
        sawRemoval = true;
        content.pushDebugEvent?.("wait_outcome:item_gone");
      }

      if (!sawRemoval && options.actionButton && !options.actionButton.isConnected) {
        sawRemoval = true;
        content.pushDebugEvent?.("wait_outcome:action_gone");
      }

      if (
        !sawRemoval &&
        content.hasMeaningfulDescriptionChange?.(
          itemContainer,
          options.expectedDescription
        )
      ) {
        sawRemoval = true;
        content.pushDebugEvent?.("wait_outcome:item_changed", {
          expectedDescription: options.expectedDescription || "",
        });
      }

      if (sawSuccess && sawRemoval) {
        content.pushDebugEvent?.("wait_outcome:confirmed", {
          reason: lastSuccessMessage || "confirmed by ui",
        });
        return {
          success: true,
          reason: lastSuccessMessage || messages.join(" | ") || "confirmed by UI",
        };
      }

      if (allowRemovalWithoutSuccess && sawRemoval && !failureMessage) {
        content.pushDebugEvent?.("wait_outcome:confirmed_without_toast", {
          reason: lastSuccessMessage || "item disappeared or changed after the delete request",
        });
        return {
          success: true,
          reason:
            lastSuccessMessage ||
            "item disappeared or changed after the delete request",
        };
      }

      await content.sleep(content.getSettingValue("pollMs"));
    }

    return {
      success: false,
      reason: sawPending
        ? "timed out while waiting for final delete confirmation"
        : "item disappeared or changed without a final success message",
    };
  };
})();
