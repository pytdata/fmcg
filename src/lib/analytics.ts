// First-party, privacy-friendly analytics client.
// Sends lightweight pageview/event beacons to our own backend (no third parties).
import { API_BASE } from '@/lib/api';

const SESSION_KEY = 'kw_session_id';

function getSessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = (crypto?.randomUUID?.() ?? `s_${Date.now()}_${Math.random().toString(36).slice(2)}`);
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return `s_${Date.now()}`;
  }
}

function detectDevice(): string {
  const w = typeof window !== 'undefined' ? window.innerWidth : 1024;
  if (w < 640) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

function send(payload: Record<string, unknown>) {
  try {
    const body = JSON.stringify(payload);
    const url = `${API_BASE}/api/analytics/track`;
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
    } else {
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
    }
  } catch { /* analytics must never break the app */ }
}

export function trackPageview(path: string) {
  // Don't track the admin area.
  if (path.startsWith('/admin')) return;
  send({
    event_type: 'pageview',
    path,
    referrer: document.referrer || null,
    device: detectDevice(),
    session_id: getSessionId(),
  });
}

export function trackEvent(eventType: string, meta?: Record<string, unknown>) {
  send({
    event_type: eventType,
    path: window.location.pathname,
    device: detectDevice(),
    session_id: getSessionId(),
    meta: meta || {},
  });
}
