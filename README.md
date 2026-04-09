# YouTube Activity Cleaner

This repository contains a browser-console script for removing your YouTube comments from Google My Activity.

## Quick Flow

1. Open `YouTube -> History`
2. Click `Manage all history`
3. Find and open the `Comments` section
4. Open browser Developer Tools
5. Copy `yt-comment-cleaner.js`
6. Paste it into the browser console and press Enter
7. Stop it later with `stopYtCommentCleaner()`

## Step-By-Step Guide

### 1. Open the History page on YouTube

Open YouTube and use the left sidebar to open `History`.

### 2. Click `Manage all history`

On the History page, click `Manage all history`.

<p align="center">
  <img src="screenshots/01-youtube-history-sidebar.png" alt="Open YouTube History" width="150">
  <img src="screenshots/02-youtube-history-manage-all-history.png" alt="Open Manage all history" width="190">
</p>

### 3. Find the `Comments` section

After Google My Activity opens, find the `Comments` section and open it.

If you want, you can also open the comments page directly:

`https://myactivity.google.com/page?hl=en-GB&utm_medium=web&utm_source=youtube&page=youtube_comments`

This is the page where the script should be run:

<img src="screenshots/03-google-my-activity-comments-page.png" alt="Google My Activity comments page" width="900">

### 4. Open Developer Tools in your browser

Open Developer Tools and switch to the `Console` tab.

Common shortcuts:

- macOS, Chrome / Edge / Brave: `Option + Command + J`
- macOS, alternative DevTools shortcut: `Option + Command + I`
- Windows / Linux, Chrome / Edge / Brave: `Ctrl + Shift + J`
- Windows / Linux, alternative DevTools shortcut: `F12`

If shortcuts do not work, try one of these methods:

- right-click anywhere on the page and choose `Inspect`
- open the browser menu and find `Developer Tools`

### 5. Copy the script

Open [yt-comment-cleaner.js](yt-comment-cleaner.js) and copy the whole file.

The easiest way:

- open the file
- if you are on GitHub, use the file view and copy the full contents from there
- select all
- copy everything

Keyboard shortcuts:

- macOS: `Command + A`, then `Command + C`
- Windows / Linux: `Ctrl + A`, then `Ctrl + C`

> [!IMPORTANT]
> If you are reading this on GitHub, open the block below and use the built-in `Copy` button in the top-right corner of the code block. Then paste it directly into your browser console.

<br>

<details>
<summary><strong>Copy and paste this into the browser console</strong></summary>

