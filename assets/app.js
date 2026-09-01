(() => {
  "use strict";

  const C = window.TICKSCOPE_CONFIG || {};
  const ENDPOINT = String(C.WORKER_ENDPOINT || "").replace(/\/+$/, "");
  const API_PATH = String(C.API_PATH || "/api/v1/all");
  const API_URL = ENDPOINT + API_PATH;

  let lastData = null;
  let timer = null;
  const history = [];

  const $ = id => document.getElementById(id);

  function setText(id, value) {
    const el = $(id);
    if (el) el.textContent = value == null ? "—" : String(value);
  }

  function fmtTime(ms) {
    if (!ms) return "—";
    const d = new Date(Number(ms));
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
  }

  function fmtUptime(sec) {
    sec = Number(sec || 0);
    const d = Math.floor(sec / 86400);
    const h = Math.floor(sec % 86400 / 3600);
    const m = Math.floor(sec % 3600 / 60);
    return `${d ? d + "d " : ""}${h ? h + "h " : ""}${m}m`;
  }

  function normalize(payload) {
    if (!payload || typeof payload !== "object") return {};
    if (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) {
      return { ...payload.data, _root: payload };
    }
    return { ...payload, _root: payload };
  }

  async function fetchJson() {
    if (!ENDPOINT.startsWith("https://")) {
      throw new Error("HTTPS Worker Endpoint is required.");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number(C.REQUEST_TIMEOUT || 10000));

    try {
      const response = await fetch(API_URL, {
        method: "GET",
        headers: { "Accept": "application/json" },
        cache: "no-store",
        signal: controller.signal
      });
      const text = await response.text();
      let json;
      try { json = JSON.parse(text); } catch { throw new Error(`Invalid JSON (HTTP ${response.status})`); }
      if (!response.ok || json.success === false) {
        throw new Error(json.error || json.message || `HTTP ${response.status}`);
      }
      return json;
    } finally {
      clearTimeout(timeout);
    }
  }

  function setStatus(type, text) {
    const el = $("statusBadge");
    if (!el) return;
    el.className = `badge ${type}`;
    el.textContent = text;
  }

  function render(data) {
    const d = normalize(data);
    lastData = d;
    history.push({ t: Date.now(), tps: Number(d.tps), mspt: Number(d.mspt) });
    while (history.length > 60) history.shift();

    setText("tps", Number.isFinite(Number(d.tps)) ? Number(d.tps).toFixed(2) : "—");
    setText("mspt", Number.isFinite(Number(d.mspt)) ? Number(d.mspt).toFixed(2) : "—");
    setText("players", d.players);
    setText("entities", d.entities);
    setText("tileEntities", d.tileEntities);
    setText("loadedChunks", d.loadedChunks);

    setText("tpsState", d.tps == null ? "WAITING" : Number(d.tps) >= 19.5 ? "HEALTHY" : Number(d.tps) >= 15 ? "WARNING" : "CRITICAL");
    setText("msptState", d.mspt == null ? "WAITING" : Number(d.mspt) <= 50 ? "HEALTHY" : Number(d.mspt) <= 100 ? "WARNING" : "CRITICAL");

    setText("serverName", d.server || C.SERVER_NAME || "—");
    setText("minecraft", d.minecraft);
    setText("uptime", d.uptimeSeconds == null ? "—" : fmtUptime(d.uptimeSeconds));
    setText("serverStatus", d.online === false ? "OFFLINE" : "ONLINE");
    setText("lastUpdated", fmtTime(d.timestamp || Date.now()));

    setStatus("online", "ONLINE");
    drawChart();
    renderTab(document.querySelector(".tab.active")?.dataset.tab || "spikes");
  }

  function rows(value) {
    if (value == null) return `<div class="empty">No data returned by <code>/api/v1/all</code>.</div>`;
    if (Array.isArray(value)) {
      if (!value.length) return `<div class="empty">No records.</div>`;
      return `<pre>${escapeHtml(JSON.stringify(value, null, 2))}</pre>`;
    }
    if (typeof value === "object") return `<pre>${escapeHtml(JSON.stringify(value, null, 2))}</pre>`;
    return `<div class="value">${escapeHtml(String(value))}</div>`;
  }

  function findField(d, names) {
    for (const name of names) if (d[name] !== undefined) return d[name];
    return undefined;
  }

  function renderTab(tab) {
    const d = lastData || {};
    const content = $("tabContent");
    if (!content) return;

    const map = {
      spikes: ["spikes", "spike", "recentSpikes"],
      hotspots: ["hotspots", "hotspot"],
      redstone: ["redstone", "redstoneStats"],
      entitiesTab: ["entityStats", "entitiesDetail", "entities"],
      tileTab: ["tileEntityStats", "tileEntitiesDetail", "tileEntities"],
      recommendations: ["recommendations", "recommendation"],
      history: ["history", "samples"]
    };

    if (tab === "raw") {
      content.innerHTML = rows(d._root || d);
      return;
    }

    const value = findField(d, map[tab] || []);
    content.innerHTML = value === undefined
      ? `<div class="empty">This category is not included in the current <code>/api/v1/all</code> response.</div>`
      : rows(value);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[c]));
  }

  function drawChart() {
    const canvas = $("performanceChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(300, rect.width * dpr);
    canvas.height = 180 * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width || 600, h = 180;
    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(255,255,255,.08)";
    ctx.lineWidth = 1;
    for (let i=1;i<5;i++) {
      const y = (h/5)*i;
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke();
    }

    const samples = history.filter(x => Number.isFinite(x.tps) && Number.isFinite(x.mspt));
    if (samples.length < 2) {
      ctx.fillStyle = "rgba(255,255,255,.45)";
      ctx.font = "13px system-ui";
      ctx.fillText("Waiting for performance samples…", 18, 30);
      return;
    }

    const draw = (key, max, offset) => {
      ctx.beginPath();
      samples.forEach((s,i) => {
        const x = i/(samples.length-1)*w;
        const v = Math.max(0, Math.min(max, s[key]));
        const y = h - (v/max)*h + offset;
        i ? ctx.lineTo(x,y) : ctx.moveTo(x,y);
      });
      ctx.strokeStyle = key === "tps" ? "#7dd3fc" : "#c4b5fd";
      ctx.lineWidth = 2;
      ctx.stroke();
    };
    draw("tps", 20, 0);
    draw("mspt", 200, 0);
  }

  async function connect() {
    setStatus("waiting", "CONNECTING");
    try {
      const json = await fetchJson();
      render(json);
      $("settingsResult").textContent = "Connection successful.";
      return json;
    } catch (err) {
      const message = err?.name === "AbortError" ? "Request timed out." : (err?.message || String(err));
      setStatus("error", "ERROR");
      $("settingsResult").textContent = message;
      setText("lastUpdated", message);
      return null;
    }
  }

  $("refreshBtn")?.addEventListener("click", connect);
  $("settingsBtn")?.addEventListener("click", () => $("settingsDialog")?.showModal());
  $("closeSettings")?.addEventListener("click", () => $("settingsDialog")?.close());
  $("testBtn")?.addEventListener("click", connect);
  $("saveBtn")?.addEventListener("click", async () => { await connect(); $("settingsDialog")?.close(); });

  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
      btn.classList.add("active");
      renderTab(btn.dataset.tab);
    });
  });

  window.addEventListener("resize", drawChart);

  $("apiEndpoint").value = ENDPOINT;

  connect();
  if (C.AUTO_REFRESH !== false) timer = setInterval(connect, Number(C.REFRESH_INTERVAL || 5000));

  window.TickScope = {
    connect,
    refresh: connect,
    getLastData: () => lastData,
    getApiUrl: () => API_URL
  };
})();
