# Chrome Web Store Listing Draft

Prepared on April 16, 2026.

## Suggested URLs

Enable GitHub Pages from the `docs/` directory and use:

- Official URL / Homepage URL: `https://michalmatu.github.io/youtube-activity-cleaner/`
- Support URL: `https://michalmatu.github.io/youtube-activity-cleaner/support.html`
- Privacy policy URL: `https://michalmatu.github.io/youtube-activity-cleaner/privacy.html`

Fallback URLs before GitHub Pages is enabled:

- Repository: `https://github.com/MichalMatu/youtube-activity-cleaner`
- Issues: `https://github.com/MichalMatu/youtube-activity-cleaner/issues`

## Short Description

Free open-source cleaner for YouTube comments, comment likes, live chats, community posts, and liked videos.

## Suggested Category

- Category: `Productivity`
- Language: `English`

## Detailed Description

YouTube Activity Cleaner is a free open-source Chrome extension that helps you remove old YouTube activity without endless manual clicking.

Supported targets in the current build:

- YouTube comments
- Comment likes
- Live chat history
- Community posts
- Liked videos

Open one of the supported pages from the popup, choose Fast or Safe mode, and start the cleaner. The extension looks for visible cleanup controls, confirms the flow, waits for the page to react, and keeps going while showing counters, retry state, and the latest status in the popup.

Highlights:

- Free and open-source project
- Fast and Safe run profiles
- Retry and backoff for temporary delete failures
- Local settings saved in Chrome
- Keep-awake support while a run is active
- Cleaner tab tracking so the popup can reconnect to the current run
- Optional `Buy me a coffee` support button
- No cloud sync or remote backend required

Important:

- The extension works only on the supported Google My Activity pages and the YouTube `Liked videos` playlist page.
- The target tab should stay visible while cleaning is running because hidden tabs are throttled by Chrome.
- The current release is best tested with the Google My Activity interface in English and Polish.
- This tool automates the existing web UI. If Google changes the page layout, selectors may need updates.

## Store Assets Prepared In This Repo

- Store icon: [store-icon-128.png](/Users/michal/Documents/PlatformIO/Projects/yt-comments/store/assets/store-icon-128.png)
- Small promo tile: [small-promo-tile-440x280.png](/Users/michal/Documents/PlatformIO/Projects/yt-comments/store/assets/small-promo-tile-440x280.png)
- Marquee promo tile: [marquee-promo-tile-1400x560.png](/Users/michal/Documents/PlatformIO/Projects/yt-comments/store/assets/marquee-promo-tile-1400x560.png)
- Chrome Web Store screenshots ready to upload:
  - [screenshot-01-ready-overview-1280x800.png](/Users/michal/Documents/PlatformIO/Projects/yt-comments/store/assets/screenshot-01-ready-overview-1280x800.png)
  - [screenshot-02-fast-mode-1280x800.png](/Users/michal/Documents/PlatformIO/Projects/yt-comments/store/assets/screenshot-02-fast-mode-1280x800.png)
  - [screenshot-03-settings-1280x800.png](/Users/michal/Documents/PlatformIO/Projects/yt-comments/store/assets/screenshot-03-settings-1280x800.png)
- Supporting popup captures for the website or docs only:
  - [screenshot-04-live-popup-ready-overview-676x1206.png](/Users/michal/Documents/PlatformIO/Projects/yt-comments/store/assets/screenshot-04-live-popup-ready-overview-676x1206.png)
  - [screenshot-05-live-popup-footer-banner-674x746.png](/Users/michal/Documents/PlatformIO/Projects/yt-comments/store/assets/screenshot-05-live-popup-footer-banner-674x746.png)

Recommended before the first public listing refresh:

- Capture one strong running-state screenshot at `1280x800` or `640x400` with `Deleted > 0`
- Replace the most marketing-heavy screenshot with one cleaner real-product screenshot if you want a more policy-safe listing
- Keep the vertical popup captures for the project site or docs instead of uploading them as Chrome Web Store screenshots

## Manual Items Still To Decide

- Final public pricing model: free open-source release with optional donations
- Whether to publish `unlisted` first or go straight to `public`
- Whether to record a short YouTube demo video for the listing
- Final license for the repository and distribution
