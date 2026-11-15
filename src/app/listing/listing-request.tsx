"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { PlaceResult } from "@/app/api/places/route";
import type { ListingLookup } from "@/app/api/listings/route";
import { ListingEditor, changedFields, draftFrom, type Draft } from "@/components/listing-editor";
import { LocationInput, type Loc } from "@/components/location-input";
import { LISTING_ROLES } from "@/lib/contact";

type Mode = "update" | "remove" | "add";

export function ListingRequest() {
  const params = useSearchParams();
  const [placeId, setPlaceId] = useState(params.get("place"));
  const [lookup, setLookup] = useState<ListingLookup | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>(params.get("place") ? "update" : "add");
  const [draft, setDraft] = useState<Draft>(() => draftFrom(null));
  const [who, setWho] = useState({ name: "", email: "", role: LISTING_ROLES[0], message: "" });
  const [trap, setTrap] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!placeId) return;
    let cancelled = false;
    fetch(`/api/listings?${new URLSearchParams({ place: placeId })}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Not found");
        if (cancelled) return;
        const l = json as ListingLookup;
        setLookup(l);
        setDraft(draftFrom(l.place, l.listing?.fields, l.listing ? { display: l.listing.display, locked: l.listing.locked } : undefined));
      })
      .catch((e) => !cancelled && setLoadError(e instanceof Error ? e.message : "Couldn't load that place"));
    return () => {
      cancelled = true;
    };
  }, [placeId]);

  const submit = async () => {
    setSending(true);
    setError(null);
    try {
      const fields = mode === "remove" ? {} : changedFields(draft, lookup?.place ?? null);
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: mode,
          placeId: mode === "add" ? null : placeId,
          fields,
          display: mode === "remove" ? false : draft.display,
          locked: draft.locked,
          submitter: who,
          website: trap,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't send that");
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send that");
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="font-display text-4xl font-semibold">Thank you</h1>
        <p className="text-muted">
          We&apos;ve got your request. We review every change by hand and may email you to confirm you speak for
          the congregation. Most requests are done within a few days.
        </p>
        <Link href="/find" className="btn-ghost">
          Back to Find a place
        </Link>
      </div>
    );
  }

  const name = lookup?.place?.name ?? lookup?.listing?.fields.name;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-2">
        <h1 className="font-display text-4xl font-semibold">{placeId ? `Update ${name ?? "a listing"}` : "Add or update your congregation"}</h1>
        <p className="text-muted">
          Seeker helps newcomers and travellers find congregations like yours. Most listings come from
          OpenStreetMap and often miss service times. Add your congregation, correct its details, or ask us to
          take it off Seeker. It&apos;s free, and we review each request.
        </p>
      </header>

      {!placeId && <FindExisting onPick={(id) => { setPlaceId(id); setMode("update"); }} />}

      {placeId && loadError && <p className="card p-4 text-sm text-gold">{loadError}</p>}

      {placeId && lookup && (
        <section className="card space-y-3 p-5">
          <p className="text-sm text-muted">{lookup.place?.address ?? lookup.listing?.fields.address ?? ""}</p>
          {lookup.listing?.locked && (
            <p className="rounded-xl bg-gold-soft p-3 text-sm">
              This listing is locked by its congregation. You can still send a request; we&apos;ll check with them first.
            </p>
          )}
          <div className="flex flex-wrap gap-2" role="group" aria-label="What would you like to do?">
            <button type="button" className={`chip ${mode === "update" ? "chip-on" : ""}`} onClick={() => setMode("update")}>
              Update details
            </button>
            <button type="button" className={`chip ${mode === "remove" ? "chip-on" : ""}`} onClick={() => setMode("remove")}>
              Remove from Seeker
            </button>
          </div>
          <button
            type="button"
            className="text-sm text-accent underline"
            onClick={() => {
              setPlaceId(null);
              setLookup(null);
              setMode("add");
              setDraft(draftFrom(null));
            }}
          >
            Not this one? Add a different congregation
          </button>
        </section>
      )}

      <form
        className="space-y-8"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {mode !== "remove" && (!placeId || lookup) && (
          <section className="card p-5">
            <h2 className="mb-4 font-display text-xl font-semibold">{mode === "add" ? "New congregation" : "Details"}</h2>
            <ListingEditor draft={draft} onChange={setDraft} isNew={mode === "add"} />
          </section>
        )}

        {mode === "remove" && lookup && (
          <section className="card space-y-2 p-5 text-sm">
            <p className="font-semibold">We&apos;ll hide {name} from Seeker&apos;s results and map.</p>
            <p className="text-muted">
              It stays hidden even when the public map data refreshes. Tell us why below if you like (closed,
              merged, moved, or you&apos;d just rather not be listed).
            </p>
          </section>
        )}

        <section className="card space-y-4 p-5">
          <h2 className="font-display text-xl font-semibold">About you</h2>
          <p className="text-sm text-muted">So we can confirm the change. Never shown on Seeker.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="w-name">Your name</label>
              <input id="w-name" className="field" autoComplete="name" required value={who.name} onChange={(e) => setWho({ ...who, name: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="w-email">Email</label>
              <input id="w-email" className="field" type="email" autoComplete="email" required value={who.email} onChange={(e) => setWho({ ...who, email: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="w-role">Your role</label>
            <select id="w-role" className="field" value={who.role} onChange={(e) => setWho({ ...who, role: e.target.value })}>
              {LISTING_ROLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="w-msg">Anything else? (optional)</label>
            <textarea id="w-msg" className="field" rows={3} value={who.message} onChange={(e) => setWho({ ...who, message: e.target.value })} />
          </div>
          {/* Hidden from people; bots fill it in. */}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" value={trap} onChange={(e) => setTrap(e.target.value)} aria-hidden />
          <button type="submit" className="btn-primary" disabled={sending || (!!placeId && !lookup)}>
            {sending ? "Sending…" : mode === "remove" ? "Ask to remove it" : mode === "add" ? "Send the new listing" : "Send the update"}
          </button>
          {error && <p className="text-sm text-gold">{error}</p>}
        </section>
      </form>
    </div>
  );
}

/** "Already on Seeker?": search by name near a place, then pick it. */
function FindExisting({ onPick }: { onPick: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [loc, setLoc] = useState<Loc | null>(null);
  const [name, setName] = useState("");
  const [results, setResults] = useState<PlaceResult[] | null>(null);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!loc) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/places?${new URLSearchParams({ lat: String(loc.lat), lng: String(loc.lng), miles: "10", q: name })}`);
      const json = await res.json();
      setResults(res.ok ? json.places : []);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <p className="card p-4 text-sm">
        Already on Seeker or the map?{" "}
        <button type="button" className="font-semibold text-accent underline" onClick={() => setOpen(true)}>
          Find it to update or remove it
        </button>
        . Otherwise fill in the form below to add it.
      </p>
    );
  }
  return (
    <section className="card space-y-4 p-5">
      <h2 className="font-display text-xl font-semibold">Find your congregation</h2>
      <LocationInput value={loc} onChange={setLoc} defaultMode="city" />
      <input className="field" placeholder="Name (or part of it)" value={name} onChange={(e) => setName(e.target.value)} />
      <button type="button" className="btn-primary" disabled={!loc || loading} onClick={search}>
        {loading ? "Searching…" : "Search"}
      </button>
      {results && (
        <div className="space-y-2">
          {results.length === 0 && <p className="text-sm text-muted">Nothing by that name within 10 miles. Add it below.</p>}
          {results.slice(0, 15).map((p) => (
            <button key={p.id} type="button" className="flex w-full items-center justify-between gap-3 rounded-xl border border-line p-3 text-left hover:bg-sunk" onClick={() => onPick(p.id)}>
              <span className="min-w-0">
                <span className="block font-semibold">{p.name}</span>
                <span className="block text-sm text-muted">{[p.label, p.address, `${p.miles} mi`].filter(Boolean).join(" · ")}</span>
              </span>
              <span className="shrink-0 text-sm font-semibold text-accent">This one</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
