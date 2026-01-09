import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "../supabase/info";

const env = ((import.meta as any)?.env ?? {}) as Record<string, any>;

const envUrl = typeof env.VITE_SUPABASE_URL === "string" ? env.VITE_SUPABASE_URL : undefined;
const envProjectId = typeof env.VITE_SUPABASE_PROJECT_ID === "string" ? env.VITE_SUPABASE_PROJECT_ID : undefined;
const envAnonKey = typeof env.VITE_SUPABASE_ANON_KEY === "string" ? env.VITE_SUPABASE_ANON_KEY : undefined;
const envAdminApiBaseUrl =
  typeof env.VITE_ADMIN_API_BASE_URL === "string" ? env.VITE_ADMIN_API_BASE_URL : undefined;

const resolvedUrl = envUrl || `https://${envProjectId || projectId}.supabase.co`;
const resolvedAnonKey = envAnonKey || publicAnonKey;
const resolvedAdminApiBaseUrl = (envAdminApiBaseUrl || "").trim();

export const ADMIN_API_BASE_URL_STORAGE = "haemolink:admin_api_base_url";

export function getAdminApiBaseUrl() {
  try {
    const stored = sessionStorage.getItem(ADMIN_API_BASE_URL_STORAGE);
    const v = typeof stored === "string" ? stored.trim() : "";
    if (v) return v;
  } catch {}

  if (resolvedAdminApiBaseUrl) return resolvedAdminApiBaseUrl;

  try {
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      if (host === "localhost" || host === "127.0.0.1") return "http://localhost:8000";
      return window.location.origin;
    }
  } catch {}

  return null;
}

export const COMPLIANCE_BUCKET =
  (typeof env.VITE_COMPLIANCE_BUCKET === "string" && env.VITE_COMPLIANCE_BUCKET.trim())
    ? env.VITE_COMPLIANCE_BUCKET.trim()
    : "compliance";

export const supabase = createClient(resolvedUrl, resolvedAnonKey, {
  global: {
    headers: {
      apikey: resolvedAnonKey,
    },
    fetch: (input, init) => {
      const nextInit = init ? { ...init } : {};
      const inputHeaders = input instanceof Request ? input.headers : undefined;
      const headers = new Headers(inputHeaders || undefined);
      const initHeaders = new Headers((nextInit as any).headers || undefined);
      initHeaders.forEach((value, key) => headers.set(key, value));
      headers.set("apikey", resolvedAnonKey);
      (nextInit as any).headers = headers;
      return fetch(input as any, nextInit as any);
    },
  },
});

export const ADMIN_API_KEY_STORAGE = "haemolink:admin_api_key";

export function getAdminApiKey() {
  try {
    const v = sessionStorage.getItem(ADMIN_API_KEY_STORAGE);
    return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
  } catch {
    return null;
  }
}

export function setAdminApiKey(value: string) {
  try {
    const v = (value || "").trim();
    if (!v) sessionStorage.removeItem(ADMIN_API_KEY_STORAGE);
    else sessionStorage.setItem(ADMIN_API_KEY_STORAGE, v);
  } catch {}
}

export function setAdminApiBaseUrl(value: string) {
  try {
    const v = (value || "").trim();
    if (!v) sessionStorage.removeItem(ADMIN_API_BASE_URL_STORAGE);
    else sessionStorage.setItem(ADMIN_API_BASE_URL_STORAGE, v);
  } catch {}
}

export async function adminApi<T>(path: string, init?: RequestInit): Promise<T> {
  const key = getAdminApiKey();
  if (!key) {
    throw new Error("Admin API key not set. Click the settings icon in the top bar.");
  }

  const base = getAdminApiBaseUrl();
  if (!base) {
    throw new Error("Admin API base URL not configured. Set VITE_ADMIN_API_BASE_URL.");
  }
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init?.headers || undefined);
  headers.set("x-admin-key", key);
  if (!headers.has("content-type")) headers.set("content-type", "application/json");

  const resp = await fetch(url, { ...init, headers });
  const text = await resp.text();
  if (!resp.ok) {
    let msg = `Request failed (${resp.status})`;
    try {
      const parsed = JSON.parse(text);
      const err = (parsed as any)?.error;
      if (typeof err === "string" && err.trim()) msg = err.trim();
    } catch {}
    if (text && text.trim().startsWith("<")) {
      msg =
        "Admin API returned HTML (not JSON). Check VITE_ADMIN_API_BASE_URL and ensure the admin server is running.";
    }
    throw new Error(msg);
  }

  if (!text) return null as T;
  if (text.trim().startsWith("<")) {
    throw new Error(
      "Admin API returned HTML (not JSON). Check VITE_ADMIN_API_BASE_URL and ensure the admin server is running.",
    );
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Admin API response was not valid JSON. Check server logs and VITE_ADMIN_API_BASE_URL.");
  }
}
