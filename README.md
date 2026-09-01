# TickScope Web GitHub Ready

Uses `GET /api/v1/all?token=...` and provides TPS/MSPT, server stats, monitoring tabs, and a premium responsive UI.

Default API: `http://business3.astrixhost.web.id:19132`

Upload the repository contents to GitHub and enable Settings → Pages → GitHub Actions.

The API key is entered in the dashboard and stored only in browser localStorage. It is not committed to the repository.

For GitHub Pages production, expose the API through HTTPS to avoid browser mixed-content blocking.
