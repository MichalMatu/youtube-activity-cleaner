(() => {
  const shared = (globalThis.YtActivityCleanerShared =
    globalThis.YtActivityCleanerShared || {});

  shared.formatTemplate = (template, substitutions) => {
    const values =
      substitutions === undefined
        ? []
        : Array.isArray(substitutions)
          ? substitutions
          : [substitutions];

    return String(template || "").replace(/\$(\d+)/g, (_match, index) => {
      const value = values[Number(index) - 1];
      return value === undefined ? "" : String(value);
    });
  };

  shared.translateWithFallback = (
    key,
    substitutions,
    fallbackTemplate,
    translate = shared.t || ((_key, _substitutions, fallback = "") => fallback)
  ) => translate(key, substitutions, "") || shared.formatTemplate(fallbackTemplate, substitutions);
})();
