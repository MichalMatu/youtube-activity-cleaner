# Chrome Web Store Reviewer Test Instructions

Prepared on April 10, 2026.

## Purpose

This extension automates the delete flow for the user's own YouTube comments on the Google My Activity comments page.

## Reviewer Prerequisite

- Sign in to a Google account that has at least a few YouTube comments visible in Google My Activity.

## Test Flow

1. Load the extension and open the popup.
2. Click `Open YouTube comments page` or open:
   - `https://myactivity.google.com/page?hl=en-GB&utm_medium=web&utm_source=youtube&page=youtube_comments`
3. Reopen the popup on that page.
4. Confirm the popup shows `Ready on the YouTube comments page.` or `Ready to start on the current tab.`
5. Expand `Settings` if you want to inspect the run profile.
6. Click `Start`.
7. Observe that:
   - delete counters increase
   - the page removes visible comments
   - the popup shows status messages and debug state
8. Click `Stop` to stop the current run.

## Notes For Review

- The extension works only on `myactivity.google.com` and does not run on arbitrary sites.
- The Google My Activity tab should stay visible while the cleaner is active because Chrome throttles hidden tabs.
- If the extension was reloaded while the target tab was already open, reload the Google My Activity page once so the content script reconnects.
