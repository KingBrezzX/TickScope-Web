const ORIGIN = "http://business3.astrixhost.web.id:19132";
const API_PATH = "/api/v1/all";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Cache-Control": "no-store"
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders()
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }

    // Only allow GET
    if (request.method !== "GET") {
      return json(
        {
          success: false,
          error: "Method not allowed"
        },
        405
      );
    }

    // Health check
    if (url.pathname === "/" || url.pathname === "/health") {
      return json({
        success: true,
        service: "TickScope HTTPS Worker",
        status: "online",
        upstream: ORIGIN,
        endpoint: API_PATH
      });
    }

    // Only proxy /api/v1/all
    if (url.pathname !== API_PATH) {
      return json(
        {
          success: false,
          error: "Not found"
        },
        404
      );
    }

    // Token MUST exist as Cloudflare Worker Secret
    if (!env.TICKSCOPE_TOKEN) {
      return json(
        {
          success: false,
          error: "TICKSCOPE_TOKEN is not configured"
        },
        500
      );
    }

    // Build upstream URL
    const upstreamUrl = new URL(
      ORIGIN + API_PATH
    );

    // Inject token server-side.
    // The token never reaches the browser.
    upstreamUrl.searchParams.set(
      "token",
      env.TICKSCOPE_TOKEN
    );

    try {
      const upstreamResponse = await fetch(
        upstreamUrl.toString(),
        {
          method: "GET",
          headers: {
            "Accept": "application/json"
          },
          redirect: "follow"
        }
      );

      const body = await upstreamResponse.text();

      return new Response(body, {
        status: upstreamResponse.status,
        headers: {
          "Content-Type":
            upstreamResponse.headers.get(
              "Content-Type"
            ) ||
            "application/json; charset=utf-8",

          ...corsHeaders()
        }
      });

    } catch (error) {
      return json(
        {
          success: false,
          error: "Upstream API unavailable",
          message: error instanceof Error
            ? error.message
            : String(error)
        },
        502
      );
    }
  }
};
