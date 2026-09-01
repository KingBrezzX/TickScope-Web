# TickScope-Web — Final HTTPS Worker Build

Premium GitHub Pages dashboard for TickScope.

## Why this version fixes Mixed Content

GitHub Pages is HTTPS. The Minecraft/TickScope API is HTTP on port 19132.
A browser cannot fetch that HTTP API directly from an HTTPS page.

This build therefore uses the included Cloudflare Worker:

GitHub Pages (HTTPS)
→ TickScope HTTPS Worker
→ TickScope HTTP API
→ ZyrexSMP

The TickScope token is stored only as the Cloudflare Worker secret `TICKSCOPE_TOKEN`.
It is NOT stored in this repository and is NOT sent from the browser.

## One-time setup

1. Deploy `worker/worker.js` as a Cloudflare Worker.
2. Add Worker Secret:
   `TICKSCOPE_TOKEN` = your current TickScope API token.
3. Deploy the Worker.
4. Copy its HTTPS URL, for example:
   `https://tickscope-api.YOUR-SUBDOMAIN.workers.dev`
5. Edit `assets/config.js` and replace `YOUR-SUBDOMAIN` with the real Worker URL.
6. Commit/push the repo to GitHub.
7. GitHub Pages → Settings → Pages → Source: GitHub Actions.
8. Open the Pages site. Settings will already be filled with the HTTPS Worker URL.

## Important

Do NOT put the TickScope token in `assets/config.js`, `app.js`, HTML, or GitHub Actions source.
If the token was ever exposed publicly, regenerate it in TickScope before production use.

## API

The Worker proxies `/api/v1/*`, including:
- `/api/v1/all`
- future TickScope API endpoints

The web dashboard uses `/api/v1/all` by default.
