import { CONTACT_TOPICS as TOPICS } from "@/lib/contact";
import { appDb, now } from "@/lib/db";
import { notifyOwner } from "@/lib/notify";
import { allow, clientIp, sameOrigin } from "@/lib/rate-limit";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** POST /api/contact {name, email, topic, message, website (honeypot)} */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const str = (k: string, max: number) => (typeof body[k] === "string" ? (body[k] as string).trim().slice(0, max) : "");
  const name = str("name", 120);
  const email = str("email", 200);
  const topic = TOPICS.includes(str("topic", 60)) ? str("topic", 60) : "General";
  const message = str("message", 5000);
  // Bots fill the hidden field; pretend it worked.
  if (str("website", 200)) return Response.json({ ok: true });
  if (!name || !EMAIL.test(email) || message.length < 5) {
    return Response.json({ error: "Please add your name, a valid email and a message." }, { status: 400 });
  }
  if (!allow(`contact:${clientIp(request)}`, 5, 3_600_000) || !allow("contact:all", 100, 3_600_000)) {
    return Response.json({ error: "Too many messages right now. Please try again later." }, { status: 429 });
  }
  // Messages full of links are almost always spam; keep them, but quietly.
  const spam = (message.match(/https?:\/\//g) ?? []).length >= 3;
  const res = appDb()
    .prepare("insert into contact_messages (name, email, topic, body, status, created_at) values (?, ?, ?, ?, ?, ?)")
    .run(name, email, topic, message, spam ? "spam" : "new", now());
  if (!spam) {
    const sent = await notifyOwner(`Seeker: ${topic} from ${name}`, `${message}\n\n— ${name} <${email}>`, email);
    if (sent) appDb().prepare("update contact_messages set emailed = 1 where id = ?").run(res.lastInsertRowid);
  }
  return Response.json({ ok: true });
}
