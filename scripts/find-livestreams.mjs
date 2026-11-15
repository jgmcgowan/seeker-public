#!/usr/bin/env node
// Looks for congregations that stream their services, around one city at a time.
// Reads each place's own website (the one OpenStreetMap lists), finds where the stream
// is published, and writes src/lib/livestreams.json for review before committing.
//
//   node scripts/find-livestreams.mjs philadelphia
//
// Rules for the link we keep:
// - a fixed stream address (YouTube channel live link, Church Online, BoxCast, Resi,
//   a Vimeo event, or the congregation's own "watch live" page that embeds one) is used as is;
// - when each service gets a new video, we link where they're published: the YouTube
//   channel's Live tab if they use YouTube, else their Facebook videos.
// YouTube channels only count when their Live tab actually has streams.

import { DatabaseSync } from "node:sqlite";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const CITIES = {
  philadelphia: { lat: 39.9526, lng: -75.1652, miles: 25 },
};
const DB = process.env.PLACES_DB ?? path.join(process.cwd(), "data", "places.db");
const OUT = path.join(process.cwd(), "src", "lib", "livestreams.json");
const UA = "Seeker/0.1 (finds public livestream links for visitors; https://seeker.example.com)";
const CONCURRENCY = 6;

const cities = process.argv.slice(2).filter((c) => CITIES[c]);
if (!cities.length) {
  console.error(`usage: find-livestreams.mjs ${Object.keys(CITIES).join(" ")}`);
  process.exit(1);
}

function miles(a, b) {
  const r = (d) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 7917.6 * Math.asin(Math.sqrt(h));
}

