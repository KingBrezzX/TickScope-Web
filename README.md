# TickScope Web

GitHub Pages-ready Minecraft Java performance dashboard for ZyrexSMP.

## Architecture

GitHub Pages
→ `https://tickscope-api.brezzteam5.workers.dev`
→ Cloudflare Worker secret `TICKSCOPE_TOKEN`
→ `http://business3.astrixhost.web.id:19132/api/v1/all`

The TickScope API token is intentionally NOT stored in this repository.

## GitHub Pages

1. Create a repository named `TickScope-Web`.
2. Upload the contents of this folder to the repository root.
3. Push to `main`.
4. Open **Settings → Pages** and select **GitHub Actions**.
5. Wait for the workflow `Deploy TickScope to GitHub Pages` to finish.

## Cloudflare Worker

Deploy `worker/worker.js` with `worker/wrangler.toml`.

Create a Worker secret named exactly:

`TICKSCOPE_TOKEN`

Set its value to your current TickScope token.

Do not put the token in GitHub, HTML, JavaScript, or README files.

## Tests

Worker health:
`https://tickscope-api.brezzteam5.workers.dev/health`

Worker API:
`https://tickscope-api.brezzteam5.workers.dev/api/v1/all`

The dashboard uses the second endpoint automatically.
