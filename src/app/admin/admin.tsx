"use client";

import { useCallback, useEffect, useState } from "react";
import type { ContactMessage } from "@/app/api/admin/messages/route";
import { ListingEditor, changedFields, draftFrom, type Draft } from "@/components/listing-editor";
import { LocationInput, type Loc } from "@/components/location-input";
import type { Listing } from "@/lib/listings";
import type { OsmPlace } from "@/lib/osm";

// Admin panel: review listing requests, edit any place directly, read messages.
// Church leaders will sign in here too once they have accounts.

type Tab = "requests" | "listings" | "places" | "messages";

async function api<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, body === undefined ? undefined : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
  return json as T;
}

export function Admin() {
  const [state, setState] = useState<{ enabled: boolean; signedIn: boolean; email: boolean } | null>(null);
  const refresh = useCallback(() => {
    api<{ enabled: boolean; signedIn: boolean; email: boolean }>("/api/admin/login").then(setState).catch(() => setState({ enabled: false, signedIn: false, email: false }));
  }, []);
  useEffect(refresh, [refresh]);

  if (!state) return <p className="text-muted">Loading…</p>;
  if (!state.enabled) return <p className="card p-5 text-sm">Admin is off. Set ADMIN_PASSWORD in the server&apos;s environment to turn it on.</p>;
  if (!state.signedIn) return <Login onDone={refresh} />;
  return <Panel emailOn={state.email} onSignOut={refresh} />;
}

function Login({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="card mx-auto max-w-sm space-y-4 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await api("/api/admin/login", { password });
          onDone();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Sign-in failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h1 className="font-display text-2xl font-semibold">Admin sign in</h1>
      <div>
        <label className="label" htmlFor="pw">Password</label>
        <input id="pw" type="password" className="field" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <button className="btn-primary" disabled={busy || !password}>
        {busy ? "Checking…" : "Sign in"}
      </button>
      {error && <p className="text-sm text-gold">{error}</p>}
    </form>
  );
}