```js
(() => {
  if (window.__ytCommentCleanerRunning) {
    console.warn(
      "Cleaner is already running. Run stopYtCommentCleaner() if you want to stop it."
    );
    return;
  }

  const CONFIG = {
    beforeClickMs: 500,
    beforeConfirmClickMs: 900,
    afterConfirmClickMs: 1800,
    betweenItemsMs: 2200,
    scrollPauseMs: 2400,
    scrollStepPx: 900,
    waitForConfirmMs: 8000,
    waitForRemovalMs: 15000,
    waitForPostClickStateMs: 6000,
    pollMs: 250,
    idleRoundsLimit: 7,
    failureStreakLimit: 3,
  };

  const DELETE_SELECTORS = [
    '[aria-label*="Delete activity item"]',
    '[aria-label*="Delete activity"]',
    '[aria-label*="Usu\\u0144 element aktywno\\u015bci"]',
    '[aria-label*="Usu\\u0144 aktywno\\u015b\\u0107"]',
  ];

  const CONFIRM_SELECTORS = [
    'button[aria-label="Delete"]',
    'button[aria-label="Usu\\u0144"]',
  ];

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const scrollRoot = document.scrollingElement || document.documentElement;

  const normalizeText = (value) =>
    (value || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

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

  const getVisibleDeleteButtons = () => getVisibleMatches(DELETE_SELECTORS);

  const isConfirmLabel = (element) => {
    const label = normalizeText(
      element.innerText || element.textContent || element.getAttribute("aria-label")
    );

    return label === "delete" || label === "usuń";
  };

  const getConfirmButton = () => {
    const buttons = getVisibleMatches(CONFIRM_SELECTORS).filter(isConfirmLabel);
    return (
      buttons.find((element) => element.closest('[role="dialog"]')) || buttons[0] || null
    );
  };

  const waitFor = async (fn, timeoutMs) => {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      if (window.__ytCommentCleanerStop) {
        return null;
      }

      const result = fn();
      if (result) {
        return result;
      }

      await sleep(CONFIG.pollMs);
    }

    return null;
  };

  const clickElement = async (element) => {
    if (!element || !element.isConnected) {
      return false;
    }

    element.scrollIntoView({
      block: "center",
      inline: "center",
      behavior: "auto",
    });

    await sleep(CONFIG.beforeClickMs);

    if (!isVisible(element)) {
      return false;
    }

    element.click();
    return true;
  };

  const describeButton = (element) => {
    if (!element || !element.isConnected) {
      return "unknown item";
    }

    const container =
      element.closest('[role="listitem"]') ||
      element.closest("c-wiz") ||
      element.closest("li") ||
      element.parentElement;
    const text = normalizeText(container?.innerText || element.innerText || "");

    return text.slice(0, 80) || "unknown item";
  };

  const getItemContainer = (element) =>
    element?.closest('[role="listitem"]') ||
    element?.closest("c-wiz") ||
    element?.closest("li") ||
    element?.parentElement ||
    null;

  window.__ytCommentCleanerRunning = true;
  window.__ytCommentCleanerStop = false;
  window.__ytCommentCleanerStatus = {
    attempted: 0,
    deleted: 0,
    failed: 0,
  };

  window.stopYtCommentCleaner = () => {
    window.__ytCommentCleanerStop = true;
    console.log("Stopping after the current step...");
  };

  const deleteOneItem = async (deleteButton) => {
    const beforeVisibleDeleteCount = getVisibleDeleteButtons().length;
    const itemContainer = getItemContainer(deleteButton);
    const description = describeButton(deleteButton);

    if (!(await clickElement(deleteButton))) {
      console.warn("Could not click delete button for:", description);
      return false;
    }

    const firstState = await waitFor(() => {
      const confirmButton = getConfirmButton();
      if (confirmButton) {
        return { type: "confirm", confirmButton };
      }

      const targetGone = !deleteButton.isConnected || !isVisible(deleteButton);
      const containerGone = itemContainer ? !itemContainer.isConnected : false;
      const deleteCountDropped =
        getVisibleDeleteButtons().length < beforeVisibleDeleteCount;

      if (targetGone || containerGone || deleteCountDropped) {
        return { type: "removed_without_confirm" };
      }

      return null;
    }, CONFIG.waitForPostClickStateMs);

    if (!firstState) {
      console.warn("No confirm dialog and no visible removal after click for:", description);
      return false;
    }

    if (firstState.type === "removed_without_confirm") {
      await sleep(CONFIG.afterConfirmClickMs);
      return true;
    }

    const { confirmButton } = firstState;

    await sleep(CONFIG.beforeConfirmClickMs);

    if (!(await clickElement(confirmButton))) {
      console.warn("Could not click confirm button for:", description);
      return false;
    }

    await sleep(CONFIG.afterConfirmClickMs);

    const removed = await waitFor(() => {
      const targetGone = !deleteButton.isConnected || !isVisible(deleteButton);
      const containerGone = itemContainer ? !itemContainer.isConnected : false;
      const confirmGone = !getConfirmButton();
      const deleteCountDropped =
        getVisibleDeleteButtons().length < beforeVisibleDeleteCount;

      return confirmGone && (targetGone || containerGone || deleteCountDropped);
    }, CONFIG.waitForRemovalMs);

    if (!removed) {
      console.warn("Timed out waiting for removal of:", description);
      return false;
    }

    return true;
  };

  (async () => {
    let idleRounds = 0;
    let failureStreak = 0;

    console.log("YouTube comment cleaner started.");
    console.log("This version handles both flows: with confirm dialog or direct removal.");
    console.log("To stop it, run: stopYtCommentCleaner()");

    while (!window.__ytCommentCleanerStop) {
      const deleteButton = getVisibleDeleteButtons()[0];

      if (deleteButton) {
        window.__ytCommentCleanerStatus.attempted += 1;

        const success = await deleteOneItem(deleteButton);
        if (success) {
          window.__ytCommentCleanerStatus.deleted += 1;
          idleRounds = 0;
          failureStreak = 0;
          console.log(`Deleted comments: ${window.__ytCommentCleanerStatus.deleted}`);
          await sleep(CONFIG.betweenItemsMs);
          continue;
        }

        window.__ytCommentCleanerStatus.failed += 1;
        failureStreak += 1;
        console.warn(
          `Failed attempts in a row: ${failureStreak}. Total failed: ${window.__ytCommentCleanerStatus.failed}`
        );

        if (failureStreak >= CONFIG.failureStreakLimit) {
          console.warn(
            "Stopping because the page did not confirm several deletions in a row."
          );
          break;
        }

        scrollRoot.scrollBy(0, Math.max(window.innerHeight * 0.6, 450));
        await sleep(CONFIG.scrollPauseMs);
        continue;
      }

      const previousTop = scrollRoot.scrollTop;
      const previousHeight = scrollRoot.scrollHeight;

      scrollRoot.scrollBy(0, Math.max(window.innerHeight * 0.9, CONFIG.scrollStepPx));
      await sleep(CONFIG.scrollPauseMs);

      const topChanged = scrollRoot.scrollTop !== previousTop;
      const heightChanged = scrollRoot.scrollHeight !== previousHeight;

      if (!topChanged && !heightChanged) {
        idleRounds += 1;
      } else {
        idleRounds = 0;
      }

      if (idleRounds >= CONFIG.idleRoundsLimit) {
        console.log("No more visible delete buttons were found.");
        break;
      }
    }

    console.log(
      `Finished. Deleted: ${window.__ytCommentCleanerStatus.deleted}, attempts: ${window.__ytCommentCleanerStatus.attempted}, failed: ${window.__ytCommentCleanerStatus.failed}`
    );
    window.__ytCommentCleanerRunning = false;
  })().catch((error) => {
    console.error("Cleaner stopped because of an error:", error);
    window.__ytCommentCleanerRunning = false;
  });
})();
```

</details>

<br>

### 6. Paste the script into the console

Click inside the browser console, paste the full script, and press Enter.

Paste it into the empty console input area shown below:

<img src="screenshots/04-browser-console-paste-here.png" alt="Paste the script into the browser console" width="900">

If Chrome blocks pasting, type:

```js
allow pasting
```

and press Enter first. Then paste the script again.

### 7. Let the script run

The script will:

- look for visible delete buttons
- handle both flows: direct removal after clicking `X`, or removal with a confirmation dialog
- wait until each item disappears before moving to the next one
- scroll automatically to continue processing more comments

While it is running, the console will print progress like:

```js
Deleted comments: 1
Deleted comments: 2
Deleted comments: 3
```

When it finishes, it will print a summary:

```js
Finished. Deleted: X, attempts: Y, failed: Z
```

### 8. Stop the script

If you want to stop it while it is running, paste this into the console:

```js
stopYtCommentCleaner()
```

## Notes

- This is a UI automation script, not an official YouTube bulk-delete feature.
- Google can change the page layout at any time, which may break selectors.
- It is a good idea to test the script on a few comments first.
- Google may take some time to fully reflect deletions after they are triggered.
- This repository currently focuses on comment removal. Like removal is not implemented yet.
