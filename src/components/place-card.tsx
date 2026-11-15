"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PlaceResult } from "@/app/api/places/route";
import { Directions } from "@/components/directions";
import { FavoriteButton } from "@/components/favorite-button";
import { saveMyPlace, useMyPlace } from "@/lib/my-place";
import { FEATURE_LABEL, type Prefs } from "@/lib/preferences";
import { formatSlots, parseServiceTimes, slotMatches, timeTags, type ServiceSlot } from "@/lib/service-times";
import type { Livestream } from "@/lib/livestreams";
import type { WebsiteTimes } from "@/lib/website-times";

const SIZE_LABEL = { small: "Small building", medium: "Mid-sized building", large: "Large building" };

// Website lookups run a couple at a time so a long list doesn't flood the server.
const queue: (() => Promise<void>)[] = [];
let active = 0;
function enqueue(job: () => Promise<void>) {
  queue.push(job);
  pump();
}
function pump() {
  while (active < 2 && queue.length) {
    active++;
    queue.shift()!().finally(() => {
      active--;
      pump();
    });
  }
}

export type Times = { slots: ServiceSlot[]; source: "listing" | "map" | "website" | null; web: WebsiteTimes | null };

/** The best service times we have: the congregation's listing, the map, then their website. */
export function timesOf(place: PlaceResult, web: WebsiteTimes | null = place.websiteTimes): Times {
  const listed = parseServiceTimes(place.serviceTimes ?? undefined);
  if (listed.length) return { slots: listed, source: place.listing && place.serviceTimes ? "listing" : "map", web };
  if (web?.slots.length) return { slots: web.slots, source: "website", web };
  return { slots: [], source: null, web };
}

