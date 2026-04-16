# Chrome Web Store Privacy Practices Draft

Prepared on April 16, 2026.

This is a draft answer sheet for the Chrome Web Store privacy section.

## Single Purpose

This extension helps the user clean their own YouTube activity by automating the visible removal flow on supported Google My Activity pages and the YouTube `Liked videos` playlist page.

Supported targets in the current build:

- YouTube comments
- Comment likes
- Live chat history
- Community posts
- Liked videos

## Permissions And Why They Are Needed

- `tabs`
  - Used to detect the active tab, open a supported cleanup page from the popup, send start and stop messages to the cleaner tab, and reconnect the popup to an already running cleaner tab.
- `power`
  - Used to request keep-awake while a cleaning run is active, reducing interruptions from display sleep.
- `storage`
  - Used to save local cleaner settings and lightweight session metadata for the tracked cleaner tab.
- Host permission `https://myactivity.google.com/*`
  - Used only on supported Google My Activity pages where the user removes comments, comment likes, live chat history, or community posts through the existing page UI.
- Host permissions `https://www.youtube.com/playlist*` and `https://youtube.com/playlist*`
  - Used only on the YouTube `Liked videos` playlist page to automate the existing remove-from-liked-videos action through the visible page UI.

## Data Use Summary

- The extension accesses supported page content locally in the browser so it can find the visible action buttons, status messages, and item rows needed to perform the user-requested cleanup.
- The extension does not send this data to any backend service.
- Data sold: `No`
- Data transferred to third parties: `No`
- Data used for advertising: `No`
- Data used for creditworthiness or lending purposes: `No`
- Remote code: `No`
- Analytics or advertising SDKs: `No`

## What The Extension Stores Locally

- pacing and retry settings
- failure threshold settings
- current cleaner tab session metadata

## Suggested Reviewer Note

The extension works entirely locally in the browser. It uses page access only to automate the user-initiated cleanup flow on the supported pages and does not transmit user data to any backend service.
