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
- `extension/content/cleaner/run-loop.js`
  Candidate loop, retry pacing, load-more handling, and idle detection.
- `extension/content/cleaner/lifecycle.js`
  Run start/stop lifecycle, settings load, keep-awake, and crash finalization.
- `extension/content/cleaner/engine.js`
  Thin composition entrypoint wiring lifecycle and run-loop helpers into `runCleaner()`.
- `extension/content/debug.js`
  Read-only diagnostics and one-shot probing helpers.

## Popup Layers

- `extension/popup/view.js`
  DOM element map and rendering helpers.
- `extension/popup/targets.js`
  Supported-page shortcuts and target label helpers.
- `extension/popup/settings-form.js`
  Settings parsing, formatting, persistence, and form binding.
- `extension/popup/panel.js`
  Popup shell helpers such as app-version text, support links, and settings-panel open/close behavior.
- `extension/popup/runtime.js`
  Active-tab resolution, cleaner-tab session access, and serialized status polling.
- `extension/popup/index.js`
  Popup orchestration: startup wiring plus start/stop actions.

## Current Hotspots

- `extension/content/cleaner/run-loop.js`
  This is now the main runtime hotspot. If pause/resume, dry-run, or queue policies expand, split action processing from navigation/idle detection before adding more branches.
- `extension/content/cleaner/lifecycle.js`
  Holds start/stop transitions and failure recovery. If more run phases appear, move the state transitions into narrower helpers instead of growing one long initializer.
- `extension/content/cleaner/dom.js`
  This file is now the densest collection of heuristics. Prefer extracting dialog handling or viewport candidate ranking into narrower helpers before adding more selector exceptions.
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
- Do not add popup polling or cleaner-tab session code back into `popup/index.js`; keep it in `popup/runtime.js`.
- Do not add settings-panel behavior or external-link buttons to `popup/index.js`; keep it in `popup/panel.js`.
- Do not add start/stop lifecycle or keep-awake policy back into `content/cleaner/engine.js`; keep it in `lifecycle.js`.
- Do not put target-specific selector exceptions directly into the run loop.
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
