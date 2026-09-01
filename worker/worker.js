const ORIGIN = "http://business3.astrixhost.web.id:19132";

const ALLOWED_PATHS = [
  "/api/v1/all",
  "/health",
  "/"
];

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "*",
    "Cache-Control": "no-store"
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...cors()
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: cors()
      });
    }

    if (request.method !== "GET") {
      return json({
        success: false,
        error: "Method not allowed"
      }, 405);
    }

    /*
     * HEALTH CHECK
     */
    if (url.pathname === "/" || url.pathname === "/health") {
      return json({
        success: true,
        service: "TickScope HTTPS Worker",
        status: "online",
        worker: true,
        route: "/api/v1/all"
      });
    }

    /*
     * TICKSCOPE ALL API
     */
    if (url.pathname === "/api/v1/all") {

      if (!env.TICKSCOPE_TOKEN) {
        return json({
          success: false,
          error: "TICKSCOPE_TOKEN is not configured"
        }, 500);
      }

      const upstream =
        ORIGIN + "/api/v1/all?token=" +
        encodeURIComponent(env.TICKSCOPE_TOKEN);

      try {
        const response = await fetch(upstream, {
          method: "GET",
          headers: {
            "Accept": "application/json"
          }
        });

        const body = await response.text();

        /*
         * Forward upstream response exactly.
         */
        return new Response(body, {
          status: response.status,
          headers: {
            "Content-Type":
              response.headers.get("Content-Type") ||
              "application/json; charset=utf-8",
            ...cors()
          }
        });

      } catch (error) {
        return json({
          success: false,
          error: "Upstream API unavailable",
          message: error instanceof Error
            ? error.message
            : String(error)
        }, 502);
      }
    }

    /*
     * UNKNOWN ROUTE
     */
    return json({
      success: false,
      error: "Not found",
      path: url.pathname,
      available: ALLOWED_PATHS
    }, 404);
  }
};
