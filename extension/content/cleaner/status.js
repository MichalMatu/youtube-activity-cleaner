(() => {
  const content = (globalThis.YtActivityCleanerContent =
    globalThis.YtActivityCleanerContent || {});

  content.getStatusMessages = () => {
    const seen = new Set();

    return content
      .getVisibleMatches(content.selectors.status)
      .map((element) => content.normalizeText(element.innerText || element.textContent))
      .filter((text) => text && text.length <= 120)
      .filter((text) => {
        if (seen.has(text)) {
          return false;
        }

        seen.add(text);
        return true;
      });
  };

  content.matchesPendingStatus = (text) =>
    /deleting now|deleting|removing|usuwanie|trwa usuwanie/.test(text);

  content.matchesSuccessStatus = (text) =>
    /\bitem deleted\b|\bitems deleted\b|deleted successfully|usunięto|element usunięty/.test(
      text
    );

  content.matchesFailureStatus = (text) =>
    /couldn.?t delete|unable to delete|failed|something went wrong|nie udało się usunąć|nie można usunąć|błąd/.test(
      text
    );

  content.waitForStatusIdle = async () => {
    let quietSince = null;
    let deadline = Date.now() + content.config.waitForStatusIdleMs;

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

      const messages = content.getStatusMessages();
      if (!messages.length) {
        if (!quietSince) {
          quietSince = Date.now();
        }

        if (Date.now() - quietSince >= content.config.statusQuietMs) {
          return true;
        }
      } else {
        quietSince = null;
      }

      await content.sleep(content.config.pollMs);
    }

    return false;
  };

  content.waitForDeleteOutcome = async (itemContainer) => {
    let sawPending = false;
    let sawSuccess = false;
    let sawRemoval = false;
    let lastSuccessMessage = "";
    let deadline = Date.now() + content.config.waitForRemovalMs;

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
        return { success: false, reason: failureMessage };
      }

      if (messages.some(content.matchesPendingStatus)) {
        sawPending = true;
      }

      const successMessage = messages.find(content.matchesSuccessStatus);
      if (successMessage) {
        sawSuccess = true;
        lastSuccessMessage = successMessage;
      }

      if (content.isItemGone(itemContainer)) {
        sawRemoval = true;
      }

      if (sawSuccess && sawRemoval) {
        return {
          success: true,
          reason: lastSuccessMessage || messages.join(" | ") || "confirmed by UI",
        };
      }

      await content.sleep(content.config.pollMs);
    }

    return {
      success: false,
      reason: sawPending
        ? "timed out while waiting for final delete confirmation"
        : "item disappeared without a final success message",
    };
  };
})();
