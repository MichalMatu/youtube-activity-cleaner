(() => {
  const shared = (globalThis.YtActivityCleanerShared =
    globalThis.YtActivityCleanerShared || {});
  const { ext } = shared;

  const SETTINGS_STORAGE_KEY = "cleanerSettings";
  const speedProfiles = Object.freeze({
    fast: Object.freeze({ label: "Fast" }),
    safe: Object.freeze({ label: "Safe" }),
  });
  const legacyDefaults = Object.freeze({
    betweenItemsMs: 3200,
    scrollPauseMs: 2200,
    retryLimit: 2,
    retryBackoffMs: 1800,
    failureStreakLimit: 4,
  });

  const defaultSettings = Object.freeze({
    speedProfile: "fast",
    betweenItemsMs: 1200,
    scrollPauseMs: 1200,
    retryLimit: 2,
    retryBackoffMs: 1200,
    failureStreakLimit: 4,
  });

  const limits = Object.freeze({
    betweenItemsMs: Object.freeze({ min: 1000, max: 12000, fallback: defaultSettings.betweenItemsMs }),
    scrollPauseMs: Object.freeze({ min: 800, max: 10000, fallback: defaultSettings.scrollPauseMs }),
    retryLimit: Object.freeze({ min: 0, max: 5, fallback: defaultSettings.retryLimit }),
    retryBackoffMs: Object.freeze({ min: 500, max: 10000, fallback: defaultSettings.retryBackoffMs }),
    failureStreakLimit: Object.freeze({
      min: 1,
      max: 10,
      fallback: defaultSettings.failureStreakLimit,
    }),
  });

  const sanitizeSpeedProfile = (value) =>
    Object.prototype.hasOwnProperty.call(speedProfiles, value)
      ? value
      : defaultSettings.speedProfile;

  const clampInteger = (value, config) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return config.fallback;
    }

    return Math.min(config.max, Math.max(config.min, Math.round(numericValue)));
  };

  const migrateLegacyNumericSetting = (settings, key) => {
    if (settings?.speedProfile !== undefined) {
      return settings?.[key];
    }

    const numericValue = Number(settings?.[key]);
    return numericValue === legacyDefaults[key] ? defaultSettings[key] : settings?.[key];
  };

  const sanitizeSettings = (settings) => ({
    speedProfile: sanitizeSpeedProfile(settings?.speedProfile),
    betweenItemsMs: clampInteger(
      migrateLegacyNumericSetting(settings, "betweenItemsMs"),
      limits.betweenItemsMs
    ),
    scrollPauseMs: clampInteger(
      migrateLegacyNumericSetting(settings, "scrollPauseMs"),
      limits.scrollPauseMs
    ),
    retryLimit: clampInteger(migrateLegacyNumericSetting(settings, "retryLimit"), limits.retryLimit),
    retryBackoffMs: clampInteger(
      migrateLegacyNumericSetting(settings, "retryBackoffMs"),
      limits.retryBackoffMs
    ),
    failureStreakLimit: clampInteger(
      migrateLegacyNumericSetting(settings, "failureStreakLimit"),
      limits.failureStreakLimit
    ),
  });

  const getSettings = async () => {
    try {
      const stored = await ext.storage.local.get(SETTINGS_STORAGE_KEY);
      return sanitizeSettings(stored?.[SETTINGS_STORAGE_KEY]);
    } catch (error) {
      console.warn("Could not load cleaner settings from storage.", error);
      return { ...defaultSettings };
    }
  };

  const saveSettings = async (settings) => {
    const sanitizedSettings = sanitizeSettings(settings);

    await ext.storage.local.set({
      [SETTINGS_STORAGE_KEY]: sanitizedSettings,
    });

    return sanitizedSettings;
  };

  const resetSettings = async () => saveSettings(defaultSettings);

  shared.Settings = Object.freeze({
    storageKey: SETTINGS_STORAGE_KEY,
    defaults: defaultSettings,
    limits,
    profiles: speedProfiles,
  });
  shared.sanitizeSettings = sanitizeSettings;
  shared.getSettings = getSettings;
  shared.saveSettings = saveSettings;
  shared.resetSettings = resetSettings;
})();
