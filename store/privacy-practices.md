# Chrome Web Store Privacy Practices Draft

Prepared on April 10, 2026.

This is a draft answer sheet for the Chrome Web Store privacy section.

## Single Purpose

This extension helps the user delete their own YouTube comments from the Google My Activity comments page by automating the visible delete flow in the page UI.

## Permissions And Why They Are Needed

- `tabs`
  - Used to open the Google My Activity comments page, detect the active tab, and reconnect the popup to the tracked cleaner tab.
- `power`
  - Used to request keep-awake while a cleaning run is active, reducing interruptions from display sleep.
- `storage`
  - Used to save local cleaner settings and session metadata for the tracked cleaner tab.
- Host permission `https://myactivity.google.com/*`
  - Used only to run the content script on the Google My Activity domain where the delete flow exists.

## Data Use Summary

- Personal or sensitive user data collected: `No`
- Data sold: `No`
- Data transferred to third parties: `No`
- Data used for creditworthiness or lending purposes: `No`
- Remote code: `No`
- Analytics or advertising SDKs: `No`

## What The Extension Stores Locally

- pacing and retry settings
- failure threshold settings
- current cleaner tab session metadata

## Suggested Reviewer Note

The extension works entirely locally in the browser and does not transmit user data to any backend service.
