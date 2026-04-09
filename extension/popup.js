const COMMENTS_PAGE_URL =
  "https://myactivity.google.com/page?hl=en-GB&utm_medium=web&utm_source=youtube&page=youtube_comments";
const SUPPORTED_PAGE_FRAGMENT = "page=youtube_comments";

const pageStateElement = document.querySelector("#page-state");
const runStateElement = document.querySelector("#run-state");
const deletedCountElement = document.querySelector("#deleted-count");
const attemptedCountElement = document.querySelector("#attempted-count");
const failedCountElement = document.querySelector("#failed-count");
const startButton = document.querySelector("#start-button");
const stopButton = document.querySelector("#stop-button");
const openPageButton = document.querySelector("#open-page-button");
const supportButton = document.querySelector("#support-button");
const SUPPORT_URL = "https://buymeacoffee.com/michalmatuh";

const getActiveTab = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
};

const isSupportedUrl = (url) =>
  typeof url === "string" &&
  url.startsWith("https://myactivity.google.com/") &&
  url.includes(SUPPORTED_PAGE_FRAGMENT);

const setButtonsState = ({ canStart, canStop }) => {
  startButton.disabled = !canStart;
  stopButton.disabled = !canStop;
};

const renderStatus = (status, tab) => {
  const onSupportedPage = isSupportedUrl(tab?.url);
  pageStateElement.textContent = onSupportedPage
    ? "Ready on the YouTube comments page."
    : "Open Google My Activity -> Your YouTube comments.";

  deletedCountElement.textContent = String(status?.deleted || 0);
  attemptedCountElement.textContent = String(status?.attempted || 0);
  failedCountElement.textContent = String(status?.failed || 0);

  if (!onSupportedPage) {
    runStateElement.textContent = "This extension works only on the YouTube comments page.";
    setButtonsState({ canStart: false, canStop: false });
    return;
  }

  if (status?.running) {
    runStateElement.textContent =
      status.lastMessage || "Cleaner is running on the current page.";
    setButtonsState({ canStart: false, canStop: true });
    return;
  }

  runStateElement.textContent = status?.lastMessage || "Cleaner is idle.";
  setButtonsState({ canStart: true, canStop: false });
};

const renderError = (message, tab) => {
  renderStatus(null, tab);
  runStateElement.textContent = message;
};

const sendToTab = async (message) => {
  const tab = await getActiveTab();
  if (!tab?.id) {
    throw new Error("No active tab found.");
  }

  return {
    tab,
    response: await chrome.tabs.sendMessage(tab.id, message),
  };
};

const refreshStatus = async () => {
  const tab = await getActiveTab();
  if (!tab) {
    renderError("No active tab found.", null);
    return;
  }

  if (!isSupportedUrl(tab.url)) {
    renderStatus(null, tab);
    return;
  }

  try {
    const { response } = await sendToTab({ type: "getStatus" });
    renderStatus(response?.status, tab);
  } catch (error) {
    renderError("Reload the comments page and try again.", tab);
    console.error(error);
  }
};

startButton.addEventListener("click", async () => {
  try {
    const { tab, response } = await sendToTab({ type: "start" });
    renderStatus(response?.status, tab);
  } catch (error) {
    renderError(error.message, await getActiveTab());
    console.error(error);
  }
});

stopButton.addEventListener("click", async () => {
  try {
    const { tab, response } = await sendToTab({ type: "stop" });
    renderStatus(response?.status, tab);
  } catch (error) {
    renderError(error.message, await getActiveTab());
    console.error(error);
  }
});

openPageButton.addEventListener("click", async () => {
  await chrome.tabs.create({ url: COMMENTS_PAGE_URL });
});

supportButton.addEventListener("click", async () => {
  await chrome.tabs.create({ url: SUPPORT_URL });
});

refreshStatus();
setInterval(refreshStatus, 1000);
