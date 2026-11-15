import { appDb, now } from "./db";
import type { ListingInfo, OsmPlace } from "./osm";

// Congregations (and the admin) can add a place, correct one, or take one off Seeker.
// Requests wait for review; an approved listing sits on top of the map data:
// - `display` off: the place is hidden from Seeker.
// - `locked` on: "don't update or delete". We keep the details as approved even if
//   the weekly map refresh changes or removes the place.
// - otherwise the map data stays live and only the fields the listing set win.

export type ListingFields = {
  name?: string;
  address?: string;
  city?: string;
  lat?: number;
  lng?: number;
  religion?: string;
  branch?: string;
  association?: string;
  website?: string;
  phone?: string;
  /** OSM syntax, see service-times.ts. */
  serviceTimes?: string;
  /** Ids from preferences.ts EXTRAS. */
  features?: string[];
  /** Short public note ("Spanish Mass Sundays at 1 PM"). */
  note?: string;
};

export type Submitter = { name: string; email: string; role: string; message?: string };

export type Listing = {
  id: number;
  placeId: string | null;
  status: "pending" | "approved" | "rejected" | "superseded";
  action: "add" | "update" | "remove";
  fields: ListingFields;
  snapshot: OsmPlace | null;
  display: boolean;
  locked: boolean;
  lat: number | null;
  lng: number | null;
  submitter: Submitter | null;
  source: "public" | "admin";
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
};

type Row = {
  id: number;
  place_id: string | null;
  status: Listing["status"];
  action: Listing["action"];
  fields: string;
  snapshot: string | null;
  display: number;
  locked: number;
  lat: number | null;
  lng: number | null;
  submitter: string | null;
  source: Listing["source"];
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
};

function fromRow(r: Row): Listing {
  return {
    id: r.id,
    placeId: r.place_id,
    status: r.status,
    action: r.action,
    fields: JSON.parse(r.fields),
    snapshot: r.snapshot ? JSON.parse(r.snapshot) : null,
    display: !!r.display,
    locked: !!r.locked,
    lat: r.lat,
    lng: r.lng,
    submitter: r.submitter ? JSON.parse(r.submitter) : null,
    source: r.source,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    reviewedAt: r.reviewed_at,
  };
}

const FIELD_KEYS: (keyof ListingFields)[] = ["name", "address", "city", "lat", "lng", "religion", "branch", "association", "website", "phone", "serviceTimes", "features", "note"];

