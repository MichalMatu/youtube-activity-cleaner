# V4 Launch Plan

Prepared on April 14, 2026.

| Area | Status | What is already done | Next step |
| --- | --- | --- | --- |
| Core cleaner flows | Done | Comments, comment likes, live chat history, and liked videos are supported with retry handling, counters, and target-aware messages | Run live manual smoke tests on each target before release |
| Popup and settings | Done | Shortcut buttons, saved settings, keep-awake status, cleaner-tab reconnect, and localized copy are implemented | Keep copy stable unless manual testing finds friction |
| Architecture and modularity | Mostly done | Popup responsibilities are split into `view`, `targets`, `settings-form`, and orchestration layers, with notes in `docs/architecture.md` | Keep target-specific UI logic out of `popup/index.js` and split future divergent cleaner flows earlier |
| Languages | Partial | Popup UI and tested flows cover `English` and `Polish` | Expand selector and status-text confidence for more Google UI languages only after release-critical QA |
| Automated tests | Done | Lightweight Node tests cover popup, settings, i18n, selectors, and status logic | Add tests when new targets, selectors, or locale-specific fixes are introduced |
| Docs and site | Mostly done | README, GitHub Pages site, support page, privacy page, and store drafts reflect the current v4 flow | Keep them synced with manual QA findings and release decisions |
| Manual QA | To do | A smoke checklist exists for comments, comment likes, live chat history, and liked videos in `en` and `pl` | Run the checklist and record the results before packaging |
| Store assets | To do | Icons, promo tiles, and draft screenshots exist | Replace generated screenshots with final real captures from the live popup |
| Release decisions | To do | Packaging is ready and manifest metadata points to the project site | Decide `unlisted` vs `public`, monetization, and license |

## Suggested Order

1. Run the `en` and `pl` smoke test checklist across comments, comment likes, live chat history, and liked videos.
2. Capture final real screenshots during that run.
3. Verify GitHub Pages URLs and support/privacy links.
4. Package the extension ZIP.
5. Decide release visibility, monetization, and license.
6. Upload to the Chrome Web Store.
