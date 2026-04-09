const YT_ACTIVITY_CLEANER_CONFIG = {
  beforeClickMs: 650,
  beforeConfirmClickMs: 1100,
  afterConfirmClickMs: 500,
  betweenItemsMs: 3200,
  scrollPauseMs: 2200,
  scrollStepPx: 900,
  waitForRemovalMs: 25000,
  waitForPostClickStateMs: 9000,
  waitForStatusIdleMs: 12000,
  statusQuietMs: 1200,
  pollMs: 250,
  idleRoundsLimit: 7,
  failureStreakLimit: 4,
};

const YT_ACTIVITY_CLEANER_DELETE_SELECTORS = [
  'button[aria-label*="Delete activity item"]',
  'button[aria-label*="Delete activity"]',
  'button[aria-label*="Usu\\u0144 element aktywno\\u015bci"]',
  'button[aria-label*="Usu\\u0144 aktywno\\u015b\\u0107"]',
];

const YT_ACTIVITY_CLEANER_CONFIRM_SELECTORS = [
  'button[aria-label="Delete"]',
  'button[aria-label="Usu\\u0144"]',
];

const YT_ACTIVITY_CLEANER_STATUS_SELECTORS = [
  '[jsname="PJEsad"]',
  '[jsname="vyyg5"]',
  '[role="status"]',
  '[aria-live="assertive"]',
  '[aria-live="polite"]',
];

const YT_ACTIVITY_CLEANER_LOAD_MORE_SELECTORS = [
  'button[jsname="T8gEfd"]',
  ".ksBjEc.lKxP2d.LQeN7",
];

const ytActivityCleanerState = {
  running: false,
  stopRequested: false,
  paused: false,
  attempted: 0,
  deleted: 0,
  failed: 0,
  lastMessage: "Idle.",
  lastItem: "",
};

const ytActivityCleanerSleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const ytActivityCleanerScrollRoot =
  document.scrollingElement || document.documentElement;

const normalizeText = (value) =>
  (value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const isSupportedPage = () =>
  window.location.hostname === "myactivity.google.com" &&
  window.location.href.includes("page=youtube_comments");

const getCleanerStatus = () => ({
  running: ytActivityCleanerState.running,
  stopRequested: ytActivityCleanerState.stopRequested,
  paused: ytActivityCleanerState.paused,
  attempted: ytActivityCleanerState.attempted,
  deleted: ytActivityCleanerState.deleted,
  failed: ytActivityCleanerState.failed,
  lastMessage: ytActivityCleanerState.lastMessage,
  lastItem: ytActivityCleanerState.lastItem,
  supportedPage: isSupportedPage(),
  visibilityState: document.visibilityState,
});

const setCleanerMessage = (message) => {
  ytActivityCleanerState.lastMessage = message;
};

const isVisible = (element) => {
  if (!element || element.disabled || !element.isConnected) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  const style = getComputedStyle(element);

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.visibility !== "hidden" &&
    style.display !== "none"
  );
};

const getVisibleMatches = (selectors) =>
  selectors
    .flatMap((selector) => [...document.querySelectorAll(selector)])
    .filter(isVisible);

const getVisibleDeleteButtons = () =>
  getVisibleMatches(YT_ACTIVITY_CLEANER_DELETE_SELECTORS);

const isConfirmLabel = (element) => {
  const label = normalizeText(
    element.innerText || element.textContent || element.getAttribute("aria-label")
  );

  return label === "delete" || label === "usuń" || label === "usun";
};

const getConfirmButton = () => {
  const buttons = getVisibleMatches(YT_ACTIVITY_CLEANER_CONFIRM_SELECTORS).filter(
    isConfirmLabel
  );

  return (
    buttons.find((element) => element.closest('[role="dialog"]')) || buttons[0] || null
  );
};

const getStatusMessages = () => {
  const seen = new Set();

  return getVisibleMatches(YT_ACTIVITY_CLEANER_STATUS_SELECTORS)
    .map((element) => normalizeText(element.innerText || element.textContent))
    .filter((text) => text && text.length <= 120)
    .filter((text) => {
      if (seen.has(text)) {
        return false;
      }

      seen.add(text);
      return true;
    });
};

const matchesPendingStatus = (text) =>
  /deleting now|deleting|removing|usuwanie|trwa usuwanie/.test(text);

const matchesSuccessStatus = (text) =>
  /\bitem deleted\b|\bitems deleted\b|deleted successfully|usunięto|element usunięty/.test(
    text
  );

const matchesFailureStatus = (text) =>
  /couldn.?t delete|unable to delete|failed|something went wrong|nie udało się usunąć|nie można usunąć|błąd/.test(
    text
  );

