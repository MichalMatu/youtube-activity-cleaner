(() => {
  const shared = globalThis.YtActivityCleanerShared;
  const popup = (globalThis.YtActivityCleanerPopup =
    globalThis.YtActivityCleanerPopup || {});
  const { Settings, getSettings, saveSettings, resetSettings, sanitizeSettings } = shared;
  const t = shared.t || ((_key, _substitutions, fallback = "") => fallback);

  popup.getUiLocale = () =>
    shared.ext?.i18n?.getUILanguage?.() ||
    globalThis.document?.documentElement?.lang ||
    undefined;

  popup.formatSecondsInputValue = (ms) => {
    const seconds = ms / 1000;

    return Number.isInteger(seconds) ? String(seconds) : seconds.toFixed(1);
  };

  popup.formatSecondsDisplayValue = (ms) => {
    const seconds = ms / 1000;

    return new Intl.NumberFormat(popup.getUiLocale(), {
      minimumFractionDigits: Number.isInteger(seconds) ? 0 : 1,
      maximumFractionDigits: 1,
    }).format(seconds);
  };

  popup.getSettingsPreviewText = (settings) => {
    const normalizedSettings = sanitizeSettings(settings);
    const profileLabel =
      Settings.profiles?.[normalizedSettings.speedProfile]?.label || normalizedSettings.speedProfile;

    return t(
      "popupSettingsPreview",
      [
        profileLabel,
        popup.formatSecondsDisplayValue(normalizedSettings.betweenItemsMs),
        normalizedSettings.retryLimit,
      ],
      `${profileLabel} • ${popup.formatSecondsDisplayValue(
        normalizedSettings.betweenItemsMs
      )}s • ${normalizedSettings.retryLimit}x`
    );
  };

  popup.normalizeInputValue = (value) => {
    const normalizedValue = String(value).trim().replace(",", ".");

    return normalizedValue ? normalizedValue : Number.NaN;
  };

  popup.parseSecondsInput = (value) => {
    const numericValue = Number(popup.normalizeInputValue(value));

    return Number.isFinite(numericValue) ? Math.round(numericValue * 1000) : Number.NaN;
  };

  popup.getSettingsFromForm = () => ({
    speedProfile: popup.elements.speedProfileSelect.value,
    betweenItemsMs: popup.parseSecondsInput(popup.elements.betweenItemsSecondsInput.value),
    scrollPauseMs: popup.parseSecondsInput(popup.elements.scrollPauseSecondsInput.value),
    retryLimit: popup.normalizeInputValue(popup.elements.retryLimitInput.value),
    retryBackoffMs: popup.parseSecondsInput(popup.elements.retryBackoffSecondsInput.value),
    failureStreakLimit: popup.normalizeInputValue(
      popup.elements.failureStreakLimitInput.value
    ),
  });

  popup.applySettingsToForm = (settings) => {
    popup.elements.speedProfileSelect.value = settings.speedProfile;
    popup.elements.betweenItemsSecondsInput.value = popup.formatSecondsInputValue(
      settings.betweenItemsMs
    );
    popup.elements.scrollPauseSecondsInput.value = popup.formatSecondsInputValue(
      settings.scrollPauseMs
    );
    popup.elements.retryLimitInput.value = String(settings.retryLimit);
    popup.elements.retryBackoffSecondsInput.value = popup.formatSecondsInputValue(
      settings.retryBackoffMs
    );
    popup.elements.failureStreakLimitInput.value = String(settings.failureStreakLimit);
    popup.renderSettingsPreview(popup.getSettingsPreviewText(settings));
  };

  popup.saveSettingsFromForm = async (successMessage) => {
    const settings = await saveSettings(popup.getSettingsFromForm());
    popup.applySettingsToForm(settings);
    popup.renderSettingsState(successMessage);
    return settings;
  };

  popup.loadSavedSettings = async () => {
    const settings = await getSettings();
    popup.applySettingsToForm(settings);
    popup.renderSettingsState(
      t("popupSettingsLoaded", undefined, "Settings loaded from Chrome storage.")
    );
    return settings;
  };

  popup.resetSavedSettings = async () => {
    const settings = await resetSettings();
    popup.applySettingsToForm(settings);
    popup.renderSettingsState(
      t("popupDefaultSettingsRestored", undefined, "Default settings restored.")
    );
    return settings;
  };

  popup.bindSettingsForm = () => {
    [
      popup.elements.speedProfileSelect,
      popup.elements.betweenItemsSecondsInput,
      popup.elements.scrollPauseSecondsInput,
      popup.elements.retryLimitInput,
      popup.elements.retryBackoffSecondsInput,
      popup.elements.failureStreakLimitInput,
    ].forEach((element) => {
      element.addEventListener("input", () => {
        popup.renderSettingsPreview(popup.getSettingsPreviewText(popup.getSettingsFromForm()));
        popup.renderSettingsState(
          t(
            "popupUnsavedChanges",
            undefined,
            "Unsaved changes. Save them or click Start to use them."
          )
        );
      });
    });

    popup.elements.settingsForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      try {
        await popup.saveSettingsFromForm(
          t("popupSettingsSavedLocally", undefined, "Settings saved locally in Chrome.")
        );
      } catch (error) {
        popup.renderSettingsState(
          t(
            "popupCouldNotSaveSettings",
            error.message,
            `Could not save settings: ${error.message}`
          ),
          true
        );
        console.error(error);
      }
    });

    popup.elements.resetSettingsButton.addEventListener("click", async () => {
      try {
        await popup.resetSavedSettings();
      } catch (error) {
        popup.renderSettingsState(
          t(
            "popupCouldNotResetSettings",
            error.message,
            `Could not reset settings: ${error.message}`
          ),
          true
        );
        console.error(error);
      }
    });
  };
})();
