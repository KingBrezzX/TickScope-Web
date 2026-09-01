/**
 * TickScope Web - Production Configuration
 * ZyrexSMP
 *
 * IMPORTANT:
 * - Browser connects ONLY to HTTPS Worker.
 * - Never put the TickScope API token here.
 * - The token stays inside Cloudflare Worker Secret:
 *   TICKSCOPE_TOKEN
 */

window.TICKSCOPE_CONFIG = {
  // Cloudflare HTTPS Worker
  WORKER_ENDPOINT: "https://tickscope-api.brezzteam5.workers.dev",

  // Main API endpoint
  API_PATH: "/api/v1/all",

  // Connection settings
  REQUEST_TIMEOUT: 10000,
  AUTO_REFRESH: true,
  REFRESH_INTERVAL: 5000,

  // Branding
  SERVER_NAME: "ZyrexSMP",
  DASHBOARD_NAME: "TickScope",
  DASHBOARD_SUBTITLE: "ZyrexSMP Performance Console",

  // UI
  SHOW_RAW_JSON: true,
  SHOW_SERVER_INFO: true,
  SHOW_PERFORMANCE_GRAPH: true,

  // API mode
  HTTPS_ONLY: true,
  USE_WORKER: true
};