const pauseUntilVisible = async () => {
  if (document.visibilityState === "visible") {
    if (ytActivityCleanerState.paused) {
      ytActivityCleanerState.paused = false;
      setCleanerMessage("Resumed after the tab became visible.");
    }

    return true;
  }

  ytActivityCleanerState.paused = true;
  setCleanerMessage("Paused. Bring this tab to the front to continue.");

  while (document.visibilityState !== "visible") {
    if (ytActivityCleanerState.stopRequested) {
      return false;
    }

    await ytActivityCleanerSleep(300);
  }

  ytActivityCleanerState.paused = false;
  setCleanerMessage("Tab active again. Continuing cleanup...");
  return true;
};

const pauseAwareSleep = async (ms) => {
  let remaining = ms;

  while (remaining > 0) {
    if (ytActivityCleanerState.stopRequested) {
      return false;
    }

    if (!(await pauseUntilVisible())) {
      return false;
    }

    const chunk = Math.min(remaining, 200);
    const startedAt = Date.now();
    await ytActivityCleanerSleep(chunk);

    if (document.visibilityState === "visible") {
      remaining -= Date.now() - startedAt;
    }
  }

  return true;
};

const waitFor = async (fn, timeoutMs) => {
  let deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (ytActivityCleanerState.stopRequested) {
      return null;
    }

    if (document.visibilityState !== "visible") {
      const pausedAt = Date.now();
      const stillRunning = await pauseUntilVisible();
      if (!stillRunning) {
        return null;
      }

      deadline += Date.now() - pausedAt;
    }

    const result = fn();
    if (result) {
      return result;
    }

    await ytActivityCleanerSleep(YT_ACTIVITY_CLEANER_CONFIG.pollMs);
  }

  return null;
};

const waitForStatusIdle = async () => {
  let quietSince = null;
  let deadline = Date.now() + YT_ACTIVITY_CLEANER_CONFIG.waitForStatusIdleMs;

  while (Date.now() < deadline) {
    if (ytActivityCleanerState.stopRequested) {
      return false;
    }

    if (document.visibilityState !== "visible") {
      const pausedAt = Date.now();
      const stillRunning = await pauseUntilVisible();
      if (!stillRunning) {
        return false;
      }

      deadline += Date.now() - pausedAt;
    }

    const messages = getStatusMessages();
    if (!messages.length) {
      if (!quietSince) {
        quietSince = Date.now();
      }

      if (Date.now() - quietSince >= YT_ACTIVITY_CLEANER_CONFIG.statusQuietMs) {
        return true;
      }
    } else {
      quietSince = null;
    }

    await ytActivityCleanerSleep(YT_ACTIVITY_CLEANER_CONFIG.pollMs);
  }

  return false;
};

const clickElement = async (element) => {
  if (!element || !element.isConnected) {
    return false;
  }

  if (!(await pauseUntilVisible())) {
    return false;
  }

  element.scrollIntoView({
    block: "center",
    inline: "center",
    behavior: "auto",
  });

  if (!(await pauseAwareSleep(YT_ACTIVITY_CLEANER_CONFIG.beforeClickMs))) {
    return false;
  }

  if (!isVisible(element)) {
    return false;
  }

  element.click();
  return true;
};

const describeItem = (element) => {
  if (!element || !element.isConnected) {
    return "unknown item";
  }

  const card =
    element.closest('c-wiz[jsname="Ttx95"]') ||
    element.closest('[role="listitem"]') ||
    element.closest("c-wiz") ||
    element.parentElement;

  const primary =
    card?.querySelector(".QTGV3c")?.textContent ||
    card?.querySelector(".SiEggd")?.textContent ||
    element.innerText ||
    "";

  return normalizeText(primary).slice(0, 120) || "unknown item";
};

const getItemContainer = (element) =>
  element?.closest('c-wiz[jsname="Ttx95"]') ||
  element?.closest('[role="listitem"]') ||
  element?.closest("c-wiz") ||
  element?.closest("li") ||
  element?.parentElement ||
  null;

const isItemGone = (itemContainer) => {
  if (!itemContainer?.isConnected) {
    return true;
  }

  return !isVisible(itemContainer);
};

const getLoadMoreButton = () =>
  getVisibleMatches(YT_ACTIVITY_CLEANER_LOAD_MORE_SELECTORS)[0] || null;

