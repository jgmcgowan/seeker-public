#!/usr/bin/env node
// Imports every place of worship in the US from OpenStreetMap (via Overpass) into
// SQLite, one state at a time, so searches don't wait on the public Overpass API.
//
//   node scripts/import-places.mjs            # all states
//   node scripts/import-places.mjs TN PA      # just these
//
// The DB path is $PLACES_DB or data/places.db. Each state's rows are replaced in one
// transaction, so the app keeps serving the old copy while a state re-imports.
// Raw tags are stored; the app normalizes them (src/lib/osm.ts) so there's one parser.
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const STATES = (
  "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY PR"
).split(" ");
const ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter"];
const UA = "Seeker/0.1 (faith community finder; contact you@example.com)";

const dbPath = process.env.PLACES_DB ?? path.join(import.meta.dirname, "..", "data", "places.db");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new DatabaseSync(dbPath);
db.exec(`
  pragma journal_mode = wal;
  create table if not exists places (
    id text primary key,          -- "node/123"
    state text not null,
    lat real not null,
    lng real not null,
    tags text not null,           -- JSON object of OSM tags
    bounds text                   -- JSON {minlat,minlon,maxlat,maxlon} for ways/relations
  );
  create index if not exists places_lat on places (lat);
  create index if not exists places_state on places (state);
  create table if not exists imports (state text primary key, count integer not null, imported_at text not null);
`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchState(code) {
  const query = `[out:json][timeout:300];area["ISO3166-2"="US-${code}"]["admin_level"="4"]->.a;nwr["amenity"="place_of_worship"](area.a);out tags bb;`;
  let last;
  for (let attempt = 0; attempt < 3; attempt++) {
    for (const endpoint of ENDPOINTS) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ data: query }),
          signal: AbortSignal.timeout(360_000),
        });
        if (!res.ok) throw new Error(`${endpoint} answered ${res.status}`);
        const json = await res.json();
        if (json.remark?.includes("runtime error")) throw new Error(json.remark);
        return json.elements ?? [];
      } catch (error) {
        last = error;
        console.warn(`  ${code}: ${error.message}; retrying`);
      }
    }
    await sleep(30_000 * (attempt + 1));
  }
  throw last;
}

const insert = db.prepare("insert or replace into places (id, state, lat, lng, tags, bounds) values (?, ?, ?, ?, ?, ?)");
const wanted = process.argv.slice(2).map((s) => s.toUpperCase());
const states = wanted.length ? wanted : STATES;
let failed = 0;

for (const code of states) {
  if (!STATES.includes(code)) {
    console.error(`Unknown state ${code}`);
    continue;
  }
  const started = Date.now();
  try {
    const elements = await fetchState(code);
    let count = 0;
    db.exec("begin");
    db.prepare("delete from places where state = ?").run(code);
    for (const e of elements) {
      const b = e.bounds;
      const lat = e.lat ?? (b ? (b.minlat + b.maxlat) / 2 : undefined);
      const lng = e.lon ?? (b ? (b.minlon + b.maxlon) / 2 : undefined);
      if (lat === undefined || lng === undefined || !e.tags?.name) continue;
      insert.run(`${e.type}/${e.id}`, code, lat, lng, JSON.stringify(e.tags), b ? JSON.stringify(b) : null);
      count++;
    }
    db.prepare("insert or replace into imports (state, count, imported_at) values (?, ?, ?)").run(code, count, new Date().toISOString());
    db.exec("commit");
    console.log(`${code}: ${count} places in ${Math.round((Date.now() - started) / 1000)}s`);
  } catch (error) {
    try {
      db.exec("rollback");
    } catch {}
    failed++;
    console.error(`${code}: failed (${error.message})`);
  }
  // Be gentle with the shared Overpass servers.
  if (states.length > 1) await sleep(10_000);
}

db.close();
process.exit(failed ? 1 : 0);
