const $ = id => document.getElementById(id);

const CONFIG_ENDPOINT =
  window.TICKSCOPE_CONFIG?.WORKER_ENDPOINT ||
  "https://tickscope-api.YOUR-SUBDOMAIN.workers.dev";

const savedEndpoint =
  localStorage.getItem("tickscope_endpoint") || CONFIG_ENDPOINT;

$("endpoint").value = savedEndpoint;

let rawData = null;
let history = [];
const maxPoints = 30;
let activeTab = "spikes";

function isPlaceholder(url) {
  return !url || /YOUR-SUBDOMAIN|PASTE|YOUR-WORKER/i.test(url);
}

function normalize(raw) {
  const root = raw?.data ?? raw ?? {};
  const p = root.performance ?? root.telemetry ?? root.metrics ?? root;
  const players = root.players;
  const entities = root.entities;
  const tiles = root.tileEntities ?? root.tile_entities;
  return {
    tps: num(p.tps ?? root.tps),
    mspt: num(p.mspt ?? root.mspt),
    players: typeof players === "number" ? players : num(players?.count ?? root.playerCount ?? root.playersOnline),
    entities: typeof entities === "number" ? entities : num(entities?.count ?? root.entityCount),
    tiles: typeof tiles === "number" ? tiles : num(tiles?.count ?? root.tileEntityCount),
    chunks: num(root.loadedChunks ?? root.loaded_chunks ?? p.loadedChunks ?? p.chunks),
    server: root.server ?? p.server ?? "—",
    minecraft: root.minecraft ?? p.minecraft ?? "—",
    uptime: num(root.uptimeSeconds ?? p.uptimeSeconds),
    online: root.online ?? p.online,
    spikes: root.spikes ?? [],
    hotspots: root.hotspots ?? [],
    redstone: root.redstone ?? [],
    recommendations: root.recommendations ?? [],
    history: root.history ?? []
  };
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function fmt(v, d = 1) {
  return v == null ? "—" : Number(v).toFixed(d);
}

function uptime(s) {
  if (s == null) return "—";
  s = Math.max(0, Math.floor(s));
  const d = Math.floor(s / 86400);
  s %= 86400;
  const h = Math.floor(s / 3600);
  s %= 3600;
  const m = Math.floor(s / 60);
  s %= 60;
  return `${d ? d + "d " : ""}${h}h ${m}m ${s}s`;
}

function setStatus(ok, text = ok ? "ONLINE" : "OFFLINE") {
  $("status").textContent = text;
  $("status").className = "status " + (ok ? "online" : "offline");
}

function showError(msg) {
  $("error").textContent = msg;
  $("error").classList.remove("hidden");
}

function clearError() {
  $("error").classList.add("hidden");
}

function cleanEndpoint(endpoint) {
  endpoint = (endpoint || "").trim().replace(/\/+$/, "");
  if (!/^https:\/\//i.test(endpoint)) {
    throw new Error("HTTPS Worker URL required. It must start with https://");
  }
  return endpoint;
}

function apiUrl(endpoint) {
  const base = cleanEndpoint(endpoint);
  return `${base}/api/v1/all?_=${Date.now()}`;
}

async function fetchAll() {
  const endpoint = localStorage.getItem("tickscope_endpoint") || CONFIG_ENDPOINT;

  if (isPlaceholder(endpoint)) {
    throw new Error(
      "HTTPS Worker is not configured yet. Deploy worker/worker.js, then put its https://...workers.dev URL in assets/config.js."
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    const r = await fetch(apiUrl(endpoint), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal
    });

    const text = await r.text();
    if (!r.ok) {
      throw new Error(`Worker/API HTTP ${r.status}: ${text.slice(0, 300)}`);
    }

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error("HTTPS Worker returned non-JSON data.");
    }

    if (json.success === false) {
      throw new Error(json.message || json.error || "TickScope API returned success=false");
    }

    return json;
  } catch (e) {
    if (e.name === "AbortError") {
      throw new Error("Connection timed out. Check the Worker and TickScope server.");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

function render(raw) {
  rawData = raw;
  const d = normalize(raw);

  $("tps").textContent = fmt(d.tps, 2);
  $("mspt").textContent = fmt(d.mspt, 2);
  $("players").textContent = fmt(d.players, 0);
  $("entities").textContent = fmt(d.entities, 0);
  $("tiles").textContent = fmt(d.tiles, 0);
  $("chunks").textContent = fmt(d.chunks, 0);

  $("tpsHint").textContent = d.tps == null ? "NO DATA" : d.tps >= 19.5 ? "HEALTHY" : d.tps >= 18 ? "WARNING" : "CRITICAL";
  $("msptHint").textContent = d.mspt == null ? "NO DATA" : d.mspt <= 50 ? "HEALTHY" : d.mspt <= 75 ? "WARNING" : "CRITICAL";

  $("serverName").textContent = d.server;
  $("minecraft").textContent = d.minecraft;
  $("uptime").textContent = uptime(d.uptime);
  $("online").textContent = d.online === true ? "ONLINE" : d.online === false ? "OFFLINE" : "—";
  $("lastUpdate").textContent = "Updated " + new Date().toLocaleTimeString();
  $("chartState").textContent = "Live";

  history.push({ t: new Date(), tps: d.tps, mspt: d.mspt });
  if (history.length > maxPoints) history.shift();
  drawChart();
  renderTab();
}

function drawChart() {
  const c = $("chart");
  const ctx = c.getContext("2d");
  const dpr = devicePixelRatio || 1;
  const w = c.clientWidth;
  const h = c.clientHeight;

  c.width = w * dpr;
  c.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  if (history.length < 2) return;

  const pad = 26;
  const maxMspt = Math.max(100, ...history.map(x => x.mspt || 0));
  const y = (v, max) => h - pad - (v / max) * (h - pad * 2);

  ctx.strokeStyle = "#27344b";
  ctx.lineWidth = 1;

  for (let i = 0; i < 4; i++) {
    const yy = pad + i * (h - pad * 2) / 3;
    ctx.beginPath();
    ctx.moveTo(pad, yy);
    ctx.lineTo(w - pad, yy);
    ctx.stroke();
  }

  const path = (key, max) => {
    ctx.beginPath();
    history.forEach((p, i) => {
      const x = pad + i * (w - pad * 2) / Math.max(1, history.length - 1);
      const yy = y(p[key] ?? 0, max);
      i ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy);
    });
    ctx.stroke();
  };

  ctx.lineWidth = 2;
  ctx.strokeStyle = "#4da3ff";
  path("tps", 20);
  ctx.strokeStyle = "#c4d0e4";
  path("mspt", maxMspt);
}

function renderTab() {
  const d = normalize(rawData || {});
  let v = d[activeTab];

  if (activeTab === "entitiesTab") v = d.entities;
  if (activeTab === "tilesTab") v = d.tiles;

  $("detailOutput").textContent = JSON.stringify(v ?? [], null, 2);
}

async function connect() {
  clearError();
  setStatus(false, "CONNECTING…");

  try {
    const raw = await fetchAll();
    render(raw);
    setStatus(true, "ONLINE");
  } catch (e) {
    setStatus(false, "ERROR");
    showError(e.message || "Failed to fetch");
  }
}

$("refreshBtn").onclick = connect;

$("settingsBtn").onclick = () => {
  $("modal").classList.remove("hidden");
  $("testResult").textContent = "";
  $("endpoint").value =
    localStorage.getItem("tickscope_endpoint") || CONFIG_ENDPOINT;
};

$("closeModal").onclick = () => $("modal").classList.add("hidden");

$("saveBtn").onclick = () => {
  try {
    const endpoint = cleanEndpoint($("endpoint").value);
    localStorage.setItem("tickscope_endpoint", endpoint);
    $("modal").classList.add("hidden");
    connect();
  } catch (e) {
    $("testResult").textContent = "FAILED — " + e.message;
  }
};

$("testBtn").onclick = async () => {
  try {
    const endpoint = cleanEndpoint($("endpoint").value);
    localStorage.setItem("tickscope_endpoint", endpoint);
    $("testResult").textContent = "Testing HTTPS Worker…";
    const r = await fetchAll();
    const d = normalize(r);
    $("testResult").textContent =
      `SUCCESS — TPS ${fmt(d.tps, 2)}, MSPT ${fmt(d.mspt, 2)}, server ${d.server}`;
    setStatus(true, "ONLINE");
  } catch (e) {
    $("testResult").textContent = "FAILED — " + e.message;
    setStatus(false, "ERROR");
  }
};

$("tabs").addEventListener("click", e => {
  if (!e.target.dataset.tab) return;
  document.querySelectorAll(".tabs button").forEach(b => b.classList.remove("active"));
  e.target.classList.add("active");
  activeTab = e.target.dataset.tab;
  renderTab();
});

$("rawBtn").onclick = () => {
  $("detailOutput").textContent = JSON.stringify(
    rawData ?? { error: "No data" },
    null,
    2
  );
};

setInterval(() => {
  $("clock").textContent = new Date().toLocaleTimeString();
}, 1000);

window.addEventListener("resize", drawChart);
connect();
