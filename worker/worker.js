// TickScope HTTPS Worker
// This is the secure bridge between GitHub Pages (HTTPS) and the TickScope
// HTTP API on port 19132. Store your token as the Cloudflare Worker secret:
// TICKSCOPE_TOKEN
//
// GitHub Pages calls:
//   https://YOUR-WORKER.workers.dev/api/v1/all
//
// The Worker calls:
//   http://business3.astrixhost.web.id:19132/api/v1/all?token=SECRET

const ORIGIN = "http://business3.astrixhost.web.id:19132";

function cors(extra = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Cache-Control": "no-store",
    ...extra
  };
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors() });
    }

    const url = new URL(request.url);

    if (!url.pathname.startsWith("/api/v1/")) {
      return new Response(
        JSON.stringify({ success: false, error: "Not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...cors() } }
      );
    }

    if (!env.TICKSCOPE_TOKEN) {
      return new Response(
        JSON.stringify({ success: false, error: "TICKSCOPE_TOKEN secret is not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...cors() } }
      );
    }

    const upstream = new URL(ORIGIN + url.pathname);
    for (const [key, value] of url.searchParams) {
      if (key !== "token" && key !== "_") upstream.searchParams.set(key, value);
    }
    upstream.searchParams.set("token", env.TICKSCOPE_TOKEN);

    try {
      const response = await fetch(upstream.toString(), {
        method: "GET",
        headers: { Accept: request.headers.get("Accept") || "application/json" }
      });

      const body = await response.text();

      return new Response(body, {
        status: response.status,
        headers: {
          "Content-Type": response.headers.get("Content-Type") || "application/json",
          ...cors()
        }
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Upstream fetch failed",
          message: String(error)
        }),
        { status: 502, headers: { "Content-Type": "application/json", ...cors() } }
      );
    }
  }
};
