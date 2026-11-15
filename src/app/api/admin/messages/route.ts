import { requireAdmin } from "@/lib/admin-auth";
import { appDb } from "@/lib/db";

export type ContactMessage = { id: number; name: string; email: string; topic: string; body: string; status: string; emailed: number; created_at: string };

export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const messages = appDb().prepare("select * from contact_messages order by created_at desc limit 200").all() as ContactMessage[];
  return Response.json({ messages });
}

/** POST {id, status: new | done | spam} */
export async function POST(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const { id, status } = (await request.json().catch(() => ({}))) as { id?: number; status?: string };
  if (!id || !["new", "done", "spam"].includes(status ?? "")) return Response.json({ error: "Bad request" }, { status: 400 });
  appDb().prepare("update contact_messages set status = ? where id = ?").run(status!, id);
  return Response.json({ ok: true });
}