export function PlaceCard({
  n,
  place,
  prefs,
  near,
  focused,
  autoCheck,
  related,
  onAssociation,
}: {
  n: number;
  place: PlaceResult;
  prefs: Prefs;
  near: string;
  focused?: boolean;
  /** Look for times on the website without waiting for a click. */
  autoCheck?: boolean;
  /** Other results in the same association. */
  related?: number;
  onAssociation?: (slug: string) => void;
}) {
  const myPlace = useMyPlace();
  const isMine = myPlace?.id === place.id;
  const [web, setWeb] = useState<WebsiteTimes | null>(place.websiteTimes);
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState(!!place.websiteTimes);
  const times = timesOf(place, web);
  const fits = prefs.times.length > 0 && times.slots.some((s) => prefs.times.some((t) => slotMatches(s, t)));
  const where = place.address ?? place.city ?? near.replace(/^Near me$/, "");
  const lookup = `https://www.google.com/search?q=${encodeURIComponent(`${place.name} ${where} service times`)}`;
  const canCheck = !!place.website && !place.serviceTimes;

  const check = () => {
    if (checking || checked) return;
    setChecking(true);
    enqueue(async () => {
      try {
        const res = await fetch(`/api/times?${new URLSearchParams({ id: place.id })}`);
        if (res.ok) setWeb((await res.json()) as WebsiteTimes);
      } catch {
        // Leave the "look them up" link.
      } finally {
        setChecking(false);
        setChecked(true);
      }
    });
  };

  useEffect(() => {
    if (!autoCheck || !canCheck || checked) return;
    const timer = setTimeout(check, 50);
    return () => clearTimeout(timer);
    // Once per card.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCheck]);

  const match =
    place.tier === "religion"
      ? place.labelIsDenomination
        ? place.label
        : `${place.label} · denomination not listed`
      : place.tier === "name"
        ? `${place.label} (from its name)`
        : place.label;

  const tags = [
    ...timeTags(times.slots),
    ...(place.listing?.features ?? []).map((f) => FEATURE_LABEL[f] ?? f),
    ...(place.size ? [SIZE_LABEL[place.size]] : []),
    ...(place.wheelchair === "yes" && !place.listing?.features.includes("accessible") ? ["Wheelchair accessible"] : []),
    ...(place.lgbtq && /welcome|primary|yes/.test(place.lgbtq) && !place.listing?.features.includes("lgbtq") ? ["LGBTQ-welcoming"] : []),
  ];

  const saveable = {
    id: place.id,
    name: place.name,
    branch: place.branch,
    address: place.address ?? undefined,
    city: place.city ?? undefined,
    lat: place.lat,
    lng: place.lng,
    website: place.website ?? undefined,
  };

  return (
    <article id={`place-${place.id}`} className={`card scroll-mt-24 space-y-3 p-4 ${focused ? "border-accent" : ""} ${isMine ? "border-gold" : ""}`}>
      <div className="flex items-start gap-3">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-on-accent ${
            isMine ? "bg-gold" : place.tier === "religion" ? "bg-muted" : "bg-accent"
          }`}
        >
          {n}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-semibold leading-snug">{place.name}</h3>
          <p className="text-sm text-muted">
            {place.miles} mi{place.address ? ` · ${place.address}` : ""}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
            <span className="rounded-full bg-accent-soft px-2 py-0.5 font-medium">{match}</span>
            {place.association && (
              <button
                type="button"
                className="rounded-full border border-accent px-2 py-0.5 font-medium text-accent hover:bg-accent-soft"
                title={`Show places in ${place.association.name}`}
                onClick={() => onAssociation?.(place.association!.slug)}
              >
                {place.association.name}
                {related ? ` · ${related} related nearby` : ""}
              </button>
            )}
            {tags.map((t) => (
              <span key={t} className="rounded-full bg-sunk px-2 py-0.5 text-muted">
                {t}
              </span>
            ))}
            {place.listing && <span className="rounded-full bg-sunk px-2 py-0.5 font-semibold text-good">Updated by the congregation</span>}
            {isMine && <span className="rounded-full bg-gold-soft px-2 py-0.5 font-semibold text-gold">My place</span>}
          </div>
        </div>
        <FavoriteButton place={{ ...saveable, label: place.label, phone: place.phone ?? undefined }} />
      </div>

      {place.listing?.note && <p className="text-sm">{place.listing.note}</p>}

      <div className="rounded-xl bg-sunk px-3 py-2 text-sm">
        {times.slots.length ? (
          <div className="space-y-1">
            <p>
              <span className="font-semibold">Services: </span>
              {formatSlots(times.slots).join(" · ")}
              {fits && <span className="ml-2 font-semibold text-good">Fits your schedule</span>}
            </p>
            {times.source === "website" && times.web && <WebsiteNote web={times.web} />}
          </div>
        ) : checking ? (
          <p className="text-muted">Checking their website for service times…</p>
        ) : (
          <div className="space-y-1">
            <p className="text-muted">
              Service times not listed.{" "}
              {canCheck && !checked && (
                <>
                  <button type="button" className="font-semibold text-accent underline" onClick={check}>
                    Check their website
                  </button>{" "}
                  or{" "}
                </>
              )}
              <a className="font-semibold text-accent underline" href={lookup} target="_blank" rel="noreferrer">
                {canCheck && !checked ? "search the web" : "Look them up"}
              </a>
            </p>
            {web && web.snippets.length > 0 && <WebsiteNote web={web} />}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
        {place.website && (
          <a className="font-semibold text-accent hover:underline" href={place.website} target="_blank" rel="noreferrer">
            Website
          </a>
        )}
        {place.facebook && !place.website && (
          <a
            className="font-semibold text-accent hover:underline"
            href={/^https?:/.test(place.facebook) ? place.facebook : `https://www.facebook.com/${place.facebook}`}
            target="_blank"
            rel="noreferrer"
          >
            Facebook
          </a>
        )}
        {place.livestream && <LivestreamLink stream={place.livestream} />}
        {place.phone && (
          <a className="font-semibold text-accent hover:underline" href={`tel:${place.phone}`}>
            {place.phone}
          </a>
        )}
        <Directions name={place.name} address={place.address} lat={place.lat} lng={place.lng} />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-2 text-xs">
        {!isMine && (
          <button type="button" className="text-muted hover:text-ink" onClick={() => saveMyPlace({ ...saveable, savedAt: new Date().toISOString() })}>
            Set as my place
          </button>
        )}
        <Link className="text-muted hover:text-ink" href={`/listing?${new URLSearchParams({ place: place.id })}`}>
          Your congregation? Update or remove this listing
        </Link>
        {!place.id.startsWith("listing/") && (
          <a
            className="text-muted hover:text-ink"
            href={`https://www.openstreetmap.org/${place.id}`}
            target="_blank"
            rel="noreferrer"
            title="Anyone can fix map details on OpenStreetMap."
          >
            Fix on the map
          </a>
        )}
      </div>
    </article>
  );
}

const STREAM_LABEL: Record<Livestream["kind"], string> = {
  youtube: "Livestreams on YouTube",
  facebook: "Videos on Facebook",
  platform: "Watch online",
  site: "Watch online",
};

function LivestreamLink({ stream }: { stream: Livestream }) {
  const label = stream.persistent ? (stream.kind === "youtube" ? "Watch live on YouTube" : "Watch online") : STREAM_LABEL[stream.kind];
  const title = stream.persistent
    ? "This link shows their current or next livestream."
    : "Each service gets its own video; this is where they're published.";
  return (
    <a className="font-semibold text-accent hover:underline" href={stream.url} target="_blank" rel="noreferrer" title={`${title} Found on their website ${stream.checked}.`}>
      ▶ {label}
    </a>
  );
}

function WebsiteNote({ web }: { web: WebsiteTimes }) {
  const [open, setOpen] = useState(false);
  const date = new Date(web.checkedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return (
    <div className="text-xs text-muted">
      <p>
        {web.slots.length ? "Read from their website" : "Their website mentions"} ({date}); please confirm before you go.{" "}
        {web.snippets.length > 0 && (
          <button type="button" className="underline" onClick={() => setOpen((o) => !o)}>
            {open ? "Hide" : "What it says"}
          </button>
        )}
        {web.source && (
          <>
            {" · "}
            <a className="underline" href={web.source} target="_blank" rel="noreferrer">
              Source
            </a>
          </>
        )}
      </p>
      {(open || !web.slots.length) && (
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          {web.snippets.map((s) => (
            <li key={s}>“{s}”</li>
          ))}
        </ul>
      )}
    </div>
  );
}
