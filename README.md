# دفتر الحساب — Debt Book

## Cloudflare Workers Builds deployment

This project serves static files from the repository root. Keep these files together in the root of the GitHub repository:
- `index.html`
- `manifest.webmanifest`
- `sw.js`
- `icon.svg`
- `wrangler.toml`

In Cloudflare Workers Builds, set the deploy command to:

`npx wrangler deploy`

Do not put these files inside another folder. The `wrangler.toml` assets directory is `.` (repository root), so it does not require a `public` folder.

The app stores its records in the browser's local storage on that device. Export a backup regularly; clearing browser data or changing devices may remove locally stored records.
