import { cookies } from "next/headers";
import { sameOrigin } from "@/lib/rate-limit";

// Sets the cookie copy of what this browser saved (see src/lib/stored.ts). Cookies set
// by the server last longer than ones set by scripts; 400 days is the most browsers keep.
// Nothing here is logged or stored.

const COOKIE = "seeker_s";
const CHUNK = 3_800;
const MAX_CHUNKS = 4;
const MAX_AGE = 400 * 24 * 60 * 60;

export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  const text = await request.text();
  if (text.length > 40_000) return Response.json({ error: "Too large" }, { status: 413 });
  let data: Record<string, unknown>;
  try {
    data = (JSON.parse(text) as { data?: Record<string, unknown> }).data ?? {};
  } catch {
    return Response.json({ error: "Bad JSON" }, { status: 400 });
  }
  // Favorites can grow; trim the cookie copy (localStorage keeps all of them).
  const copy = { ...data };
  let encoded = encode(copy);
  while (encoded.length > CHUNK * MAX_CHUNKS && Array.isArray(copy["seeker.favorites"]) && copy["seeker.favorites"].length) {
    copy["seeker.favorites"] = (copy["seeker.favorites"] as unknown[]).slice(0, -5);
    encoded = encode(copy);
  }
  if (encoded.length > CHUNK * MAX_CHUNKS) return Response.json({ error: "Too large" }, { status: 413 });

  const jar = await cookies();
  const secure = new URL(request.url).protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
  for (let i = 0; i < MAX_CHUNKS; i++) {
    const part = encoded.slice(i * CHUNK, (i + 1) * CHUNK);
    if (part) jar.set(`${COOKIE}${i}`, part, { maxAge: MAX_AGE, path: "/", sameSite: "lax", secure });
    else jar.delete(`${COOKIE}${i}`);
  }
  return Response.json({ ok: true, bytes: encoded.length });
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  const jar = await cookies();
  for (let i = 0; i < MAX_CHUNKS; i++) jar.delete(`${COOKIE}${i}`);
  return Response.json({ ok: true });
}

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}
