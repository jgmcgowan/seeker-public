import type { NextRequest } from "next/server";

// US place suggestions (cities, towns, neighborhoods, ZIP codes) from Photon (komoot),
// which is built on OpenStreetMap and allows type-ahead use.

export type PlaceSuggestion = { label: string; detail: string; lat: number; lng: number };

const UA = "Seeker/0.1 (faith community finder; contact you@example.com)";
const CITY = new Set(["city", "town", "village", "hamlet"]);
const NEIGHBORHOOD = new Set(["suburb", "neighbourhood", "quarter"]);

const STATES: Record<string, string> = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA", Colorado: "CO", Connecticut: "CT",
  Delaware: "DE", "District of Columbia": "DC", Florida: "FL", Georgia: "GA", Hawaii: "HI", Idaho: "ID", Illinois: "IL",
  Indiana: "IN", Iowa: "IA", Kansas: "KS", Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD",
  Massachusetts: "MA", Michigan: "MI", Minnesota: "MN", Mississippi: "MS", Missouri: "MO", Montana: "MT",
  Nebraska: "NE", Nevada: "NV", "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
  "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK", Oregon: "OR", Pennsylvania: "PA",
  "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT",
  Vermont: "VT", Virginia: "VA", Washington: "WA", "West Virginia": "WV", Wisconsin: "WI", Wyoming: "WY",
  "Puerto Rico": "PR",
};

type PhotonProps = { name?: string; city?: string; state?: string; countrycode?: string; osm_value?: string };

/**
 * A street address and/or ZIP code → one point, via Nominatim's structured search
 * (one lookup per submit, never per keystroke, per Nominatim's usage policy).
 */
async function lookupAddress(street: string, zip: string) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  const params: Record<string, string> = { format: "jsonv2", countrycodes: "us", limit: "1" };
  if (street) params.street = street;
  if (zip) params.postalcode = zip;
  url.search = new URLSearchParams(params).toString();
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  const [hit] = (await res.json()) as { lat: string; lon: string }[];
  return hit ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null;
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const street = sp.get("street")?.trim().slice(0, 200) ?? "";
  const zip = sp.get("zip")?.trim().match(/^\d{5}/)?.[0] ?? "";
  if (street || zip) {
    if (!zip) return Response.json({ error: "Add a ZIP code." }, { status: 400 });
    try {
      const center = await lookupAddress("", zip);
      if (!center) return Response.json({ error: "We couldn't find that ZIP code." }, { status: 404 });
      // Nominatim may match the street in another state entirely; only trust a hit near the ZIP.
      const hit = street ? await lookupAddress(street, zip) : null;
      const near = hit && Math.abs(hit.lat - center.lat) < 0.3 && Math.abs(hit.lng - center.lng) < 0.4;
      return Response.json({ point: near ? hit : center, exact: !!near });
    } catch (error) {
      console.warn("address lookup failed", error);
      return Response.json({ error: "Address lookup failed. Try again." }, { status: 502 });
    }
  }

  const q = sp.get("q")?.trim() ?? "";
  if (q.length < 2) return Response.json({ suggestions: [] });

  const url = new URL("https://photon.komoot.io/api/");
  // A US bias point (geographic center) keeps US results ahead of same-named places abroad.
  url.search = new URLSearchParams({ q, limit: "20", lang: "en", osm_tag: "place", lat: "39.8", lon: "-98.6" }).toString();
  let features: { properties?: PhotonProps; geometry?: { coordinates?: number[] } }[] = [];
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000) });
    if (res.ok) features = (await res.json()).features ?? [];
  } catch (error) {
    console.warn("place search failed", error);
  }

  const out: PlaceSuggestion[] = [];
  const seen = new Set<string>();
  for (const f of features) {
    const p = f.properties ?? {};
    const [lng, lat] = f.geometry?.coordinates ?? [];
    const state = p.state ? STATES[p.state] : undefined;
    if (p.countrycode !== "US" || !state || !p.name || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const kind = p.osm_value ?? "";
    let s: PlaceSuggestion | null = null;
    if (kind === "postcode" && p.city) s = { label: `${p.name} · ${p.city}, ${state}`, detail: "ZIP code", lat, lng };
    else if (NEIGHBORHOOD.has(kind) && p.city) s = { label: `${p.name}, ${p.city}, ${state}`, detail: "Neighborhood", lat, lng };
    else if (CITY.has(kind)) s = { label: `${p.name}, ${state}`, detail: "City", lat, lng };
    if (s && !seen.has(s.label)) {
      seen.add(s.label);
      out.push(s);
    }
    if (out.length === 6) break;
  }
  return Response.json({ suggestions: out });
}
