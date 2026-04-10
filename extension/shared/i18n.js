(() => {
  const shared = (globalThis.YtActivityCleanerShared =
    globalThis.YtActivityCleanerShared || {});
  const { ext } = shared;

  const normalizeSubstitutions = (substitutions) => {
    if (substitutions === undefined || substitutions === null) {
      return undefined;
    }

    if (Array.isArray(substitutions)) {
      return substitutions.map((value) => String(value));
    }

    return [String(substitutions)];
  };

  shared.t = (key, substitutions, fallback = "") => {
    try {
      const message = ext?.i18n?.getMessage?.(key, normalizeSubstitutions(substitutions));
      return message || fallback;
    } catch (_error) {
      return fallback;
    }
  };

  shared.localizeDocument = (root = document) => {
    if (!root?.querySelectorAll) {
      return;
    }

    const applyMessage = (selector, attribute) => {
      root.querySelectorAll(selector).forEach((element) => {
        const key = element.getAttribute(attribute === "textContent" ? "data-i18n" : `data-i18n-${attribute}`);
        if (!key) {
          return;
        }

        const fallback =
          attribute === "textContent" ? element.textContent || "" : element.getAttribute(attribute) || "";
        const message = shared.t(key, undefined, fallback);
        if (!message) {
          return;
        }

        if (attribute === "textContent") {
          element.textContent = message;
          return;
        }

        element.setAttribute(attribute, message);
      });
    };

    applyMessage("[data-i18n]", "textContent");
    applyMessage("[data-i18n-placeholder]", "placeholder");
    applyMessage("[data-i18n-title]", "title");
    applyMessage("[data-i18n-aria-label]", "aria-label");

    if (root === document) {
      const uiLanguage = ext?.i18n?.getUILanguage?.();
      if (uiLanguage) {
        document.documentElement.lang = uiLanguage;
      }
    }
  };
})();
