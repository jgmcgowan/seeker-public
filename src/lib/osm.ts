import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { cacheLife } from "next/cache";
import { ALL_BRANCHES, type Branch } from "./traditions";

// Places of worship from OpenStreetMap. Normally read from the local SQLite copy
// that scripts/import-places.mjs builds state by state; areas with nothing
// imported fall back to a live Overpass query (slow: often 30s+). Either way we
// load every place of worship around a point and filter per branch in code.

export type OsmPlace = {
  id: string; // "node/123"
  name: string;
  lat: number;
  lng: number;
  religion: string | null;
  /** Religion guessed from the name when the tag is missing. */
  religionFromName: boolean;
  denomination: string | null;
  address: string | null;
  city: string | null;
  website: string | null;
  phone: string | null;
  serviceTimes: string | null;
  /** Rough footprint in m² (ways/relations only). */
  footprint: number | null;
  capacity: number | null;
  wheelchair: string | null;
  operator: string | null;
  diocese: string | null;
  facebook: string | null;
  /** OSM `lgbtq` (welcome, primary, yes…). */
  lgbtq: string | null;
  /** Set from an approved listing (see listings.ts). */
  listing?: ListingInfo;
};

/** What an approved listing adds on top of the map data. */
export type ListingInfo = {
  id: number;
  branch?: string;
  association?: string;
  features: string[];
  note?: string;
  locked: boolean;
  updatedAt: string;
};

const ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter"];
const UA = "Seeker/0.1 (faith community finder; contact you@example.com)";

export type Element = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  bounds?: { minlat: number; minlon: number; maxlat: number; maxlon: number };
  tags?: Record<string, string>;
};

export const norm = (s: string) => s.trim().toLowerCase().replace(/[\s\-]+/g, "_");

