const CONFIG = window.TICKSCOPE_CONFIG || {
  WORKER_ENDPOINT: "https://tickscope-api.brezzteam5.workers.dev",
  API_PATH: "/api/v1/all",
  REQUEST_TIMEOUT: 10000,
  AUTO_REFRESH: true,
  REFRESH_INTERVAL: 5000
};

const WORKER_URL = CONFIG.WORKER_ENDPOINT.replace(/\/+$/, "");
const API_URL = `${WORKER_URL}${CONFIG.API_PATH}`;

async function connectTickScope() {
  setStatus("CONNECTING", "loading");

  try {
    const controller = new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      CONFIG.REQUEST_TIMEOUT
    );

    const response = await fetch(API_URL, {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      cache: "no-store",
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status} ${response.statusText}`
      );
    }

    const json = await response.json();

    if (!json || json.success === false) {
      throw new Error(
        json?.error ||
        json?.message ||
        "TickScope API returned an error"
      );
    }

    renderTickScope(json);

    setStatus("ONLINE", "online");

    return json;

  } catch (error) {
    console.error("TickScope connection error:", error);

    setStatus("ERROR", "error");

    showError(
      error.name === "AbortError"
        ? "TickScope API request timed out."
        : error.message
    );
  }
}
