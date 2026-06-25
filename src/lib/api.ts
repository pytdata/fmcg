// Central API client — all requests to the Express backend go through here

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Separate sessions for the storefront and the admin portal so logging into one
// never authenticates the other (even in the same browser tab).
export const CUSTOMER_TOKEN_KEY = 'kw_token';
export const ADMIN_TOKEN_KEY = 'kw_admin_token';

function isAdminArea(): boolean {
  return typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
}

// Default token for generic data calls — picked by which area made the request.
function getToken(): string | null {
  return localStorage.getItem(isAdminArea() ? ADMIN_TOKEN_KEY : CUSTOMER_TOKEN_KEY);
}

// Customer (storefront) session helpers
export function setToken(token: string) {
  localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(CUSTOMER_TOKEN_KEY);
}

// Admin (portal) session helpers
export function setAdminToken(token: string) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}
export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  auth?: boolean;
  /** Force a specific token key (used by the auth contexts to stay scoped). */
  tokenKey?: string;
};

export async function apiRequest<T = unknown>(
  path: string,
  { method = 'GET', body, headers = {}, tokenKey }: RequestOptions = {},
): Promise<T> {
  const allHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  const token = tokenKey ? localStorage.getItem(tokenKey) : getToken();
  if (token) {
    allHeaders['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: allHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    const msg = (data as { error?: string })?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data as T;
}

// Convenience helpers
export const api = {
  get: <T>(path: string) => apiRequest<T>(path),
  post: <T>(path: string, body: unknown) => apiRequest<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body: unknown) => apiRequest<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body: unknown) => apiRequest<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
};

// ── Lightweight in-memory GET cache (faster repeat loads of public data) ──────
const _cache = new Map<string, { ts: number; data: unknown }>();
const DEFAULT_TTL = 60_000; // 60s

export async function cachedGet<T>(path: string, ttl = DEFAULT_TTL): Promise<T> {
  const hit = _cache.get(path);
  if (hit && Date.now() - hit.ts < ttl) return hit.data as T;
  const data = await apiRequest<T>(path);
  _cache.set(path, { ts: Date.now(), data });
  return data;
}

/** Invalidate cached GETs — call after a mutation. Pass a prefix to clear a subset. */
export function invalidateCache(prefix?: string) {
  if (!prefix) { _cache.clear(); return; }
  for (const key of _cache.keys()) if (key.startsWith(prefix)) _cache.delete(key);
}

// Multipart upload helper
export async function uploadImage(path: string, file: File): Promise<{ url?: string; urls?: string[] }> {
  const token = getToken();
  const form = new FormData();
  form.append('image', file);
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string })?.error || 'Upload failed');
  }
  return res.json();
}

export async function uploadImages(path: string, files: File[]): Promise<{ urls: string[] }> {
  const token = getToken();
  const form = new FormData();
  files.forEach(f => form.append('images', f));
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string })?.error || 'Upload failed');
  }
  return res.json();
}

export const API_BASE = BASE;
