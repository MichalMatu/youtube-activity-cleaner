(() => {
  const shared = globalThis.YtActivityCleanerShared;
  const content = (globalThis.YtActivityCleanerContent =
    globalThis.YtActivityCleanerContent || {});
  const { Settings, sanitizeSettings } = shared;
  const t = shared.t || ((_key, _substitutions, fallback = "") => fallback);
  const DEBUG_EVENT_LIMIT = 40;
  const truncateDebugText = (value, limit = 220) => {
    const text = String(value || "");
    return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
  };
  const sanitizeDebugDetails = (details = {}) =>
    Object.fromEntries(
      Object.entries(details).map(([key, value]) => {
        if (value === undefined) {
          return [key, ""];
        }

        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
          return [key, truncateDebugText(value)];
        }

        return [key, truncateDebugText(JSON.stringify(value))];
      })
    );

  const state = (content.state = content.state || {
    targetId: shared.DEFAULT_TARGET_ID || "",
    starting: false,
    running: false,
    stopRequested: false,
    paused: false,
    attempted: 0,
    deleted: 0,
    failed: 0,
    lastMessage: t("contentIdleMessage", undefined, "Idle."),
    lastItem: "",
    lastError: "",
    retryAttempt: 0,
    retryDelayMs: 0,
    settings: { ...Settings.defaults },
    debugEvents: [],
    lastDebugEvent: "",
  });

  content.getState = () => state;

  content.getPageTarget = () => shared.getTargetByUrl?.(window.location.href) || null;

  content.getRunnablePageTarget = () =>
    shared.getRunnableTargetByUrl?.(window.location.href) || null;

  content.getTarget = () =>
    content.getPageTarget() ||
    shared.getTargetById?.(state.targetId) ||
    shared.getDefaultTarget?.() ||
    null;

  content.getTargetLabel = (target = content.getTarget()) =>
    shared.getTargetLabel?.(target, t) || target?.id || "";

  content.isSupportedPage = () => Boolean(content.getPageTarget());
  content.isRunnablePage = () => Boolean(content.getRunnablePageTarget());

  content.setCleanerTarget = (targetId) => {
    state.targetId = shared.getTargetById?.(targetId)?.id || shared.DEFAULT_TARGET_ID || "";
    return state.targetId;
  };

  content.getCleanerStatus = () => ({
    targetId: content.getTarget()?.id || state.targetId || "",
    starting: state.starting,
    running: state.running,
    stopRequested: state.stopRequested,
    paused: state.paused,
    attempted: state.attempted,
    deleted: state.deleted,
    failed: state.failed,
    lastMessage: state.lastMessage,
    lastItem: state.lastItem,
    lastError: state.lastError,
    retryAttempt: state.retryAttempt,
    retryDelayMs: state.retryDelayMs,
    settings: { ...state.settings },
    debugEvents: state.debugEvents.slice(-10).map((entry) => ({ ...entry })),
    lastDebugEvent: state.lastDebugEvent,
    supportedPage: content.isSupportedPage(),
    runnablePage: content.isRunnablePage(),
    visibilityState: document.visibilityState,
  });

  content.setCleanerMessage = (message) => {
    state.lastMessage = message;
  };

  content.setCleanerError = (message) => {
    state.lastError = message || "";
  };

  content.clearDebugEvents = () => {
    state.debugEvents = [];
    state.lastDebugEvent = "";
  };

  content.pushDebugEvent = (type, details = {}) => {
    const entry = Object.freeze({
      time: new Date().toISOString(),
      type,
      ...sanitizeDebugDetails(details),
    });

    state.debugEvents = [...state.debugEvents.slice(-(DEBUG_EVENT_LIMIT - 1)), entry];
    state.lastDebugEvent = truncateDebugText(
      [type, details.reason || details.description || details.message]
        .filter(Boolean)
        .join(": ")
    );
    console.debug("YtActivityCleaner debug", entry);
    return entry;
  };

  content.setCleanerSettings = (settings) => {
    state.settings = sanitizeSettings(settings);
    return state.settings;
  };

  content.getTimingProfileName = () => {
    const timingProfiles = content.config.timingProfiles || {};
    const profileName = state.settings.speedProfile;

    if (Object.prototype.hasOwnProperty.call(timingProfiles, profileName)) {
      return profileName;
    }

    return "fast";
  };

  content.getTimingValue = (key) => {
    const timingProfile = content.config.timingProfiles?.[content.getTimingProfileName()];
    if (timingProfile && Object.prototype.hasOwnProperty.call(timingProfile, key)) {
      return timingProfile[key];
    }

    return content.config[key];
  };

  content.getSettingValue = (key) => {
    if (Object.prototype.hasOwnProperty.call(state.settings, key)) {
      return state.settings[key];
    }

    return content.getTimingValue(key);
  };
})();
