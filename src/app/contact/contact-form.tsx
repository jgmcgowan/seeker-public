"use client";

import { useState } from "react";
import { CONTACT_TOPICS } from "@/lib/contact";

export function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", topic: CONTACT_TOPICS[0], message: "", website: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  if (status === "sent") {
    return (
      <div className="card space-y-2 p-5">
        <p className="font-semibold">Thanks, your message is on its way.</p>
        <p className="text-sm text-muted">We&apos;ll reply to {form.email}.</p>
      </div>
    );
  }

  return (
    <form
      className="card space-y-4 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setStatus("sending");
        setError(null);
        try {
          const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? "Couldn't send that");
          setStatus("sent");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Couldn't send that");
          setStatus("idle");
        }
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="c-name">Name</label>
          <input id="c-name" className="field" autoComplete="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="c-email">Email</label>
          <input id="c-email" className="field" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="c-topic">About</label>
        <select id="c-topic" className="field" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })}>
          {CONTACT_TOPICS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="c-msg">Message</label>
        <textarea id="c-msg" className="field" rows={6} required minLength={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
      </div>
      {/* Hidden from people; bots fill it in. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} aria-hidden />
      <button type="submit" className="btn-primary" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Send"}
      </button>
      {error && <p className="text-sm text-gold">{error}</p>}
    </form>
  );
}
