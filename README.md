# TickScope-Web

Premium GitHub Pages dashboard for TickScope `/api/v1/all`.

## Why the old GitHub Pages build showed "Failed to fetch"

Your GitHub Pages site is HTTPS. The TickScope API you entered is HTTP:

`http://business3.astrixhost.web.id:19132`

Modern browsers block an HTTPS page from calling an HTTP API (mixed content). A correct API key cannot fix that browser security rule.

## Recommended production setup

Use the included `worker/` HTTPS proxy.

1. Deploy `worker/worker.js` to Cloudflare Workers.
2. Create a Worker secret named `TICKSCOPE_TOKEN` containing your TickScope token.
3. The Worker endpoint becomes HTTPS.
4. Open TickScope Settings.
5. API Endpoint = your Worker URL, for example `https://tickscope-api-proxy.<your-subdomain>.workers.dev`
6. API Key can be left empty when using this proxy.
7. Save & Connect.

The Worker adds the token server-side, so the token does not need to be committed to GitHub.

## GitHub Pages

Repository name: `TickScope-Web`

Upload the repository contents (not the ZIP file), then:
Settings → Pages → Source → GitHub Actions.

## Local testing

If the dashboard is opened from `http://localhost` and the API permits CORS, the direct HTTP endpoint can be used in Settings. GitHub Pages still requires HTTPS.

## Security

The token previously shared for testing should be regenerated after testing. Never commit it into `app.js`, HTML, GitHub Actions, or `wrangler.toml`.
