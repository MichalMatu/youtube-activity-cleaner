# Store Readiness Checklist

Prepared on April 10, 2026.

## Repo And Extension

- [x] MV3 manifest reviewed
- [x] Extension icons added to the manifest
- [x] Popup settings, retry logic, and Fast/Safe mode implemented
- [x] Lightweight unit tests added and passing
- [x] Packaging script added
- [x] Chrome Web Store listing draft prepared
- [x] Privacy policy page prepared
- [x] Support page prepared
- [x] Reviewer test instructions prepared

## Before First Upload

- [ ] Run the manual smoke test checklist for `English` and `Polish`
- [ ] Enable GitHub Pages from the `docs/` directory
- [ ] Verify the final public URLs in the store listing
- [ ] Review screenshots and promo assets one last time
- [ ] Replace placeholder/generated store screenshots with final real captures from the live extension UI
- [ ] Add one strong running-state screenshot with the popup open and `Deleted > 0`
- [ ] Decide whether first release should be `unlisted` or `public`
- [ ] Decide final monetization model
- [ ] Decide repository/distribution license

## Upload Flow

1. Run `npm test`
2. Run `npm run assets`
3. Run `npm run package`
4. Upload `dist/youtube-activity-cleaner-<version>.zip`
5. Fill out Store Listing, Privacy Practices, Test Instructions, and Distribution
6. Submit for review