async function get(url, ms = 15000) {
  const res = await fetch(url, { headers: { "user-agent": UA, "accept-language": "en-US" }, redirect: "follow", signal: AbortSignal.timeout(ms) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("html")) throw new Error(`not html: ${type}`);
  return { url: res.url, html: (await res.text()).slice(0, 2_000_000) };
}

const decode = (s) => s.replace(/&amp;/g, "&").replace(/&#0?38;/g, "&").replace(/\\\//g, "/");

/** Every link, iframe and embed address on a page, with the link text when there is one. */
function links(html, base) {
  const out = [];
  for (const m of html.matchAll(/<a\b[^>]*?href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]{0,300}?)<\/a>/gi)) {
    out.push({ href: m[1], text: m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() });
  }
  for (const m of html.matchAll(/\b(?:src|data-src|data-url)\s*=\s*["']([^"']+)["']/gi)) out.push({ href: m[1], text: "", embed: true });
  // Page builders often keep embed addresses in JSON.
  for (const m of html.matchAll(/https?:\\?\/\\?\/(?:www\.)?(?:youtube\.com|youtu\.be|[\w-]+\.online\.church|boxcast\.tv|vimeo\.com\/event|control\.resi\.io)[^"'\s<>)]+/gi)) {
    out.push({ href: m[0], text: "", embed: true });
  }
  return out
    .map((l) => {
      try {
        return { ...l, url: new URL(decode(l.href), base) };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

const YT_CHANNEL = /^\/(@[\w.-]+|channel\/UC[\w-]{22}|c\/[\w.-]+|user\/[\w.-]+)/;
const LIVE_WORDS = /\b(live ?stream|livestream|watch (us )?(live|online)|stream(ing)?|live|watch|online (worship|service|church|mass)|worship online|services? online)\b/i;
const LIVE_PATH = /\/(live|livestream|live-stream|watch|watch-live|online|stream|streaming|worship-online|online-worship|sermons?\/live)(\/|$|\.)/i;

/** What a page tells us about streaming. */
function scan(page, home) {
  const found = { fixed: null, channels: new Set(), facebook: null, livePages: new Set(), mentionsLive: LIVE_WORDS.test(page.html.replace(/<[^>]+>/g, " ")) };
  for (const l of links(page.html, page.url)) {
    const u = l.url;
    const host = u.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      const ch = u.searchParams.get("channel");
      if (u.pathname.startsWith("/embed/live_stream") && ch) found.fixed ??= { url: `https://www.youtube.com/channel/${ch}/live`, kind: "youtube" };
      const m = u.pathname.match(YT_CHANNEL);
      if (m) {
        if (/\/live\/?$/.test(u.pathname)) found.fixed ??= { url: `https://www.youtube.com/${m[1]}/live`, kind: "youtube" };
        found.channels.add(m[1]);
      }
    } else if (/\.online\.church$/.test(host)) found.fixed ??= { url: `https://${u.hostname}/`, kind: "platform" };
    else if (host === "boxcast.tv" && /^\/channel\//.test(u.pathname)) found.fixed ??= { url: `https://boxcast.tv${u.pathname}`, kind: "platform" };
    else if (host === "vimeo.com" && /^\/event\/\d+/.test(u.pathname)) found.fixed ??= { url: `https://vimeo.com${u.pathname.match(/^\/event\/\d+/)[0]}`, kind: "platform" };
    else if (host === "control.resi.io" && l.embed) found.embedsFixed = true;
    else if (host === "facebook.com" && /^\/[\w.-]+\/(live|live_videos|videos)\/?$/.test(u.pathname) && !/^\/(search|watch|groups|events)\//.test(u.pathname)) found.facebook ??= `https://www.facebook.com${u.pathname}`;
    else if (u.hostname === new URL(home).hostname && (LIVE_PATH.test(u.pathname) || (l.text && /^(watch|live|watch live|live ?stream|watch online|stream)$/i.test(l.text)))) {
      found.livePages.add(u.origin + u.pathname);
    }
  }
  return found;
}

const RECENT_DAYS = 45;
const UNIT_DAYS = { s: 0, sec: 0, second: 0, m: 0, min: 0, minute: 0, h: 0, hour: 0, d: 1, day: 1, w: 7, week: 7, mo: 30, month: 30, y: 365, year: 365 };

/** Days since the newest stream on a Live tab ("Streamed 5 days ago", "12d ago", "1mo ago"); 0 if one is scheduled or live. */
function newestDays(html) {
  if (/"Scheduled for |"upcomingEventData"|BADGE_STYLE_TYPE_LIVE_NOW/.test(html)) return 0;
  let best = Infinity;
  for (const m of html.matchAll(/"(?:Streamed )?(\d+)\s*(seconds?|sec|minutes?|min|hours?|h|days?|d|weeks?|w|months?|mo|years?|y|m|s) ago"/g)) {
    const unit = UNIT_DAYS[m[2].replace(/s$/, "")] ?? UNIT_DAYS[m[2]];
    if (unit !== undefined) best = Math.min(best, Number(m[1]) * unit);
  }
  return best;
}

const channelCache = new Map();
/** A YouTube channel's Live tab, if it has streamed in the last RECENT_DAYS. */
async function channelStreams(handle) {
  if (channelCache.has(handle)) return channelCache.get(handle);
  const p = (async () => {
    try {
      const { url, html } = await get(`https://www.youtube.com/${handle}/streams`);
      if (!/\/streams\/?$/.test(new URL(url).pathname)) return null;
      const days = newestDays(html);
      if (days > RECENT_DAYS) return null;
      const handleOut = html.match(/"canonicalBaseUrl":"\/(@[^"]+)"/)?.[1] ?? handle;
      return { url: `https://www.youtube.com/${handleOut}/streams`, handle: handleOut, days };
    } catch {
      return null;
    }
  })();
  channelCache.set(handle, p);
  return p;
}

const lastStreamed = (days) => new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

async function check(place) {
  const home = place.website;
  const pages = [];
  try {
    pages.push({ ...(await get(home)), kind: "home" });
  } catch (e) {
    return { status: "error", error: String(e.message ?? e) };
  }
  let found = scan(pages[0], pages[0].url);
  // Follow up to two "watch / live" pages on their own site.
  for (const lp of [...found.livePages].slice(0, 2)) {
    try {
      const page = await get(lp);
      const f = scan(page, pages[0].url);
      pages.push({ ...page, kind: "live" });
      const embeds = f.fixed || f.embedsFixed || f.channels.size;
      if (f.fixed || f.embedsFixed) found.fixed ??= f.fixed ?? { url: page.url, kind: "site" };
      else if (embeds && f.mentionsLive) found.livePage ??= page.url;
      f.channels.forEach((c) => found.channels.add(c));
      found.facebook ??= f.facebook;
    } catch {}
  }
  if (found.fixed?.kind === "youtube") {
    const ch = found.fixed.url.match(/youtube\.com\/(@[^/]+|channel\/UC[\w-]{22}|c\/[^/]+)/)?.[1];
    const streams = ch && (await channelStreams(ch));
    if (streams) return { status: "found", url: found.fixed.url, kind: "youtube", persistent: true, source: pages.at(-1).url, lastStreamed: lastStreamed(streams.days) };
    found.fixed = null;
  }
  if (found.fixed?.kind === "platform") {
    // Old Vimeo events and retired channels stay linked from sites long after they're gone.
    const ok = await fetch(found.fixed.url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(15000) }).then((r) => r.ok, () => false);
    if (!ok) found.fixed = null;
  }
  if (found.fixed) return { status: "found", url: found.fixed.url, kind: found.fixed.kind, persistent: true, source: pages.at(-1).url };
  for (const ch of found.channels) {
    const streams = await channelStreams(ch);
    if (streams) return { status: "found", url: streams.url, kind: "youtube", persistent: false, source: pages[0].url, lastStreamed: lastStreamed(streams.days) };
  }
  if (found.livePage) return { status: "found", url: found.livePage, kind: "site", persistent: true, source: found.livePage };
  if (found.facebook && found.mentionsLive) return { status: "found", url: found.facebook, kind: "facebook", persistent: false, source: pages[0].url };
  return { status: "none" };
}

const db = new DatabaseSync(DB, { readOnly: true });
const existing = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
const out = { ...existing };
const report = { found: 0, none: 0, error: 0 };

for (const city of cities) {
  const c = CITIES[city];
  const dLat = c.miles / 69;
  const dLng = c.miles / (69 * Math.cos((c.lat * Math.PI) / 180));
  const rows = db
    .prepare("select id, lat, lng, tags from places where lat between ? and ? and lng between ? and ?")
    .all(c.lat - dLat, c.lat + dLat, c.lng - dLng, c.lng + dLng)
    .map((r) => ({ id: r.id, lat: r.lat, lng: r.lng, tags: JSON.parse(r.tags) }))
    .filter((r) => miles(c, r) <= c.miles)
    .map((r) => ({ ...r, name: r.tags.name, website: r.tags.website ?? r.tags["contact:website"] ?? r.tags.url }))
    .filter((r) => r.name && /^https?:\/\/[^/]*[a-z]/i.test(r.website ?? ""));
  console.log(`${city}: ${rows.length} places with a website`);
  // Drop this city's old results so places that stopped streaming disappear.
  for (const [id, v] of Object.entries(out)) if (v.city === city) delete out[id];

  let i = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (i < rows.length) {
        const p = rows[i++];
        const r = await check(p);
        report[r.status]++;
        if (r.status === "found") {
          out[p.id] = { name: p.name, city, url: r.url, kind: r.kind, persistent: r.persistent, source: r.source, ...(r.lastStreamed && { lastStreamed: r.lastStreamed }), checked: new Date().toISOString().slice(0, 10) };
          console.log(`  ✓ ${p.name} → ${r.url}`);
        }
      }
    }),
  );
}

writeFileSync(OUT, JSON.stringify(Object.fromEntries(Object.entries(out).sort(([, a], [, b]) => a.city.localeCompare(b.city) || a.name.localeCompare(b.name))), null, 2) + "\n");
console.log(report, `→ ${path.relative(process.cwd(), OUT)}`);