/** Keeps known fields with sane values; drops empty strings. */
export function cleanFields(input: unknown): ListingFields {
  const src = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out: ListingFields = {};
  for (const k of FIELD_KEYS) {
    const v = src[k];
    if (k === "lat" || k === "lng") {
      const n = Number(v);
      if (v !== undefined && v !== null && v !== "" && Number.isFinite(n) && Math.abs(n) <= (k === "lat" ? 90 : 180)) out[k] = n;
    } else if (k === "features") {
      if (Array.isArray(v)) out.features = v.filter((x): x is string => typeof x === "string").slice(0, 20).map((x) => x.slice(0, 40));
    } else if (typeof v === "string" && v.trim()) {
      out[k] = v.trim().slice(0, k === "note" ? 300 : 200);
    }
  }
  if (out.website && !/^https?:\/\//i.test(out.website)) out.website = `https://${out.website}`;
  return out;
}

export function listingById(id: number): Listing | null {
  const row = appDb().prepare("select * from listings where id = ?").get(id) as Row | undefined;
  return row ? fromRow(row) : null;
}

export function approvedFor(placeId: string): Listing | null {
  const row = appDb()
    .prepare("select * from listings where place_id = ? and status = 'approved' order by updated_at desc limit 1")
    .get(placeId) as Row | undefined;
  return row ? fromRow(row) : null;
}

export function listListings(filter: { status?: string; q?: string; limit?: number }): Listing[] {
  const where: string[] = [];
  const args: (string | number)[] = [];
  if (filter.status) {
    where.push("status = ?");
    args.push(filter.status);
  }
  if (filter.q) {
    where.push("(fields like ? or snapshot like ? or place_id = ?)");
    args.push(`%${filter.q}%`, `%${filter.q}%`, filter.q);
  }
  const rows = appDb()
    .prepare(`select * from listings ${where.length ? `where ${where.join(" and ")}` : ""} order by updated_at desc limit ?`)
    .all(...args, filter.limit ?? 200) as Row[];
  return rows.map(fromRow);
}

export function createListing(l: {
  placeId: string | null;
  action: Listing["action"];
  fields: ListingFields;
  snapshot: OsmPlace | null;
  display: boolean;
  locked: boolean;
  submitter: Submitter | null;
  source: Listing["source"];
  status: Listing["status"];
}): number {
  const t = now();
  const lat = l.fields.lat ?? l.snapshot?.lat ?? null;
  const lng = l.fields.lng ?? l.snapshot?.lng ?? null;
  const db = appDb();
  db.exec("begin");
  try {
    if (l.status === "approved" && l.placeId) {
      db.prepare("update listings set status = 'superseded', updated_at = ? where place_id = ? and status = 'approved'").run(t, l.placeId);
    }
    const res = db
      .prepare(
        `insert into listings (place_id, status, action, fields, snapshot, display, locked, lat, lng, submitter, source, created_at, updated_at, reviewed_at)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        l.placeId,
        l.status,
        l.action,
        JSON.stringify(l.fields),
        l.snapshot ? JSON.stringify(l.snapshot) : null,
        l.display ? 1 : 0,
        l.locked ? 1 : 0,
        lat,
        lng,
        l.submitter ? JSON.stringify(l.submitter) : null,
        l.source,
        t,
        t,
        l.status === "approved" ? t : null,
      );
    db.exec("commit");
    return Number(res.lastInsertRowid);
  } catch (e) {
    db.exec("rollback");
    throw e;
  }
}

/** Review a request (or edit an approved listing): the admin's changes win. */
export function reviewListing(
  id: number,
  decision: { status: "approved" | "rejected"; fields?: ListingFields; display?: boolean; locked?: boolean },
): Listing | null {
  const current = listingById(id);
  if (!current) return null;
  const t = now();
  const fields = decision.fields ?? current.fields;
  const display = decision.display ?? current.display;
  const locked = decision.locked ?? current.locked;
  const db = appDb();
  db.exec("begin");
  try {
    if (decision.status === "approved" && current.placeId) {
      db.prepare("update listings set status = 'superseded', updated_at = ? where place_id = ? and status = 'approved' and id != ?").run(t, current.placeId, id);
    }
    db.prepare(
      "update listings set status = ?, fields = ?, display = ?, locked = ?, lat = ?, lng = ?, updated_at = ?, reviewed_at = ? where id = ?",
    ).run(
      decision.status,
      JSON.stringify(fields),
      display ? 1 : 0,
      locked ? 1 : 0,
      fields.lat ?? current.snapshot?.lat ?? current.lat,
      fields.lng ?? current.snapshot?.lng ?? current.lng,
      t,
      t,
      id,
    );
    db.exec("commit");
  } catch (e) {
    db.exec("rollback");
    throw e;
  }
  return listingById(id);
}

export function deleteListing(id: number) {
  appDb().prepare("delete from listings where id = ?").run(id);
}

/** Approved listings whose point is inside a box. */
function approvedInBox(lat: number, lng: number, radiusM: number): Listing[] {
  const dLat = radiusM / 111_320;
  const dLng = dLat / Math.cos((lat * Math.PI) / 180);
  const rows = appDb()
    .prepare("select * from listings where status = 'approved' and lat between ? and ? and lng between ? and ?")
    .all(lat - dLat, lat + dLat, lng - dLng, lng + dLng) as Row[];
  return rows.map(fromRow);
}

function info(l: Listing): ListingInfo {
  return {
    id: l.id,
    branch: l.fields.branch,
    association: l.fields.association,
    features: l.fields.features ?? [],
    note: l.fields.note,
    locked: l.locked,
    updatedAt: l.updatedAt,
  };
}

/** A place with a listing's fields on top. */
export function applyFields(base: OsmPlace, l: Listing): OsmPlace {
  const f = l.fields;
  return {
    ...base,
    name: f.name ?? base.name,
    address: f.address ?? base.address,
    city: f.city ?? base.city,
    lat: f.lat ?? base.lat,
    lng: f.lng ?? base.lng,
    religion: f.religion ?? base.religion,
    religionFromName: f.religion ? false : base.religionFromName,
    website: f.website ?? base.website,
    phone: f.phone ?? base.phone,
    serviceTimes: f.serviceTimes ?? base.serviceTimes,
    listing: info(l),
  };
}

const blank = (id: string, f: ListingFields): OsmPlace => ({
  id,
  name: f.name ?? "Unnamed",
  lat: f.lat ?? 0,
  lng: f.lng ?? 0,
  religion: f.religion ?? null,
  religionFromName: false,
  denomination: null,
  address: f.address ?? null,
  city: f.city ?? null,
  website: null,
  phone: null,
  serviceTimes: null,
  footprint: null,
  capacity: null,
  wheelchair: null,
  operator: null,
  diocese: null,
  facebook: null,
  lgbtq: null,
});

/** Map places near a point with approved listings applied: hidden ones dropped, new and locked ones added. */
export function withListings(places: OsmPlace[], lat: number, lng: number, radiusM: number): OsmPlace[] {
  let listings: Listing[];
  try {
    listings = approvedInBox(lat, lng, radiusM);
  } catch (error) {
    console.error("listings unavailable", error);
    return places;
  }
  if (!listings.length) return places;
  const byPlace = new Map(listings.filter((l) => l.placeId).map((l) => [l.placeId!, l]));
  const out: OsmPlace[] = [];
  const seen = new Set<string>();
  for (const p of places) {
    const l = byPlace.get(p.id);
    seen.add(p.id);
    if (!l) out.push(p);
    else if (l.display) out.push(applyFields(l.locked && l.snapshot ? l.snapshot : p, l));
  }
  for (const l of listings) {
    if (!l.display) continue;
    if (!l.placeId) out.push(applyFields(blank(`listing/${l.id}`, l.fields), l));
    // Locked: keep it even when the map no longer has the place.
    else if (!seen.has(l.placeId) && l.locked && l.snapshot) out.push(applyFields(l.snapshot, l));
  }
  return out;
}
