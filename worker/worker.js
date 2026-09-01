// TickScope HTTPS proxy for GitHub Pages.
// Deploy this Worker with Cloudflare. Put the real TickScope token in the
// Worker secret TICKSCOPE_TOKEN. Do NOT put the token in GitHub source.
//
// Requests:
//   GET https://YOUR-WORKER.example.workers.dev/api/v1/all
//
// The Worker adds the token server-side and returns CORS headers.

const ORIGIN = "http://business3.astrixhost.web.id:19132";

function cors(extra={}) {
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
    if (request.method === "OPTIONS") return new Response(null, {status:204, headers:cors()});
    const url = new URL(request.url);
    if (url.pathname !== "/api/v1/all") {
      return new Response(JSON.stringify({success:false,error:"Not found"}), {
        status:404, headers:{"Content-Type":"application/json",...cors()}
      });
    }
    if (!env.TICKSCOPE_TOKEN) {
      return new Response(JSON.stringify({success:false,error:"TICKSCOPE_TOKEN secret is not configured"}), {
        status:500, headers:{"Content-Type":"application/json",...cors()}
      });
    }
    const upstream = new URL(ORIGIN + "/api/v1/all");
    upstream.searchParams.set("token", env.TICKSCOPE_TOKEN);
    try {
      const r = await fetch(upstream.toString(), {method:"GET", headers:{Accept:"application/json"}});
      const body = await r.text();
      return new Response(body, {
        status:r.status,
        headers:{"Content-Type":r.headers.get("Content-Type") || "application/json",...cors()}
      });
    } catch (e) {
      return new Response(JSON.stringify({success:false,error:"Upstream fetch failed",message:String(e)}), {
        status:502, headers:{"Content-Type":"application/json",...cors()}
      });
    }
  }
};

