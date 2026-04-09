(() => {
  const shared = (globalThis.YtActivityCleanerShared =
    globalThis.YtActivityCleanerShared || {});
  const { ext } = shared;

  const SETTINGS_STORAGE_KEY = "cleanerSettings";

  const defaultSettings = Object.freeze({
    betweenItemsMs: 3200,
    scrollPauseMs: 2200,
    retryLimit: 2,
    retryBackoffMs: 1800,
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

  const clampInteger = (value, config) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return config.fallback;
    }

    return Math.min(config.max, Math.max(config.min, Math.round(numericValue)));
  };

  const sanitizeSettings = (settings) => ({
    betweenItemsMs: clampInteger(settings?.betweenItemsMs, limits.betweenItemsMs),
    scrollPauseMs: clampInteger(settings?.scrollPauseMs, limits.scrollPauseMs),
    retryLimit: clampInteger(settings?.retryLimit, limits.retryLimit),
    retryBackoffMs: clampInteger(settings?.retryBackoffMs, limits.retryBackoffMs),
    failureStreakLimit: clampInteger(
      settings?.failureStreakLimit,
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
  });
  shared.sanitizeSettings = sanitizeSettings;
  shared.getSettings = getSettings;
  shared.saveSettings = saveSettings;
  shared.resetSettings = resetSettings;
})();
