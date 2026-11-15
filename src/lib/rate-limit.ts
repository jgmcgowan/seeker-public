// In-memory limits per client (one server process on the VPS, so this is enough).

const buckets = new Map<string, number[]>();

/** True when `key` has made fewer than `max` calls in the last `windowMs`; records this call. */
export function allow(key: string, max: number, windowMs: number): boolean {
  const t = Date.now();
  const hits = (buckets.get(key) ?? []).filter((h) => t - h < windowMs);
  if (hits.length >= max) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(t);
  buckets.set(key, hits);
  if (buckets.size > 10_000) for (const [k, v] of buckets) if (!v.some((h) => t - h < windowMs)) buckets.delete(k);
  return true;
}

/** Client IP as Caddy forwards it. */
export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "local";
}

/** Rejects form posts from other sites. */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
