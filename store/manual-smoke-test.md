# Manual Smoke Test Checklist

Prepared on April 14, 2026.

Use this before the first `v4` upload or after changes that affect popup flow, selectors, or status handling.

## Test Matrix

| Scenario | UI language | Expected result |
| --- | --- | --- |
| Comments ready state | `English` | Popup connects, shows ready state, settings preview loads |
| Comments run and stop | `English` | Cleaner starts, counters move, stop works |
| Comment likes ready state | `English` | Popup connects, shows ready state, settings preview loads |
| Comment likes run and stop | `English` | Cleaner starts, counters move, stop works |
| Liked videos ready state | `English` | Popup connects, shows ready state, settings preview loads |
| Liked videos run and stop | `English` | Cleaner starts, counters move, stop works |
| Comments ready state | `Polish` | Popup connects, shows localized ready state, settings preview loads |
| Comments run and stop | `Polish` | Cleaner starts, counters move, stop works |
| Comment likes ready state | `Polish` | Popup connects, shows localized ready state, settings preview loads |
| Comment likes run and stop | `Polish` | Cleaner starts, counters move, stop works |
| Liked videos ready state | `Polish` | Popup connects, shows ready state, settings preview loads |
| Liked videos run and stop | `Polish` | Cleaner starts, counters move, stop works |

## Smoke Test Steps

1. Load the unpacked extension from `extension/`.
2. Open the popup and confirm the `About` line shows the expected extension version and UI language.
3. Click the popup shortcut for the target under test or open its page directly.
4. Reopen the popup on that target page.
5. Confirm the popup shows a ready state and the action buttons are enabled as expected.
6. Expand `Settings` and verify the preview text updates when a value changes.
7. Click `Start`.
8. Confirm at least one of these happens:
   - `Deleted` increases
   - `Attempts` increases
   - the run/debug text changes to an active status
9. Keep the target tab visible and let the cleaner run briefly.
10. Click `Stop`.
11. Confirm the popup returns to an idle or stopped state without breaking reconnect.
12. If the extension was reloaded during testing, reload the target page once and confirm the popup reconnects again.

## Record Before Release

- Extension version shown in the popup
- UI language shown in the popup
- Target page tested: comments, comment likes, or liked videos
- Test account language used for the page
- Whether `Start`, counters, and `Stop` behaved correctly
- Whether any retry or error text appeared
- Screenshot candidates captured for the store listing
