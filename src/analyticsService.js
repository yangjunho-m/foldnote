const QUEUE_KEY = "foldnote.analyticsQueue.v1";
const SESSION_KEY = "foldnote.analyticsSession.v1";
const MAX_QUEUE = 100;

let contextProvider = () => ({});
let sessionStartedAt = Date.now();
let sessionId = "";
let flushTimer = null;
let lastSearchLog = "";
let lastSearchLogAt = 0;

export function initAnalytics(provider = () => ({})) {
  contextProvider = provider;
  sessionId = getSessionId();
  sessionStartedAt = Date.now();
  flushAnalyticsQueue();

  window.addEventListener("pagehide", () => {
    trackAnalyticsEvent("session_time", {
      durationMs: Date.now() - sessionStartedAt
    });
    flushAnalyticsQueue({ keepalive: true });
  });
}

export function trackSearchInput(query) {
  const trimmed = String(query || "").trim();
  if (!trimmed) return;
  const now = Date.now();
  if (trimmed === lastSearchLog && now - lastSearchLogAt < 3000) return;
  lastSearchLog = trimmed;
  lastSearchLogAt = now;
  trackAnalyticsEvent("search_input", { query: trimmed });
}

export function trackAnalyticsEvent(eventType, payload = {}) {
  const event = {
    session_id: sessionId || getSessionId(),
    event_type: eventType,
    payload: {
      ...contextProvider(),
      ...payload
    },
    occurred_at: new Date().toISOString(),
    page_url: window.location.href,
    user_agent: window.navigator.userAgent
  };

  saveQueuedEvent(event);
  window.clearTimeout(flushTimer);
  flushTimer = window.setTimeout(() => flushAnalyticsQueue(), 500);
}

async function flushAnalyticsQueue(options = {}) {
  const config = getSupabaseConfig();
  const queue = loadQueue();
  if (!config || !queue.length) return;

  try {
    const response = await fetch(`${config.url.replace(/\/$/, "")}/rest/v1/foldnote_events`, {
      method: "POST",
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify(queue),
      keepalive: Boolean(options.keepalive)
    });

    if (!response.ok) throw new Error(`Supabase log failed: ${response.status}`);
    window.localStorage.removeItem(QUEUE_KEY);
  } catch {
    saveQueue(queue);
  }
}

function getSupabaseConfig() {
  const globalConfig = window.FOLDNOTE_SUPABASE || {};
  const url = globalConfig.url || window.localStorage.getItem("foldnote.supabaseUrl");
  const anonKey = globalConfig.anonKey || window.localStorage.getItem("foldnote.supabaseAnonKey");
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

function getSessionId() {
  const existing = window.sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const generated =
    window.crypto?.randomUUID?.() || `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.sessionStorage.setItem(SESSION_KEY, generated);
  return generated;
}

function loadQueue() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(QUEUE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveQueuedEvent(event) {
  saveQueue([...loadQueue(), event].slice(-MAX_QUEUE));
}

function saveQueue(queue) {
  window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE)));
}