// When `religion` is missing, guess it from the name. Order matters: specific first.
const NAME_RELIGION: [RegExp, string][] = [
  [/unitarian/i, "unitarian_universalist"],
  [/baha'?i|bahá'í/i, "bahai"],
  [/gurdwara|gurudwara|\bsikh\b/i, "sikh"],
  [/\bjain\b|derasar/i, "jain"],
  [/mosque|masjid|islamic|\bmuslim\b/i, "muslim"],
  [/synagogue|chabad|\bshul\b|jewish|\b(sherith|ohabai|ahavath|ahavat|kehilat|kehillat|anshe|b'?nai|beit|emanu-?el|rodeph|adath|mishkan|ohev)\b|\bbeth (el|israel|shalom|sholom|tikvah|am|torah|david|tfiloh|hillel|jacob|emeth)\b|temple (israel|sinai|shalom)/i, "jewish"],
  [/mandir|hindu|vedanta|iskcon|ganesh|venkateswara|balaji|shiva|vishnu/i, "hindu"],
  [/buddhis|\bzen\b|\bwat\b|dharma|vihara|sangha|kadampa/i, "buddhist"],
  [/church|chapel|cathedral|parish|basilica|ministr|tabernacle|kingdom hall|fellowship|assembly|christian/i, "christian"],
];

function guessReligion(name: string): string | null {
  return NAME_RELIGION.find(([re]) => re.test(name))?.[1] ?? null;
}

function footprint(b: Element["bounds"]): number | null {
  if (!b) return null;
  const h = (b.maxlat - b.minlat) * 111_320;
  const w = (b.maxlon - b.minlon) * 111_320 * Math.cos((((b.maxlat + b.minlat) / 2) * Math.PI) / 180);
  // Bounding boxes overstate rotated or L-shaped buildings; scale down a little.
  return Math.round(h * w * 0.75);
}

export function toPlace(e: Element): OsmPlace | null {
  const t = e.tags ?? {};
  const name = t.name ?? t["name:en"];
  const lat = e.lat ?? (e.bounds ? (e.bounds.minlat + e.bounds.maxlat) / 2 : undefined);
  const lng = e.lon ?? (e.bounds ? (e.bounds.minlon + e.bounds.maxlon) / 2 : undefined);
  if (!name || lat === undefined || lng === undefined) return null;
  const religion = t.religion ? norm(t.religion) : guessReligion(name);
  const street = [t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" ");
  const city = t["addr:city"] ?? null;
  const cityLine = [city, t["addr:state"]].filter(Boolean).join(", ");
  return {
    id: `${e.type}/${e.id}`,
    name,
    lat,
    lng,
    religion,
    religionFromName: !t.religion && !!religion,
    denomination: t.denomination ? norm(t.denomination) : null,
    address: [street, cityLine].filter(Boolean).join(", ") || null,
    city,
    website: t.website ?? t["contact:website"] ?? t.url ?? null,
    phone: t.phone ?? t["contact:phone"] ?? null,
    serviceTimes: t.service_times ?? null,
    footprint: footprint(e.bounds),
    capacity: Number(t.capacity) || null,
    wheelchair: t.wheelchair ?? null,
    operator: t.operator ?? null,
    diocese: t.diocese ?? null,
    facebook: t["contact:facebook"] ?? t.facebook ?? null,
    lgbtq: t.lgbtq ?? null,
  };
}

// The DB is mounted at runtime (a Docker volume on the VPS), never bundled.
const DB_PATH = process.env.PLACES_DB || path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "places.db");
let db: DatabaseSync | null | undefined;

function openDb(): DatabaseSync | null {
  if (db === undefined) {
    db = fs.existsSync(/*turbopackIgnore: true*/ DB_PATH)
      ? new DatabaseSync(/*turbopackIgnore: true*/ DB_PATH, { readOnly: true })
      : null;
  }
  return db;
}

type Row = { id: string; lat: number; lng: number; tags: string; bounds: string | null };

/** From the local copy; null when it has nothing in this area (not imported yet). */
function fromDb(lat: number, lng: number, radiusM: number): OsmPlace[] | null {
  const conn = openDb();
  if (!conn) return null;
  const dLat = radiusM / 111_320;
  const dLng = dLat / Math.cos((lat * Math.PI) / 180);
  const rows = conn
    .prepare("select id, lat, lng, tags, bounds from places where lat between ? and ? and lng between ? and ?")
    .all(lat - dLat, lat + dLat, lng - dLng, lng + dLng) as Row[];
  if (rows.length === 0) return null;
  return rows.map(rowToPlace).filter((p): p is OsmPlace => p !== null);
}

/** One place by OSM id ("node/123"), from the local copy or Overpass. */
export async function placeById(id: string): Promise<OsmPlace | null> {
  const m = id.match(/^(node|way|relation)\/(\d+)$/);
  if (!m) return null;
  const row = openDb()?.prepare("select id, lat, lng, tags, bounds from places where id = ?").get(id) as Row | undefined;
  if (row) return rowToPlace(row);
  try {
    const json = await overpassQuery(`[out:json][timeout:25];${m[1]}(${m[2]});out tags bb center;`);
    const e = json[0] as Element & { center?: { lat: number; lon: number } };
    return e ? toPlace({ ...e, lat: e.lat ?? e.center?.lat, lon: e.lon ?? e.center?.lon }) : null;
  } catch {
    return null;
  }
}

function rowToPlace(r: Row): OsmPlace | null {
  const [type, id] = r.id.split("/");
  return toPlace({
    type,
    id: Number(id),
    lat: r.lat,
    lon: r.lng,
    tags: JSON.parse(r.tags),
    bounds: r.bounds ? JSON.parse(r.bounds) : undefined,
  });
}

/** Places whose name contains `q` (local copy only), nearest first when a point is given. */
export function searchPlacesByName(q: string, near?: { lat: number; lng: number }): OsmPlace[] {
  const conn = openDb();
  if (!conn) return [];
  const like = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
  const box = near ? { dLat: 40_000 / 111_320, dLng: 40_000 / 111_320 / Math.cos((near.lat * Math.PI) / 180) } : null;
  const rows = (
    box
      ? conn
          .prepare("select id, lat, lng, tags, bounds from places where lat between ? and ? and lng between ? and ? and json_extract(tags, '$.name') like ? escape '\\' limit 500")
          .all(near!.lat - box.dLat, near!.lat + box.dLat, near!.lng - box.dLng, near!.lng + box.dLng, like)
      : conn.prepare("select id, lat, lng, tags, bounds from places where json_extract(tags, '$.name') like ? escape '\\' limit 100").all(like)
  ) as Row[];
  const places = rows.map(rowToPlace).filter((p): p is OsmPlace => p !== null);
  if (near) places.sort((a, b) => milesBetween(near, a) - milesBetween(near, b));
  return places.slice(0, 50);
}

/** Every named place of worship within about `radiusM` of a point. */
export async function placesOfWorship(lat: number, lng: number, radiusM: number): Promise<OsmPlace[]> {
  return fromDb(lat, lng, radiusM) ?? overpass(lat, lng, radiusM);
}

/** Live Overpass query, cached for a day. */
async function overpass(lat: number, lng: number, radiusM: number): Promise<OsmPlace[]> {
  "use cache";
  cacheLife("days");
  const elements = await overpassQuery(
    `[out:json][timeout:40];nwr["amenity"="place_of_worship"](around:${radiusM},${lat},${lng});out tags bb;`,
  );
  return elements.map(toPlace).filter((p): p is OsmPlace => p !== null);
}

async function overpassQuery(query: string): Promise<Element[]> {
  let lastError: unknown;
  for (const endpoint of ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(45_000),
      });
      if (!res.ok) throw new Error(`Overpass ${res.status}`);
      const json = (await res.json()) as { elements?: Element[] };
      return json.elements ?? [];
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

// Denomination values that don't say which branch a place belongs to.
export const GENERIC = new Set(["protestant", "christian", "none", "unknown", "other", "multi", "jewish", "muslim", "islam"]);

export type MatchTier = "denomination" | "name" | "religion";

/** How a place relates to a branch: a tagged match, a name match, same religion only, or no match. */
export function matchTier(place: OsmPlace, branch: Branch): MatchTier | null {
  const { religion, denominations = [], name } = branch.osm;
  // A congregation that set its own branch is exactly that branch.
  if (place.listing?.branch) return place.listing.branch === branch.slug ? "denomination" : null;
  // Some UU congregations are tagged religion=christian + denomination=unitarian_universalist.
  if (place.denomination?.startsWith("unitarian")) return branch.slug === "unitarian-universalist" ? "denomination" : null;
  if (!place.religion || !religion.includes(place.religion)) return null;
  if (denominations.length === 0) return "denomination";
  const d = place.denomination;
  if (d && denominations.includes(d)) return "denomination";
  if (d && !GENERIC.has(d)) return null;
  if (name?.test(place.name)) return "name";
  // "First Baptist Church" with no tag is a Baptist church, not a maybe-Methodist one.
  const other = ALL_BRANCHES.some(
    ({ branch: b }) => b !== branch && b.osm.religion.includes(place.religion!) && b.osm.name?.test(place.name),
  );
  return other ? null : "religion";
}

/** Rough size from the building footprint or a capacity tag. */
export function sizeOf(place: OsmPlace): "small" | "medium" | "large" | null {
  if (place.capacity) return place.capacity < 150 ? "small" : place.capacity < 500 ? "medium" : "large";
  if (!place.footprint) return null;
  return place.footprint < 600 ? "small" : place.footprint < 2500 ? "medium" : "large";
}

export function milesBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 3958.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
