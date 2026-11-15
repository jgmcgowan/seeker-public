import type { NextRequest } from "next/server";
import { associationFor, findAssociation, type Association } from "@/lib/associations";
import { withListings } from "@/lib/listings";
import { livestreamFor, type Livestream } from "@/lib/livestreams";
import { clampMiles } from "@/lib/miles";
import { GENERIC, matchTier, milesBetween, placesOfWorship, sizeOf, type MatchTier, type OsmPlace } from "@/lib/osm";
import { ALL_BRANCHES, MAIN_RELIGIONS, findBranch, resolveScope, shortBranchName, type Scope } from "@/lib/traditions";
import { cachedTimes, type WebsiteTimes } from "@/lib/website-times";

export type PlaceResult = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  miles: number;
  address: string | null;
  city: string | null;
  website: string | null;
  facebook: string | null;
  phone: string | null;
  serviceTimes: string | null;
  size: "small" | "medium" | "large" | null;
  tier: MatchTier | null;
  /** Best-guess branch slug (for saving a home place). */
  branch: string | null;
  /** What to call its denomination on the card ("Baptist", "Hindu", "Zoroastrian"). */
  label: string;
  /** False when the label is only the religion (no denomination known). */
  labelIsDenomination: boolean;
  religion: string | null;
  denomination: string | null;
  association: Association | null;
  wheelchair: string | null;
  lgbtq: string | null;
  /** Approved listing from the congregation or admin. */
  listing: { features: string[]; note: string | null; locked: boolean; updatedAt: string } | null;
  /** Times found on its website, when the map has none. */
  websiteTimes: WebsiteTimes | null;
  /** Where its services are streamed, if we found one. */
  livestream: Livestream | null;
};

const MAX_RESULTS = 250;

const pretty = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function guessBranch(place: OsmPlace): { slug: string; tier: MatchTier } | null {
  for (const want of ["denomination", "name"] as const) {
    const hit = ALL_BRANCHES.find(({ branch }) => matchTier(place, branch) === want);
    if (hit) return { slug: hit.branch.slug, tier: want };
  }
  return null;
}

/** Tier for a whole tradition or group: tagged/name match on its own branch, or same religion. */
function scopeTier(place: OsmPlace, scope: Scope): MatchTier | null {
  if (scope.single) return matchTier(place, scope.single.branch);
  const guess = guessBranch(place);
  if (guess) return scope.branches.some((b) => b.branch.slug === guess.slug) ? guess.tier : null;
  if (!place.religion || place.denomination?.startsWith("unitarian")) return null;
  const inScope = scope.group.slug === "other" && !scope.tradition
    ? !MAIN_RELIGIONS.includes(place.religion)
    : scope.branches.some((b) => b.branch.osm.religion.includes(place.religion!));
  return inScope ? "religion" : null;
}

function labelFor(place: OsmPlace, branch: string | null): string {
  const ref = findBranch(branch);
  if (ref) return shortBranchName(ref);
  if (place.denomination && !GENERIC.has(place.denomination)) return pretty(place.denomination);
  return place.religion ? pretty(place.religion) : "Place of worship";
}

/** A listing names a known association by slug, or any other body by name. */
function listedAssociation(value: string): Association {
  return findAssociation(value) ?? { slug: `org-${value.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, name: value };
}

/**
 * GET /api/places?lat=&lng=&miles=10[&branch=slug][&q=name]
 * `branch` is a branch, tradition or group slug ("baptist", "buddhism", "other").
 * Without it: every place, optionally filtered by name (for picking your home congregation).
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const lat = Number(sp.get("lat"));
  const lng = Number(sp.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return Response.json({ error: "lat and lng are required" }, { status: 400 });
  }
  const miles = clampMiles(Number(sp.get("miles") ?? 10));
  const scope = resolveScope(sp.get("branch"));
  const q = sp.get("q")?.trim().toLowerCase();

  // Round the center to ~1 km so nearby searches share one cached Overpass query.
  const center = { lat: Math.round(lat * 100) / 100, lng: Math.round(lng * 100) / 100 };
  const radiusM = Math.round(miles * 1609.34);
  let places: OsmPlace[];
  try {
    places = withListings(await placesOfWorship(center.lat, center.lng, radiusM), center.lat, center.lng, radiusM);
  } catch (error) {
    console.error("overpass failed", error);
    return Response.json({ error: "The map data service is busy. Try again in a minute." }, { status: 502 });
  }

  const origin = { lat, lng };
  const results: PlaceResult[] = [];
  // OSM sometimes has the same congregation twice (a point and a building outline).
  const seen = new Set<string>();
  for (const p of places) {
    const key = `${p.name.toLowerCase()}|${p.lat.toFixed(3)}|${p.lng.toFixed(3)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const tier = scope ? scopeTier(p, scope) : null;
    if (scope && !tier) continue;
    if (q && !p.name.toLowerCase().includes(q)) continue;
    const distance = milesBetween(origin, p);
    if (distance > miles) continue;
    const guessed = p.listing?.branch ?? guessBranch(p)?.slug ?? null;
    const branch = scope?.single ? scope.single.branch.slug : guessed;
    results.push({
      id: p.id,
      name: p.name,
      lat: p.lat,
      lng: p.lng,
      miles: Math.round(distance * 10) / 10,
      address: p.address,
      city: p.city,
      website: p.website,
      facebook: p.facebook,
      phone: p.phone,
      serviceTimes: p.serviceTimes,
      size: sizeOf(p),
      tier,
      branch,
      label: labelFor(p, tier === "religion" ? null : branch),
      labelIsDenomination: tier !== "religion" || (!!p.denomination && !GENERIC.has(p.denomination)),
      religion: p.religion,
      denomination: p.denomination,
      association: p.listing?.association ? listedAssociation(p.listing.association) : associationFor(p),
      wheelchair: p.wheelchair,
      lgbtq: p.lgbtq,
      listing: p.listing ? { features: p.listing.features, note: p.listing.note ?? null, locked: p.listing.locked, updatedAt: p.listing.updatedAt } : null,
      websiteTimes: null,
      livestream: livestreamFor(p.id),
    });
  }
  // Matches first; places that only share the religion fill whatever room is left.
  results.sort((a, b) => Number(a.tier === "religion") - Number(b.tier === "religion") || a.miles - b.miles);
  const top = results.slice(0, MAX_RESULTS);
  try {
    const times = cachedTimes(top.filter((p) => !p.serviceTimes && p.website).map((p) => p.id));
    for (const p of top) p.websiteTimes = times.get(p.id) ?? null;
  } catch (error) {
    console.error("website times cache unavailable", error);
  }
  return Response.json({ miles, total: results.length, scope: scope ? { slug: scope.slug, label: scope.label, single: !!scope.single } : null, places: top });
}