const waitForDeleteOutcome = async (itemContainer) => {
  let sawPending = false;
  let sawSuccess = false;
  let sawRemoval = false;
  let lastSuccessMessage = "";
  let deadline = Date.now() + YT_ACTIVITY_CLEANER_CONFIG.waitForRemovalMs;

  while (Date.now() < deadline) {
    if (ytActivityCleanerState.stopRequested) {
      return { success: false, reason: "stopped" };
    }

    if (document.visibilityState !== "visible") {
      const pausedAt = Date.now();
      const stillRunning = await pauseUntilVisible();
      if (!stillRunning) {
        return { success: false, reason: "stopped" };
      }

      deadline += Date.now() - pausedAt;
    }

    const messages = getStatusMessages();
    const failureMessage = messages.find(matchesFailureStatus);
    if (failureMessage) {
      return { success: false, reason: failureMessage };
    }

    if (messages.some(matchesPendingStatus)) {
      sawPending = true;
    }

    const successMessage = messages.find(matchesSuccessStatus);
    if (successMessage) {
      sawSuccess = true;
      lastSuccessMessage = successMessage;
    }

    if (isItemGone(itemContainer)) {
      sawRemoval = true;
    }

    if (sawSuccess && sawRemoval) {
      return {
        success: true,
        reason: lastSuccessMessage || messages.join(" | ") || "confirmed by UI",
      };
    }

    await ytActivityCleanerSleep(YT_ACTIVITY_CLEANER_CONFIG.pollMs);
  }

  return {
    success: false,
    reason: sawPending
      ? "timed out while waiting for final delete confirmation"
      : "item disappeared without a final success message",
  };
};

const deleteOneItem = async (deleteButton) => {
  const itemContainer = getItemContainer(deleteButton);
  const description = describeItem(deleteButton);

  ytActivityCleanerState.lastItem = description;
  setCleanerMessage(`Preparing to delete: ${description}`);

  await waitForStatusIdle();

  if (!(await clickElement(deleteButton))) {
    console.warn("Could not click delete button for:", description);
    setCleanerMessage(`Could not click delete for: ${description}`);
    return false;
  }

  const firstState = await waitFor(() => {
    const confirmButton = getConfirmButton();
    if (confirmButton) {
      return { type: "confirm", confirmButton };
    }

    const messages = getStatusMessages();
    const failureMessage = messages.find(matchesFailureStatus);
    if (failureMessage) {
      return { type: "failure", message: failureMessage };
    }

    if (messages.some(matchesPendingStatus) || messages.some(matchesSuccessStatus)) {
      return { type: "status" };
    }

    if (isItemGone(itemContainer)) {
      return { type: "removed_without_confirm" };
    }

    return null;
  }, YT_ACTIVITY_CLEANER_CONFIG.waitForPostClickStateMs);

  if (!firstState) {
    console.warn("No confirm dialog and no visible deletion state after click for:", description);
    setCleanerMessage(`No deletion state after click for: ${description}`);
    return false;
  }

  if (firstState.type === "failure") {
    console.warn("Delete failed for:", description, `(${firstState.message})`);
    setCleanerMessage(`Delete failed for: ${description}`);
    return false;
  }

  if (firstState.type === "confirm") {
    if (!(await pauseAwareSleep(YT_ACTIVITY_CLEANER_CONFIG.beforeConfirmClickMs))) {
      return false;
    }

    if (!(await clickElement(firstState.confirmButton))) {
      console.warn("Could not click confirm button for:", description);
      setCleanerMessage(`Could not confirm delete for: ${description}`);
      return false;
    }

    if (!(await pauseAwareSleep(YT_ACTIVITY_CLEANER_CONFIG.afterConfirmClickMs))) {
      return false;
    }
  }

  const outcome = await waitForDeleteOutcome(itemContainer);
  if (!outcome.success) {
    console.warn(`Delete not confirmed for: ${description} (${outcome.reason})`);
    setCleanerMessage(`Delete not confirmed for: ${description}`);
    return false;
  }

  console.log(`Confirmed deletion: ${description}`);
  setCleanerMessage(`Confirmed deletion: ${description}`);
  await waitForStatusIdle();
  return true;
};

