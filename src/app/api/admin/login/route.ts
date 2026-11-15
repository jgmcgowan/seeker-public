import { adminEnabled, endSession, getSession, lockedFor, passwordMatches, recordFailure, recordSuccess, startSession } from "@/lib/admin-auth";
import { emailConfigured } from "@/lib/notify";
import { clientIp, sameOrigin } from "@/lib/rate-limit";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** GET: am I signed in? */
export async function GET() {
  return Response.json({ enabled: adminEnabled(), signedIn: !!(await getSession()), email: emailConfigured() });
}

/** POST {password}: sign in. Every attempt takes a moment; repeated failures lock the IP out for longer. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  if (!adminEnabled()) return Response.json({ error: "Admin isn't set up (ADMIN_PASSWORD)." }, { status: 503 });
  const ip = clientIp(request);
  const wait = lockedFor(ip);
  if (wait) return Response.json({ error: `Too many tries. Wait ${wait} seconds.` }, { status: 429 });
  const { password } = (await request.json().catch(() => ({}))) as { password?: string };
  await sleep(600);
  if (typeof password !== "string" || !passwordMatches(password)) {
    recordFailure(ip);
    return Response.json({ error: "That password isn't right." }, { status: 401 });
  }
  recordSuccess(ip);
  const secure = new URL(request.url).protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
  await startSession(secure);
  return Response.json({ ok: true });
}

/** DELETE: sign out. */
export async function DELETE() {
  await endSession();
  return Response.json({ ok: true });
}
