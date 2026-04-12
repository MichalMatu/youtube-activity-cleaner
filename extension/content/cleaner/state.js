(() => {
  const shared = globalThis.YtActivityCleanerShared;
  const content = (globalThis.YtActivityCleanerContent =
    globalThis.YtActivityCleanerContent || {});
  const { Settings, sanitizeSettings } = shared;
  const t = shared.t || ((_key, _substitutions, fallback = "") => fallback);

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
  });

  content.getState = () => state;

  content.getPageTarget = () => shared.getTargetByUrl?.(window.location.href) || null;

  content.getTarget = () =>
    content.getPageTarget() ||
    shared.getTargetById?.(state.targetId) ||
    shared.getDefaultTarget?.() ||
    null;

  content.isSupportedPage = () => Boolean(content.getPageTarget());

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
    supportedPage: content.isSupportedPage(),
    visibilityState: document.visibilityState,
  });

  content.setCleanerMessage = (message) => {
    state.lastMessage = message;
  };

  content.setCleanerError = (message) => {
    state.lastError = message || "";
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
