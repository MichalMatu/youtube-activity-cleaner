# V2 Launch Plan

Prepared on April 10, 2026.

| Area | Status | What is already done | Next step |
| --- | --- | --- | --- |
| Core cleaner flow | Done | Start/stop flow, delete loop, counters, retry handling, cleaner tab tracking | Manual smoke test on live data before release |
| Popup and settings | Done | Fast/Safe mode, saved settings, debug state, keep-awake status, support links | Keep polishing copy only if manual testing finds rough edges |
| Languages | Partial | Popup UI and tested flows cover `English` and `Polish` | Expand selector and status-text confidence for more Google UI languages |
| Automated tests | Done | Lightweight Node tests pass locally and cover popup, settings, i18n, and status logic | Add targeted tests only when new bug fixes or locales are introduced |
| Docs and site | Mostly done | README, support page, privacy page, and store drafts exist and reflect the current v2 flow | Keep them synced with manual QA findings and release decisions |
| Manual QA | To do | Basic guidance exists | Run the checklist in `store/manual-smoke-test.md` for `en` and `pl` |
| Store assets | To do | Icons, promo tiles, and draft screenshots exist | Replace generated screenshots with real captures from the live popup |
| Release decisions | To do | Packaging is ready | Decide `unlisted` vs `public`, monetization, and license |

## Suggested Order

1. Run the `en` and `pl` smoke test checklist.
2. Capture final real screenshots during that run.
3. Enable GitHub Pages and verify public URLs.
4. Package the extension ZIP.
5. Decide release visibility, monetization, and license.
6. Upload to the Chrome Web Store.
