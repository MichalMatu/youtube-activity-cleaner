# Architecture

This extension intentionally keeps a small set of global namespaces because MV3 content scripts and popup scripts are loaded as ordered plain scripts, not ES modules.

The guardrail is:

- keep only three registries on `globalThis`
- keep responsibilities split by file
- avoid putting feature logic into `index.js` files unless it is real orchestration

## Namespaces

- `YtActivityCleanerShared`
  Shared helpers, targets, settings, i18n, and message constants.
- `YtActivityCleanerContent`
  Cleaner runtime attached to supported pages.
- `YtActivityCleanerPopup`
  Popup UI state and popup-only behaviors.

These objects are registries, not single-file god objects. New logic should live in focused files that attach a small surface area to the namespace.

## Cleaner Layers

- `extension/content/cleaner/config.js`
  Timing defaults and speed profiles.
- `extension/content/cleaner/selectors.js`
  Target-aware selector access.
- `extension/content/cleaner/state.js`
  Runtime state store and debug-event persistence.
- `extension/content/cleaner/scrolling.js`
  Scroll and wait primitives.
- `extension/content/cleaner/dom.js`
  DOM lookup, click helpers, item-container resolution, and viewport prioritization.
- `extension/content/cleaner/status.js`
  Status/toast parsing and deletion outcome confirmation.
- `extension/content/cleaner/candidates.js`
  Shared action-candidate model used to collect, describe, and retry work items.
- `extension/content/cleaner/strategies/*.js`
  Per-family action logic such as My Activity deletes and playlist removals.
- `extension/content/cleaner/strategy.js`
  Strategy registry and target-to-strategy resolution.
- `extension/content/cleaner/engine.js`
  Main run loop, candidate pipeline, retry policy, and progress accounting.
- `extension/content/debug.js`
  Read-only diagnostics and one-shot probing helpers.

## Popup Layers

- `extension/popup/view.js`
  DOM element map and rendering helpers.
- `extension/popup/targets.js`
  Supported-page shortcuts and target label helpers.
- `extension/popup/settings-form.js`
  Settings parsing, formatting, persistence, and form binding.
- `extension/popup/index.js`
  Popup orchestration: active tab resolution, session control, start/stop actions, and refresh loop.

## Current Hotspots

- `extension/popup/index.js`
  Still owns the popup session lifecycle and polling loop. Keep new form or target-specific behavior out of it; if it grows again, split the session transport and refresh logic into a dedicated popup runtime file.
- `extension/content/cleaner/strategy.js`
  Kept intentionally thin as the registry. New flow logic should land in `strategies/*.js`, not here.
- `extension/content/cleaner/strategies/my-activity-delete.js`
  This is now the main hotspot for future My Activity targets. Reuse it for targets with the same delete lifecycle, but split again if Google introduces a genuinely different flow.

## Target Model

Targets live in `extension/shared/targets.js`.

Rules for new targets:

- add metadata and selectors in the target registry first
- reuse an existing strategy only when the UI signals are truly the same
- if Google shows a different delete lifecycle, create a new strategy instead of adding more conditionals to the old one

## Anti-God-Object Rules

- Do not add new popup form logic to `popup/index.js` if it can live in `popup/settings-form.js`.
- Do not add new target shortcut logic to `popup/index.js`; keep it in `popup/targets.js`.
- Do not put target-specific selector exceptions directly into the engine loop.
- Prefer adding a helper to the closest layer over attaching another generic utility to every namespace.
- Keep debug helpers read-only unless the function name clearly says it mutates state or performs a probe.

## Next Safe Extension Points

- New My Activity targets:
  Extend `shared/targets.js`, then decide whether they fit the `my-activity-delete` strategy family.
- New popup panels/settings:
  Add view rendering to `popup/view.js` and form behavior to `popup/settings-form.js`.
- Candidate-based features:
  Add filters, dry-run preview, and pause/resume around the shared candidate pipeline before changing individual strategy files.
- Richer diagnostics:
  Extend `content/debug.js` and only expose narrow public helpers on `YtActivityCleanerDebug`.