function Panel({ emailOn, onSignOut }: { emailOn: boolean; onSignOut: () => void }) {
  const [tab, setTab] = useState<Tab>("requests");
  const tabs: { id: Tab; label: string }[] = [
    { id: "requests", label: "Requests" },
    { id: "listings", label: "Listings" },
    { id: "places", label: "Edit a place" },
    { id: "messages", label: "Messages" },
  ];
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold">Admin</h1>
        <button
          type="button"
          className="text-sm text-muted underline"
          onClick={async () => {
            await fetch("/api/admin/login", { method: "DELETE" });
            onSignOut();
          }}
        >
          Sign out
        </button>
      </header>
      {!emailOn && (
        <p className="rounded-xl bg-gold-soft p-3 text-sm">
          Email alerts are off (set SMTP_USER and SMTP_PASS, a Google app password, on the server). New requests and messages still show up here.
        </p>
      )}
      <nav className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button key={t.id} type="button" className={`chip ${tab === t.id ? "chip-on" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
      {tab === "requests" && <Listings status="pending" />}
      {tab === "listings" && <Listings status="approved" searchable />}
      {tab === "places" && <Places />}
      {tab === "messages" && <Messages />}
    </div>
  );
}

function placeName(l: Listing) {
  return l.fields.name ?? l.snapshot?.name ?? l.placeId ?? "New congregation";
}

function Listings({ status, searchable }: { status: "pending" | "approved"; searchable?: boolean }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Listing[] | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    api<{ listings: Listing[] }>(`/api/admin/listings?${new URLSearchParams({ status, q })}`)
      .then((r) => setItems(r.listings))
      .catch((e) => setError(e.message));
  }, [status, q]);
  useEffect(load, [load]);

  return (
    <section className="space-y-3">
      {searchable && (
        <input className="field" placeholder="Search listings by name or id" value={q} onChange={(e) => setQ(e.target.value)} />
      )}
      {error && <p className="text-sm text-gold">{error}</p>}
      {items?.length === 0 && <p className="text-sm text-muted">{status === "pending" ? "No requests waiting." : "No listings yet."}</p>}
      {items?.map((l) => (
        <div key={l.id} className="card space-y-3 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold">
                {placeName(l)} <span className="text-sm font-normal text-muted">#{l.id} · {l.action} · {l.placeId ?? "not on the map"}</span>
              </p>
              <p className="text-sm text-muted">
                {[l.display ? "Shown" : "Hidden", l.locked ? "Locked" : null, l.source === "admin" ? "By admin" : null, new Date(l.updatedAt).toLocaleString()]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {l.submitter && (
                <p className="text-sm">
                  From {l.submitter.name} ({l.submitter.role}) ·{" "}
                  <a className="text-accent underline" href={`mailto:${l.submitter.email}`}>
                    {l.submitter.email}
                  </a>
                </p>
              )}
              {l.submitter?.message && <p className="mt-1 rounded-lg bg-sunk p-2 text-sm">{l.submitter.message}</p>}
              {Object.keys(l.fields).length > 0 && (
                <dl className="mt-2 grid grid-cols-[8rem_1fr] gap-x-3 text-sm">
                  {Object.entries(l.fields).map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-muted">{k}</dt>
                      <dd className="break-words">{Array.isArray(v) ? v.join(", ") : String(v)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
            <button type="button" className="btn-ghost py-1.5" onClick={() => setOpen(open === l.id ? null : l.id)}>
              {open === l.id ? "Close" : status === "pending" ? "Review" : "Edit"}
            </button>
          </div>
          {open === l.id && (
            <ReviewListing
              listing={l}
              onDone={() => {
                setOpen(null);
                load();
              }}
            />
          )}
        </div>
      ))}
    </section>
  );
}

function ReviewListing({ listing, onDone }: { listing: Listing; onDone: () => void }) {
  const [draft, setDraft] = useState<Draft>(() => draftFrom(listing.snapshot, listing.fields, { display: listing.display, locked: listing.locked }));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const act = async (op: "approve" | "reject" | "save" | "delete") => {
    if (op === "delete" && !confirm("Delete this listing record? The map data will show again.")) return;
    setBusy(true);
    setError(null);
    try {
      await api("/api/admin/listings", {
        op,
        id: listing.id,
        placeId: listing.placeId,
        fields: changedFields(draft, listing.snapshot),
        display: draft.display,
        locked: draft.locked,
      });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-4 border-t border-line pt-4">
      <ListingEditor draft={draft} onChange={setDraft} isNew={!listing.placeId} admin />
      <div className="flex flex-wrap gap-2">
        {listing.status === "pending" ? (
          <>
            <button type="button" className="btn-primary" disabled={busy} onClick={() => act("approve")}>
              Approve{listing.action === "remove" ? " (hide it)" : ""}
            </button>
            <button type="button" className="btn-ghost" disabled={busy} onClick={() => act("reject")}>
              Reject
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn-primary" disabled={busy} onClick={() => act("save")}>
              Save
            </button>
            <button type="button" className="btn-ghost" disabled={busy} onClick={() => act("delete")}>
              Delete record
            </button>
          </>
        )}
      </div>
      {error && <p className="text-sm text-gold">{error}</p>}
    </div>
  );
}

type Found = { place: OsmPlace; listing: Listing | null };

function Places() {
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState<Loc | null>(null);
  const [found, setFound] = useState<Found[] | null>(null);
  const [editing, setEditing] = useState<Found | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    setError(null);
    try {
      const isId = /^(node|way|relation)\/\d+$/.test(q.trim());
      const params: Record<string, string> = isId ? { id: q.trim() } : { q, ...(loc ? { lat: String(loc.lat), lng: String(loc.lng) } : {}) };
      const r = await api<{ places: Found[] }>(`/api/admin/places?${new URLSearchParams(params)}`);
      setFound(r.places);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    }
  };

  if (editing) {
    return <EditPlace target={editing} onDone={() => setEditing(null)} />;
  }

  return (
    <section className="space-y-4">
      <div className="card space-y-3 p-4">
        <input
          className="field"
          placeholder="Name (3+ letters) or OSM id like node/123"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
        />
        <details>
          <summary className="cursor-pointer text-sm text-accent">Near a place (optional)</summary>
          <div className="mt-2">
            <LocationInput value={loc} onChange={setLoc} defaultMode="city" />
          </div>
        </details>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={search}>
            Search the map
          </button>
          <button type="button" className="btn-ghost" onClick={() => setEditing("new")}>
            Add a new congregation
          </button>
        </div>
        {error && <p className="text-sm text-gold">{error}</p>}
      </div>
      {found?.length === 0 && <p className="text-sm text-muted">Nothing found. Places only search states imported into the local copy.</p>}
      {found?.map((f) => (
        <button key={f.place.id} type="button" className="card flex w-full items-center justify-between gap-3 p-3 text-left hover:border-accent" onClick={() => setEditing(f)}>
          <span className="min-w-0">
            <span className="block font-semibold">{f.place.name}</span>
            <span className="block text-sm text-muted">
              {[f.place.address, f.place.religion, f.place.denomination, f.place.id, f.listing ? (f.listing.display ? "has listing" : "hidden") : null].filter(Boolean).join(" · ")}
            </span>
          </span>
          <span className="shrink-0 text-sm font-semibold text-accent">Edit</span>
        </button>
      ))}
    </section>
  );
}

function EditPlace({ target, onDone }: { target: Found | "new"; onDone: () => void }) {
  const place = target === "new" ? null : target.place;
  const listing = target === "new" ? null : target.listing;
  const [draft, setDraft] = useState<Draft>(() => draftFrom(place, listing?.fields, listing ? { display: listing.display, locked: listing.locked } : undefined));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  return (
    <section className="card space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold">{place ? `Edit ${place.name}` : "New congregation"}</h2>
        <button type="button" className="text-sm text-muted underline" onClick={onDone}>
          Back to search
        </button>
      </div>
      <ListingEditor draft={draft} onChange={setDraft} isNew={!place} admin />
      <button
        type="button"
        className="btn-primary"
        onClick={async () => {
          setError(null);
          try {
            await api("/api/admin/listings", {
              op: "save",
              id: listing?.id,
              placeId: place?.id ?? null,
              fields: changedFields(draft, place),
              display: draft.display,
              locked: draft.locked,
            });
            setSaved(true);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Save failed");
          }
        }}
      >
        Save and publish
      </button>
      {saved && <p className="text-sm text-good">Saved. It shows in search results now.</p>}
      {error && <p className="text-sm text-gold">{error}</p>}
    </section>
  );
}

function Messages() {
  const [items, setItems] = useState<ContactMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    api<{ messages: ContactMessage[] }>("/api/admin/messages")
      .then((r) => setItems(r.messages))
      .catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);
  const mark = async (id: number, status: string) => {
    await api("/api/admin/messages", { id, status });
    load();
  };
  return (
    <section className="space-y-3">
      {error && <p className="text-sm text-gold">{error}</p>}
      {items?.length === 0 && <p className="text-sm text-muted">No messages yet.</p>}
      {items?.map((m) => (
        <div key={m.id} className={`card space-y-2 p-4 ${m.status === "new" ? "border-accent" : "opacity-80"}`}>
          <p className="text-sm">
            <span className="font-semibold">{m.name}</span>{" "}
            <a className="text-accent underline" href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.topic}`)}`}>
              {m.email}
            </a>{" "}
            <span className="text-muted">
              · {m.topic} · {new Date(m.created_at).toLocaleString()} · {m.status}
              {m.emailed ? " · emailed" : ""}
            </span>
          </p>
          <p className="whitespace-pre-wrap text-sm">{m.body}</p>
          <div className="flex gap-3 text-sm">
            {m.status !== "done" && (
              <button type="button" className="text-accent underline" onClick={() => mark(m.id, "done")}>
                Mark done
              </button>
            )}
            {m.status !== "spam" ? (
              <button type="button" className="text-muted underline" onClick={() => mark(m.id, "spam")}>
                Spam
              </button>
            ) : (
              <button type="button" className="text-muted underline" onClick={() => mark(m.id, "new")}>
                Not spam
              </button>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}
