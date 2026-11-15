import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";

// One admin for now, signing in with ADMIN_PASSWORD from the server's .env.
// The session is a signed, expiring cookie. Failed attempts slow down sharply per IP.
// Church leaders will get their own accounts later; `role` is here for that.

const COOKIE = "seeker_admin";
const HOURS = 12;

export type Session = { role: "admin"; exp: number };

function secret(): string | null {
  const s = process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD;
  return s ? crypto.createHash("sha256").update(`seeker-admin:${s}`).digest("hex") : null;
}

const sign = (payload: string, key: string) => crypto.createHmac("sha256", key).update(payload).digest("base64url");

export const adminEnabled = () => !!process.env.ADMIN_PASSWORD;

export function passwordMatches(input: string): boolean {
  const want = process.env.ADMIN_PASSWORD;
  if (!want) return false;
  const a = crypto.createHash("sha256").update(input).digest();
  const b = crypto.createHash("sha256").update(want).digest();
  return crypto.timingSafeEqual(a, b);
}

export async function startSession(secure: boolean) {
  const key = secret()!;
  const payload = Buffer.from(JSON.stringify({ role: "admin", exp: Date.now() + HOURS * 3_600_000 } satisfies Session)).toString("base64url");
  (await cookies()).set(COOKIE, `${payload}.${sign(payload, key)}`, {
    httpOnly: true,
    secure,
    sameSite: "strict",
    path: "/",
    maxAge: HOURS * 3600,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const key = secret();
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!key || !raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload, key));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
    return s.exp > Date.now() ? s : null;
  } catch {
    return null;
  }
}

// ---- slowing down password guesses ----

const failures = new Map<string, { count: number; until: number }>();

/** Seconds to wait before this IP may try again (0 = go ahead). */
export function lockedFor(ip: string): number {
  const f = failures.get(ip);
  return f && f.until > Date.now() ? Math.ceil((f.until - Date.now()) / 1000) : 0;
}

export function recordFailure(ip: string) {
  const f = failures.get(ip) ?? { count: 0, until: 0 };
  f.count++;
  // 3 free tries, then 30 s, 1 min, 2 min… up to an hour.
  f.until = f.count > 3 ? Date.now() + Math.min(3600, 30 * 2 ** (f.count - 4)) * 1000 : 0;
  failures.set(ip, f);
}

export function recordSuccess(ip: string) {
  failures.delete(ip);
}

/** For API routes: 401 unless signed in. */
export async function requireAdmin(request: Request): Promise<Response | null> {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (request.method !== "GET" && origin && new URL(origin).host !== host) return new Response(null, { status: 403 });
  return (await getSession()) ? null : Response.json({ error: "Sign in again." }, { status: 401 });
}
