"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import type { PlaceResult } from "@/app/api/places/route";
import { ChurchMap, type MapPin } from "@/components/church-map";
import { FaithPicker } from "@/components/faith-picker";
import { LocationInput, type Loc } from "@/components/location-input";
import { MilesDial } from "@/components/miles-dial";
import { PlaceCard, timesOf } from "@/components/place-card";
import { clampMiles } from "@/lib/miles";
import { useMyPlace } from "@/lib/my-place";
import { AGES, EMPTY_PREFS, EXTRAS, HOUSEHOLDS, SIZES, SORTS, questionsToAsk, type Prefs, type SortBy } from "@/lib/preferences";
import { TIME_PREFS, slotMatches } from "@/lib/service-times";
import { readStored, useStored, writeStored } from "@/lib/stored";
import { resolveScope } from "@/lib/traditions";

const PAGE = 30;

/** Higher is better: service times, size and programs that fit, wheelchair access if wanted, then closeness. */
function score(p: PlaceResult, prefs: Prefs) {
  let s = 0;
  if (prefs.times.length) {
    const { slots } = timesOf(p);
    if (slots.length) s += slots.some((sl) => prefs.times.some((t) => slotMatches(sl, t))) ? 1 : -0.5;
  }
  if (prefs.size && p.size) s += p.size === prefs.size ? 1 : -0.5;
  if (prefs.extras.includes("accessible") && p.wheelchair === "yes") s += 1;
  s += (p.listing?.features ?? []).filter((f) => prefs.extras.includes(f)).length * 0.75;
  return s - p.miles / 3;
}

const byName = (a: PlaceResult, b: PlaceResult) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

function sortPlaces(list: PlaceResult[], sort: SortBy, prefs: Prefs): PlaceResult[] {
  const out = [...list];
  if (sort === "distance") return out.sort((a, b) => a.miles - b.miles);
  if (sort === "name") return out.sort(byName);
  if (sort === "denomination") {
    // Known denominations A–Z, then the ones that only list the religion.
    return out.sort(
      (a, b) =>
        Number(!a.labelIsDenomination) - Number(!b.labelIsDenomination) ||
        a.label.localeCompare(b.label) ||
        (a.association?.name ?? "~").localeCompare(b.association?.name ?? "~") ||
        a.miles - b.miles,
    );
  }
  return out.sort((a, b) => score(b, prefs) - score(a, prefs));
}

