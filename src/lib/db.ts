import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

// Seeker's own data: listing requests and edits, contact messages, and service
// times found on congregation websites. Kept apart from places.db, which the
// importer rewrites every week. $SEEKER_DB or data/seeker.db (the Docker volume).

const DB_PATH = process.env.SEEKER_DB || path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "seeker.db");
let db: DatabaseSync | undefined;

export function appDb(): DatabaseSync {
  if (db) return db;
  fs.mkdirSync(path.dirname(/*turbopackIgnore: true*/ DB_PATH), { recursive: true });
  db = new DatabaseSync(/*turbopackIgnore: true*/ DB_PATH);
  db.exec(`
    pragma journal_mode = wal;
    pragma busy_timeout = 3000;
    create table if not exists listings (
      id integer primary key,
      place_id text,                -- OSM id ("node/123"); null for a congregation not on the map
      status text not null,         -- pending | approved | rejected | superseded
      action text not null,         -- add | update | remove
      fields text not null,         -- JSON ListingFields: only what was set or changed
      snapshot text,                -- JSON of the OSM place when the request came in
      display integer not null default 1,  -- 0 = hidden from Seeker
      locked integer not null default 0,   -- 1 = map refreshes never change or remove it
      lat real,
      lng real,
      submitter text,               -- JSON {name,email,role,message}; never shown publicly
      source text not null,         -- public | admin
      created_at text not null,
      updated_at text not null,
      reviewed_at text
    );
    create index if not exists listings_place on listings (place_id, status);
    create index if not exists listings_lat on listings (status, lat);
    create table if not exists contact_messages (
      id integer primary key,
      name text not null,
      email text not null,
      topic text not null,
      body text not null,
      status text not null default 'new',  -- new | done | spam
      emailed integer not null default 0,
      created_at text not null
    );
    create table if not exists website_times (
      place_id text primary key,
      url text not null,
      result text not null,         -- JSON WebsiteTimes
      checked_at text not null
    );
  `);
  return db;
}

export const now = () => new Date().toISOString();
