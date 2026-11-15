"use client";

import { useSyncExternalStore } from "react";

// Everything Seeker remembers about a visitor lives in this browser: localStorage
// first, mirrored to a cookie so it survives storage clean-ups. Browsers cap cookies
// written by scripts at about a week (Safari), so the cookie is set by our server
// (POST /api/state) for 400 days, the longest browsers allow, and renewed on use.
// The server only echoes it back; nothing is stored there.

export const STORED_KEYS = ["seeker.prefs", "seeker.quiz", "seeker.myPlace", "seeker.favorites", "seeker.sort"] as const;
export type StoredKey = (typeof STORED_KEYS)[number];

const COOKIE = "seeker_s";
const SYNCED_AT = "seeker.syncedAt";
const listeners = new Set<() => void>();

function rawGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function rawSet(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage blocked (private mode); the cookie copy still works.
  }
}

/** The cookie copy: base64url JSON split over seeker_s0, seeker_s1, … */
function readCookie(): Partial<Record<StoredKey, unknown>> | null {
  try {
    const parts = new Map<number, string>();
    for (const c of document.cookie.split(/;\s*/)) {
      const m = c.match(new RegExp(`^${COOKIE}(\\d+)=(.*)$`));
      if (m) parts.set(Number(m[1]), m[2]);
    }
    if (!parts.size) return null;
    const b64 = [...parts.keys()].sort((a, b) => a - b).map((k) => parts.get(k)).join("");
    const bin = atob(b64.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0))));
  } catch {
    return null;
  }
}

let restored = false;

/** Brings back anything localStorage lost from the cookie copy. Runs once per page load. */
function restore() {
  if (restored || typeof window === "undefined") return;
  restored = true;
  const copy = readCookie();
  if (copy) {
    for (const key of STORED_KEYS) {
      if (rawGet(key) === null && copy[key] !== undefined && copy[key] !== null) rawSet(key, JSON.stringify(copy[key]));
    }
  }
  // Renew the cookie about once a day so it doesn't expire while in use.
  const last = Number(rawGet(SYNCED_AT) ?? 0);
  if (Date.now() - last > 86_400_000 && STORED_KEYS.some((k) => rawGet(k) !== null)) scheduleSync(2_000);
}

let timer: ReturnType<typeof setTimeout> | undefined;

function scheduleSync(delay = 800) {
  clearTimeout(timer);
  timer = setTimeout(sync, delay);
}

async function sync() {
  const data: Record<string, unknown> = {};
  for (const key of STORED_KEYS) {
    const raw = rawGet(key);
    if (raw !== null) {
      try {
        data[key] = JSON.parse(raw);
      } catch {}
    }
  }
  try {
    const res = await fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
      keepalive: true,
    });
    if (res.ok) rawSet(SYNCED_AT, String(Date.now()));
  } catch {
    // Offline; the next change retries.
  }
}

export function readStored<T>(key: StoredKey, fallback: T): T {
  restore();
  const raw = rawGet(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeStored(key: StoredKey, value: unknown) {
  rawSet(key, value === null || value === undefined ? null : JSON.stringify(value));
  listeners.forEach((l) => l());
  scheduleSync();
}

/** Clears everything Seeker saved, here and in the cookie. */
export function forgetEverything() {
  for (const key of STORED_KEYS) rawSet(key, null);
  listeners.forEach((l) => l());
  fetch("/api/state", { method: "DELETE" }).catch(() => {});
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => (STORED_KEYS as readonly string[]).includes(e.key ?? "") && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const cache = new Map<string, { raw: string | null; value: unknown }>();

/** A stored value that re-renders when it changes (in this tab or another). Fallback on the server. */
export function useStored<T>(key: StoredKey, fallback: T): T {
  return useSyncExternalStore(
    subscribe,
    () => {
      restore();
      const raw = rawGet(key);
      const hit = cache.get(key);
      if (hit && hit.raw === raw) return hit.value as T;
      let value: unknown = fallback;
      try {
        value = raw === null ? fallback : JSON.parse(raw);
      } catch {}
      cache.set(key, { raw, value });
      return value as T;
    },
    () => fallback,
  );
}