export function Finder() {
  const params = useSearchParams();
  const router = useRouter();
  const myPlace = useMyPlace();

  const [branch, setBranch] = useState(params.get("branch") ?? "");
  const [loc, setLoc] = useState<Loc | null>(() => {
    const lat = Number(params.get("lat"));
    const lng = Number(params.get("lng"));
    return params.get("lat") && Number.isFinite(lat) && Number.isFinite(lng)
      ? { label: params.get("near") ?? "Selected place", lat, lng }
      : null;
  });
  const [miles, setMiles] = useState(() => clampMiles(Number(params.get("miles") ?? 10)));
  const [prefs, setPrefs] = useState<Prefs>(() => ({ ...EMPTY_PREFS, ...readStored("seeker.prefs", {}) }));
  const sort = useStored<SortBy>("seeker.sort", "best");
  const [showPrefs, setShowPrefs] = useState(false);
  const [results, setResults] = useState<PlaceResult[] | null>(null);
  const [total, setTotal] = useState(0);
  const [searched, setSearched] = useState<{ slug: string; miles: number; loc: Loc } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [showMaybe, setShowMaybe] = useState(false);
  const [assoc, setAssoc] = useState<string | null>(null);
  const [onlyTimes, setOnlyTimes] = useState(false);
  const [shown, setShown] = useState(PAGE);

  const updatePrefs = (p: Prefs) => {
    setPrefs(p);
    writeStored("seeker.prefs", p);
  };

  const scope = resolveScope(branch);
  const shownScope = resolveScope(searched?.slug);

  const search = useCallback(async () => {
    if (!branch || !loc) return;
    setLoading(true);
    setError(null);
    setShowMaybe(false);
    setAssoc(null);
    setShown(PAGE);
    router.replace(
      `/find?${new URLSearchParams({ branch, lat: String(loc.lat), lng: String(loc.lng), near: loc.label, miles: String(miles) })}`,
      { scroll: false },
    );
    try {
      const res = await fetch(`/api/places?${new URLSearchParams({ branch, lat: String(loc.lat), lng: String(loc.lng), miles: String(miles) })}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Search failed");
      setResults(json.places);
      setTotal(json.total ?? json.places.length);
      setSearched({ slug: branch, miles: json.miles, loc });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, [branch, loc, miles, router]);

  // Arriving with a full search in the URL (travel shortcut, shared link) runs it right away.
  useEffect(() => {
    if (!params.get("branch") || !params.get("lat")) return;
    const timer = setTimeout(search, 0);
    return () => clearTimeout(timer);
    // Only on first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const related = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of results ?? []) if (p.association) counts.set(p.association.slug, (counts.get(p.association.slug) ?? 0) + 1);
    return counts;
  }, [results]);

  const { matches, maybes } = useMemo(() => {
    let all = results ?? [];
    if (assoc) all = all.filter((p) => p.association?.slug === assoc);
    if (onlyTimes) all = all.filter((p) => timesOf(p).slots.length > 0);
    // "Maybe" only makes sense for one branch: for "All Christian" every church is a match.
    const single = !!shownScope?.single;
    return {
      matches: sortPlaces(single ? all.filter((p) => p.tier !== "religion") : all, sort, prefs),
      maybes: single ? sortPlaces(all.filter((p) => p.tier === "religion"), sort, prefs) : [],
    };
  }, [results, prefs, sort, assoc, onlyTimes, shownScope?.single]);

  // With no tagged matches, show the same-religion places straight away (common for smaller traditions).
  const expanded = showMaybe || matches.length === 0;
  const all = useMemo(() => (expanded ? [...matches, ...maybes] : matches), [expanded, matches, maybes]);
  const listed = all.slice(0, shown);
  const pins: MapPin[] = useMemo(
    () =>
      all.slice(0, shown).map((p, i) => ({
        id: p.id,
        n: i + 1,
        lat: p.lat,
        lng: p.lng,
        title: p.name,
        kind: p.id === myPlace?.id ? "home" : p.tier === "religion" && shownScope?.single ? "maybe" : undefined,
      })),
    [all, shown, myPlace?.id, shownScope?.single],
  );
  const onPick = useCallback((id: string) => {
    setFocus(id);
    document.getElementById(`place-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);
  const pickAssociation = useCallback((slug: string) => {
    setAssoc((a) => (a === slug ? null : slug));
    setShown(PAGE);
    window.scrollTo({ top: (document.getElementById("results")?.offsetTop ?? 0) - 16, behavior: "smooth" });
  }, []);
  // The API returns the nearest matches first, so the list is only cut short when no "maybes" made it in.
  const truncated = !!results && total > results.length && !(shownScope?.single && results.some((p) => p.tier === "religion"));
  const questions = questionsToAsk(prefs);
  const assocInfo = assoc ? results?.find((p) => p.association?.slug === assoc)?.association : null;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-display text-4xl font-semibold">Find a place to worship</h1>
        <p className="max-w-2xl text-muted">
          Choose your tradition and where you&apos;ll be. We&apos;ll list congregations nearby, with service
          times when they&apos;re known.
        </p>
      </header>

      <form
        className="card space-y-5 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
      >
        <div>
          <span className="label">Tradition and denomination</span>
          <FaithPicker value={branch} onChange={setBranch} />
          {myPlace?.branch && myPlace.branch !== branch && (
            <button type="button" className="mt-2 text-sm text-accent underline" onClick={() => setBranch(myPlace.branch!)}>
              Same as my place ({myPlace.name})
            </button>
          )}
          {scope?.single && scope.branches.length === 1 && (
            <p className="mt-2 text-sm text-muted">
              {scope.single.branch.summary}{" "}
              <Link className="underline" href={`/traditions/${scope.single.tradition.slug}#${scope.single.branch.slug}`}>
                Read more
              </Link>
            </p>
          )}
        </div>

        <div>
          <label className="label">Where</label>
          <LocationInput value={loc} onChange={setLoc} />
        </div>

        <div>
          <span className="label">Within {miles} miles</span>
          <MilesDial value={miles} onChange={setMiles} />
        </div>

        <div className="border-t border-line pt-4">
          <button type="button" className="text-sm font-semibold text-accent" onClick={() => setShowPrefs((s) => !s)}>
            {showPrefs ? "▾" : "▸"} About you and what you&apos;re looking for (optional)
          </button>
          {showPrefs && <PrefsForm prefs={prefs} onChange={updatePrefs} />}
        </div>

        <button type="submit" className="btn-primary" disabled={!branch || !loc || loading}>
          {loading ? "Searching…" : "Search"}
        </button>
        {loading && <p className="text-sm text-muted">Larger areas can take up to 30 seconds the first time.</p>}
        {error && <p className="text-sm text-gold">{error}</p>}
      </form>

      {results && searched && shownScope && (
        <section id="results" className="space-y-4">
          <h2 className="font-display text-2xl font-semibold">
            {matches.length}
            {truncated && !assoc && !onlyTimes ? "+" : ""} {shownScope.label} {matches.length === 1 ? "place" : "places"} within {searched.miles} miles of {searched.loc.label}
          </h2>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <label className="flex items-center gap-2">
              <span className="font-semibold">Sort by</span>
              <select className="field w-auto py-1.5" value={sort} onChange={(e) => writeStored("seeker.sort", e.target.value)}>
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={onlyTimes} onChange={(e) => setOnlyTimes(e.target.checked)} />
              Only places with service times
            </label>
          </div>

          {assocInfo && (
            <div className="card flex flex-wrap items-center justify-between gap-3 border-accent bg-accent-soft p-4 text-sm">
              <p>
                Showing {matches.length + (expanded ? maybes.length : 0)} {related.get(assocInfo.slug) === 1 ? "place" : "places"} in{" "}
                <span className="font-semibold">{assocInfo.name}</span>.{" "}
                {assocInfo.url && (
                  <a className="text-accent underline" href={assocInfo.url} target="_blank" rel="noreferrer">
                    About {assocInfo.name}
                  </a>
                )}
              </p>
              <button type="button" className="btn-ghost py-1.5" onClick={() => setAssoc(null)}>
                Show all
              </button>
            </div>
          )}

          {truncated && (
            <p className="text-sm text-muted">Showing the nearest {results.length}. Pick a denomination or a smaller radius to see fewer at a time.</p>
          )}

          {listed.length > 0 && <ChurchMap pins={pins} center={searched.loc} onPick={onPick} />}

          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
            <div className="space-y-3">
              {listed.map((p, i) => {
                const heading = sort === "denomination" && (i === 0 || listed[i - 1].label !== p.label || listed[i - 1].labelIsDenomination !== p.labelIsDenomination);
                return (
                  <Fragment key={p.id}>
                    {heading && (
                      <h3 className="pt-2 text-sm font-semibold uppercase tracking-wide text-muted">
                        {p.labelIsDenomination ? p.label : `${p.label}, denomination not listed`}
                      </h3>
                    )}
                    <PlaceCard
                      n={i + 1}
                      place={p}
                      prefs={prefs}
                      near={searched.loc.label}
                      focused={focus === p.id}
                      autoCheck={i < 12}
                      related={p.association ? (related.get(p.association.slug) ?? 1) - 1 : 0}
                      onAssociation={pickAssociation}
                    />
                  </Fragment>
                );
              })}
              {all.length > shown && (
                <button type="button" className="btn-ghost w-full" onClick={() => setShown((s) => s + PAGE)}>
                  Show {Math.min(PAGE, all.length - shown)} more
                </button>
              )}
              {matches.length === 0 && (
                <p className="card p-5 text-sm text-muted">
                  {maybes.length > 0
                    ? `None of these list a denomination on the map, so some may not be ${shownScope.label}. Check their websites.`
                    : onlyTimes || assoc
                      ? "Nothing matches these filters. Try clearing them."
                      : `Nothing found within ${searched.miles} miles. Try a wider radius.`}
                </p>
              )}
              {maybes.length > 0 && !expanded && shownScope.single && (
                <button type="button" className="btn-ghost w-full" onClick={() => setShowMaybe(true)}>
                  Show {maybes.length} more {shownScope.single.tradition.name} {maybes.length === 1 ? "place" : "places"} that don&apos;t list a denomination
                </button>
              )}
            </div>
            <aside className="space-y-4">
              <div className="card space-y-2 p-4 text-sm">
                <p className="font-semibold">About these listings</p>
                <p className="text-muted">
                  Places come from OpenStreetMap, a community-edited map, plus listings congregations send us.
                  When the map has no service times we read them from the congregation&apos;s website, which
                  can be out of date, so check before you go. Size is estimated from the building&apos;s footprint.
                </p>
              </div>
              <div className="card space-y-2 border-gold bg-gold-soft p-4 text-sm">
                <p className="font-semibold">Lead or belong to a congregation?</p>
                <p>Add yours, correct its details and service times, or ask us to take it off Seeker.</p>
                <Link href="/listing" className="font-semibold text-accent underline">
                  Add or update a listing
                </Link>
              </div>
              {questions.length > 0 && (
                <div className="card space-y-2 p-4 text-sm">
                  <p className="font-semibold">Questions to ask when you call or visit</p>
                  <ul className="list-disc space-y-1 pl-5 text-muted">
                    {questions.map((q) => (
                      <li key={q}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}
              {shownScope.single && (
                <div className="card space-y-2 bg-gold-soft p-4 text-sm">
                  <p className="font-semibold">On a first visit</p>
                  <ul className="list-disc space-y-1 pl-5">
                    {shownScope.single.branch.firstVisit.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}
            </aside>
          </div>
        </section>
      )}
    </div>
  );
}

function PrefsForm({ prefs, onChange }: { prefs: Prefs; onChange: (p: Prefs) => void }) {
  const toggle = <K extends "times" | "extras">(key: K, id: Prefs[K][number]) => {
    const list = prefs[key] as string[];
    onChange({ ...prefs, [key]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] });
  };
  return (
    <div className="mt-4 space-y-5">
      <ChipRow label="Your age" options={AGES.map((a) => ({ id: a, label: a }))} value={prefs.age} onPick={(age) => onChange({ ...prefs, age })} />
      <ChipRow label="Household" options={HOUSEHOLDS} value={prefs.household} onPick={(household) => onChange({ ...prefs, household })} />
      <ChipRow
        label="Congregation size"
        options={[...SIZES]}
        value={prefs.size}
        onPick={(size) => onChange({ ...prefs, size: size as Prefs["size"] })}
      />
      <div>
        <span className="label">Service times that work for you</span>
        <div className="flex flex-wrap gap-2">
          {TIME_PREFS.map((t) => (
            <button key={t.id} type="button" className={`chip ${prefs.times.includes(t.id) ? "chip-on" : ""}`} onClick={() => toggle("times", t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="label">Important to you</span>
        <div className="flex flex-wrap gap-2">
          {EXTRAS.map((x) => (
            <button key={x.id} type="button" className={`chip ${prefs.extras.includes(x.id) ? "chip-on" : ""}`} onClick={() => toggle("extras", x.id)}>
              {x.label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted">Saved in this browser for up to 400 days, never on our servers. Used to sort results and suggest questions to ask.</p>
    </div>
  );
}

function ChipRow({
  label,
  options,
  value,
  onPick,
}: {
  label: string;
  options: readonly { id: string; label: string }[];
  value: string | null;
  onPick: (id: string | null) => void;
}) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o.id} type="button" className={`chip ${value === o.id ? "chip-on" : ""}`} onClick={() => onPick(value === o.id ? null : o.id)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
