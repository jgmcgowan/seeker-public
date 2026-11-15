"use client";

import Link from "next/link";
import { useState } from "react";
import type { PlaceResult } from "@/app/api/places/route";
import { Directions } from "@/components/directions";
import { FaithSelect } from "@/components/faith-picker";
import { LocationInput, type Loc } from "@/components/location-input";
import { TravelSearch } from "@/components/travel-search";
import { removeFavorite, useFavorites } from "@/lib/favorites";
import { saveMyPlace, useMyPlace } from "@/lib/my-place";
import { forgetEverything } from "@/lib/stored";
import { findBranch, branchLabel } from "@/lib/traditions";

function BranchSelect({ value, onChange, id }: { value: string; onChange: (v: string) => void; id?: string }) {
  return <FaithSelect id={id} value={value} onChange={onChange} />;
}

export function MyPlace() {
  const place = useMyPlace();
  const ref = findBranch(place?.branch);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-2">
        <h1 className="font-display text-4xl font-semibold">My places</h1>
        <p className="text-muted">
          Save the congregation you call home. When you travel, Seeker uses its tradition and denomination to
          find similar places and their service times, so you don&apos;t have to dig through map results.
          Your home place and favorites are kept in this browser for up to 400 days, never on our servers.
        </p>
      </header>

      {place ? (
        <section className="card space-y-4 border-gold p-5">
          <div>
            <p className="text-sm font-semibold text-gold">Your home congregation</p>
            <h2 className="font-display text-2xl font-semibold">{place.name}</h2>
            {(place.address || place.city) && <p className="text-sm text-muted">{place.address ?? place.city}</p>}
            {place.website && (
              <a className="text-sm text-accent underline" href={place.website} target="_blank" rel="noreferrer">
                {place.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
              </a>
            )}
            <Directions className="mt-1 text-sm" name={place.name} address={place.address} lat={place.lat} lng={place.lng} />
          </div>
          <div>
            <label className="label" htmlFor="my-branch">
              Tradition and denomination
            </label>
            <BranchSelect id="my-branch" value={place.branch ?? ""} onChange={(b) => saveMyPlace({ ...place, branch: b || null })} />
            {!place.branch && <p className="mt-1 text-sm text-gold">Choose one so we can find similar places when you travel.</p>}
          </div>
          {ref && (
            <div className="rounded-xl bg-gold-soft p-4">
              <p className="mb-2 text-sm">Travelling? We&apos;ll look for {branchLabel(ref)} congregations.</p>
              <TravelSearch branch={ref.branch.slug} />
            </div>
          )}
          <button type="button" className="text-sm text-muted underline" onClick={() => saveMyPlace(null)}>
            Remove
          </button>
        </section>
      ) : (
        <FindMine />
      )}

      <Favorites />

      <p className="text-xs text-muted">
        Using a shared computer?{" "}
        <button
          type="button"
          className="underline"
          onClick={() => confirm("Forget your home place, favorites, answers and preferences in this browser?") && forgetEverything()}
        >
          Forget everything Seeker saved here
        </button>
      </p>
    </div>
  );
}

function Favorites() {
  const favorites = useFavorites();
  return (
    <section className="space-y-3">
      <h2 className="font-display text-2xl font-semibold">Favorites</h2>
      {favorites.length === 0 ? (
        <p className="card p-5 text-sm text-muted">
          Tap the heart on any place in{" "}
          <Link href="/find" className="text-accent underline">
            Find a place
          </Link>{" "}
          to keep it here, like somewhere you&apos;d like to visit next week.
        </p>
      ) : (
        favorites.map((f) => {
          const ref = findBranch(f.branch);
          return (
            <div key={f.id} className="card space-y-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-display text-lg font-semibold">{f.name}</h3>
                  <p className="text-sm text-muted">{[f.label ?? (ref ? branchLabel(ref) : null), f.address ?? f.city].filter(Boolean).join(" · ")}</p>
                </div>
                <button type="button" className="shrink-0 text-sm text-muted underline" onClick={() => removeFavorite(f.id)}>
                  Remove
                </button>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {f.website && (
                  <a className="font-semibold text-accent hover:underline" href={f.website} target="_blank" rel="noreferrer">
                    Website
                  </a>
                )}
                {f.phone && (
                  <a className="font-semibold text-accent hover:underline" href={`tel:${f.phone}`}>
                    {f.phone}
                  </a>
                )}
                <Directions name={f.name} address={f.address} lat={f.lat} lng={f.lng} />
              </div>
            </div>
          );
        })
      )}
    </section>
  );
}

function FindMine() {
  const [loc, setLoc] = useState<Loc | null>(null);
  const [name, setName] = useState("");
  const [results, setResults] = useState<PlaceResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const [manualBranch, setManualBranch] = useState("");

  const search = async () => {
    if (!loc) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/places?${new URLSearchParams({ lat: String(loc.lat), lng: String(loc.lng), miles: "10", q: name })}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Search failed");
      setResults(json.places);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card space-y-5 p-5">
      <h2 className="font-display text-xl font-semibold">Find your congregation</h2>
      <div>
        <label className="label">Where is it?</label>
        <LocationInput value={loc} onChange={setLoc} />
      </div>
      <div>
        <label className="label" htmlFor="name">
          Name (or part of it)
        </label>
        <input id="name" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. St. Mark" />
      </div>
      <button type="button" className="btn-primary" disabled={!loc || loading} onClick={search}>
        {loading ? "Searching…" : "Search"}
      </button>
      {error && <p className="text-sm text-gold">{error}</p>}

      {results && (
        <div className="space-y-2">
          {results.length === 0 && <p className="text-sm text-muted">Nothing found by that name within 10 miles.</p>}
          {results.slice(0, 25).map((p) => {
            const ref = findBranch(p.branch);
            return (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
                <div className="min-w-0">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-sm text-muted">
                    {[ref ? branchLabel(ref) : null, p.address, `${p.miles} mi`].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-ghost shrink-0"
                  onClick={() =>
                    saveMyPlace({
                      id: p.id,
                      name: p.name,
                      branch: p.branch,
                      address: p.address ?? undefined,
                      city: p.city ?? undefined,
                      lat: p.lat,
                      lng: p.lng,
                      website: p.website ?? undefined,
                      savedAt: new Date().toISOString(),
                    })
                  }
                >
                  This is mine
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="border-t border-line pt-4">
        {!manual ? (
          <button type="button" className="text-sm text-accent underline" onClick={() => setManual(true)}>
            Not listed? Add it yourself
          </button>
        ) : (
          <div className="space-y-3">
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Congregation name" />
            <BranchSelect value={manualBranch} onChange={setManualBranch} />
            <button
              type="button"
              className="btn-primary"
              disabled={!name.trim() || !manualBranch}
              onClick={() =>
                saveMyPlace({
                  id: "custom",
                  name: name.trim(),
                  branch: manualBranch,
                  city: loc?.label,
                  lat: loc?.lat,
                  lng: loc?.lng,
                  savedAt: new Date().toISOString(),
                })
              }
            >
              Save
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