const runCleaner = async () => {
  let idleRounds = 0;
  let failureStreak = 0;

  setCleanerMessage("Cleaner started.");
  console.log("YouTube Activity Cleaner started from the extension.");

  while (!ytActivityCleanerState.stopRequested) {
    const deleteButton = getVisibleDeleteButtons()[0];

    if (deleteButton) {
      ytActivityCleanerState.attempted += 1;
      const success = await deleteOneItem(deleteButton);

      if (success) {
        ytActivityCleanerState.deleted += 1;
        idleRounds = 0;
        failureStreak = 0;
        setCleanerMessage(`Deleted comments: ${ytActivityCleanerState.deleted}`);

        if (!(await pauseAwareSleep(YT_ACTIVITY_CLEANER_CONFIG.betweenItemsMs))) {
          break;
        }

        continue;
      }

      ytActivityCleanerState.failed += 1;
      failureStreak += 1;
      setCleanerMessage(
        `Failed attempts in a row: ${failureStreak}. Total failed: ${ytActivityCleanerState.failed}`
      );

      if (failureStreak >= YT_ACTIVITY_CLEANER_CONFIG.failureStreakLimit) {
        setCleanerMessage("Stopped after several unconfirmed deletions in a row.");
        break;
      }

      await waitForStatusIdle();
      if (!(await pauseAwareSleep(YT_ACTIVITY_CLEANER_CONFIG.scrollPauseMs))) {
        break;
      }

      continue;
    }

    const loadMoreButton = getLoadMoreButton();
    if (loadMoreButton) {
      setCleanerMessage("Loading more activity items...");
      await clickElement(loadMoreButton);

      if (!(await pauseAwareSleep(YT_ACTIVITY_CLEANER_CONFIG.scrollPauseMs))) {
        break;
      }

      idleRounds = 0;
      continue;
    }

    const previousTop = ytActivityCleanerScrollRoot.scrollTop;
    const previousHeight = ytActivityCleanerScrollRoot.scrollHeight;

    ytActivityCleanerScrollRoot.scrollBy(
      0,
      Math.max(window.innerHeight * 0.9, YT_ACTIVITY_CLEANER_CONFIG.scrollStepPx)
    );

    if (!(await pauseAwareSleep(YT_ACTIVITY_CLEANER_CONFIG.scrollPauseMs))) {
      break;
    }

    const topChanged = ytActivityCleanerScrollRoot.scrollTop !== previousTop;
    const heightChanged = ytActivityCleanerScrollRoot.scrollHeight !== previousHeight;

    if (!topChanged && !heightChanged) {
      idleRounds += 1;
    } else {
      idleRounds = 0;
    }

    if (idleRounds >= YT_ACTIVITY_CLEANER_CONFIG.idleRoundsLimit) {
      setCleanerMessage("No more visible delete buttons were found.");
      break;
    }
  }

  ytActivityCleanerState.running = false;
  ytActivityCleanerState.paused = false;

  if (ytActivityCleanerState.stopRequested) {
    setCleanerMessage("Stopped by the user.");
  } else if (!ytActivityCleanerState.lastMessage) {
    setCleanerMessage("Finished.");
  }

  ytActivityCleanerState.stopRequested = false;
  console.log("YouTube Activity Cleaner finished.", getCleanerStatus());
};

const startCleaner = () => {
  if (ytActivityCleanerState.running) {
    return getCleanerStatus();
  }

  if (!isSupportedPage()) {
    setCleanerMessage("Open the Your YouTube comments page in Google My Activity first.");
    return getCleanerStatus();
  }

  ytActivityCleanerState.running = true;
  ytActivityCleanerState.stopRequested = false;
  ytActivityCleanerState.paused = false;
  ytActivityCleanerState.attempted = 0;
  ytActivityCleanerState.deleted = 0;
  ytActivityCleanerState.failed = 0;
  ytActivityCleanerState.lastItem = "";
  setCleanerMessage("Starting cleaner...");

  runCleaner().catch((error) => {
    ytActivityCleanerState.running = false;
    ytActivityCleanerState.paused = false;
    ytActivityCleanerState.stopRequested = false;
    ytActivityCleanerState.failed += 1;
    setCleanerMessage(`Cleaner stopped because of an error: ${error.message}`);
    console.error("YouTube Activity Cleaner stopped because of an error:", error);
  });

  return getCleanerStatus();
};

const stopCleaner = () => {
  ytActivityCleanerState.stopRequested = true;
  setCleanerMessage("Stopping after the current step...");
  return getCleanerStatus();
};

document.addEventListener("visibilitychange", () => {
  if (!ytActivityCleanerState.running) {
    return;
  }

  if (document.visibilityState === "visible") {
    ytActivityCleanerState.paused = false;
    setCleanerMessage("Tab active again. Continuing cleanup...");
    return;
  }

  ytActivityCleanerState.paused = true;
  setCleanerMessage("Paused. Bring this tab to the front to continue.");
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message?.type) {
    return;
  }

  if (message.type === "getStatus") {
    sendResponse({ ok: true, status: getCleanerStatus() });
    return;
  }

  if (message.type === "start") {
    sendResponse({ ok: true, status: startCleaner() });
    return;
  }

  if (message.type === "stop") {
    sendResponse({ ok: true, status: stopCleaner() });
  }
});
