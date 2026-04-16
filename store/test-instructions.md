# Chrome Web Store Reviewer Test Instructions

Prepared on April 16, 2026.

## Purpose

This extension automates the visible cleanup flow for the user's own YouTube activity on supported Google My Activity pages and on the YouTube `Liked videos` playlist page.

Supported targets in the current build:

- YouTube comments
- Comment likes
- Live chat history
- Community posts
- Liked videos

## Reviewer Prerequisite

- Sign in to a Google account that has at least a few supported YouTube activity items visible, ideally YouTube comments in Google My Activity for the quickest review path.

## Test Flow

1. Load the extension and open the popup.
2. Click `Open YouTube comments` or open:
   - `https://myactivity.google.com/page?hl=en-GB&utm_medium=web&utm_source=youtube&page=youtube_comments`
3. Reopen the popup on that page.
4. Confirm the popup shows `Ready to start on the current tab.` or another clear ready state with `Start` available.
5. Expand `Settings` if you want to inspect the run profile.
6. Click `Start`.
7. Observe that:
   - delete counters increase
   - the page removes visible comments
   - the popup shows status messages and debug state
8. Click `Stop` to stop the current run.

## Notes For Review

- The extension works only on the supported `myactivity.google.com` pages and the YouTube `Liked videos` playlist page. It does not run on arbitrary sites.
- The Google My Activity tab should stay visible while the cleaner is active because Chrome throttles hidden tabs.
- If the extension was reloaded while the target tab was already open, reload the Google My Activity page once so the content script reconnects.
- The current release is best tested with the Google My Activity interface in English and Polish. The provided `hl=en-GB` URL is the most reliable review path.
- The popup `About` line shows the current extension version and UI language, which helps when reporting issues or confirming the test environment.
