import dns from "node:dns/promises";
import net from "node:net";
import { appDb, now } from "./db";
import type { ServiceSlot } from "./service-times";

// Most places on the map don't list service times, but many congregations put them
// on their home page or a "Visit" / "Worship" page. We read those pages (only the
// website the map lists for that place), pull out lines that look like service
// times, and cache the result. It's a best guess, and the UI says so.

export type WebsiteTimes = {
  status: "found" | "none" | "error";
  slots: ServiceSlot[];
  /** Short lines from the page, shown so people can judge for themselves. */
  snippets: string[];
  /** The page the times came from. */
  source: string | null;
  checkedAt: string;
};

const UA = "Seeker/0.1 (finds public service times for visitors; https://seeker.example.com)";
const MAX_BYTES = 1_500_000;
const FRESH_DAYS = { found: 14, none: 5, error: 2 };

export function cachedTimes(ids: string[]): Map<string, WebsiteTimes> {
  const out = new Map<string, WebsiteTimes>();
  if (!ids.length) return out;
  const rows = appDb()
    .prepare(`select place_id, result from website_times where place_id in (${ids.map(() => "?").join(",")})`)
    .all(...ids) as { place_id: string; result: string }[];
  for (const r of rows) {
    const t = JSON.parse(r.result) as WebsiteTimes;
    if (t.status === "found") out.set(r.place_id, t);
  }
  return out;
}

const inflight = new Map<string, Promise<WebsiteTimes>>();
let running = 0;

/** Cached result for a place, or a fresh look at its website. */
export async function websiteTimes(placeId: string, url: string): Promise<WebsiteTimes> {
  const row = appDb().prepare("select url, result, checked_at from website_times where place_id = ?").get(placeId) as
    | { url: string; result: string; checked_at: string }
    | undefined;
  if (row && row.url === url) {
    const cached = JSON.parse(row.result) as WebsiteTimes;
    if (Date.now() - Date.parse(row.checked_at) < FRESH_DAYS[cached.status] * 86_400_000) return cached;
  }
  if (inflight.has(placeId)) return inflight.get(placeId)!;
  if (running >= 6) return { status: "error", slots: [], snippets: [], source: null, checkedAt: now() };
  running++;
  const job = scan(url)
    .catch((): WebsiteTimes => ({ status: "error", slots: [], snippets: [], source: null, checkedAt: now() }))
    .then((result) => {
      appDb()
        .prepare("insert or replace into website_times (place_id, url, result, checked_at) values (?, ?, ?, ?)")
        .run(placeId, url, JSON.stringify(result), result.checkedAt);
      return result;
    })
    .finally(() => {
      running--;
      inflight.delete(placeId);
    });
  inflight.set(placeId, job);
  return job;
}

async function scan(website: string): Promise<WebsiteTimes> {
  const home = await getPage(normalizeUrl(website));
  let best = extract(home.text);
  let source = home.url;
  if (best.slots.length === 0) {
    // Try the pages most likely to list times.
    for (const link of candidateLinks(home.html, home.url).slice(0, 3)) {
      try {
        const page = await getPage(link);
        const found = extract(page.text);
        if (found.slots.length > best.slots.length || (best.snippets.length === 0 && found.snippets.length)) {
          best = found;
          source = page.url;
        }
        if (found.slots.length) break;
      } catch {
        // Skip pages that fail; the home page result stands.
      }
    }
  }
  return {
    status: best.slots.length || best.snippets.length ? "found" : "none",
    slots: best.slots,
    snippets: best.snippets,
    source,
    checkedAt: now(),
  };
}

function normalizeUrl(raw: string): string {
  const s = raw.trim();
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

// ---- fetching, without reaching private networks ----

function isPrivate(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)) || a >= 224
    );
  }
  const v = ip.toLowerCase();
  if (v.startsWith("::ffff:")) return isPrivate(v.slice(7));
  return v === "::" || v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80") || v.startsWith("ff");
}

async function assertPublic(url: URL) {
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("unsupported scheme");
  if (url.port && url.port !== "80" && url.port !== "443") throw new Error("unsupported port");
  if (url.username || url.password) throw new Error("credentials in url");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host)) {
    if (isPrivate(host)) throw new Error("private address");
    return;
  }
  if (!host.includes(".") || /\.(local|internal|localhost|lan|home)$/i.test(host)) throw new Error("private host");
  const addrs = await dns.lookup(host, { all: true });
  if (!addrs.length || addrs.some((a) => isPrivate(a.address))) throw new Error("private address");
}

async function getPage(start: string): Promise<{ url: string; html: string; text: string }> {
  let url = new URL(start);
  for (let hop = 0; hop < 4; hop++) {
    await assertPublic(url);
    const res = await fetch(url, {
      redirect: "manual",
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(8_000),
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = new URL(res.headers.get("location")!, url);
      await res.body?.cancel();
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (!/html/i.test(res.headers.get("content-type") ?? "html")) throw new Error("not html");
    const html = await readCapped(res);
    return { url: url.toString(), html, text: htmlToText(html) };
  }
  throw new Error("too many redirects");
}

async function readCapped(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.length;
  }
  await reader.cancel().catch(() => {});
  return new TextDecoder().decode(Buffer.concat(chunks));
}

// ---- reading the page ----

const ENTITIES: Record<string, string> = { amp: "&", nbsp: " ", lt: "<", gt: ">", quot: '"', apos: "'", ndash: "–", mdash: "—", rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"', middot: "·", bull: "·" };

export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg|template|iframe)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/td|\/th|\/section|\/article|\/header|\/footer|p|div|li|h[1-6]|tr|section)\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e: string) =>
      e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : (ENTITIES[e.toLowerCase()] ?? m),
    )
    .replace(/[ \t ]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

const LINK_WORDS = /(service|worship|mass|times|schedule|visit|new[- ]?here|plan|sunday|liturgy|prayer|shabbat|jumu|join[- ]us|about)/i;

function candidateLinks(html: string, base: string): string[] {
  const origin = new URL(base).origin;
  const scored: { url: string; score: number }[] = [];
  for (const m of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    let url: URL;
    try {
      url = new URL(m[1], base);
    } catch {
      continue;
    }
    if (url.origin !== origin || /\.(pdf|jpe?g|png|gif|mp3|mp4|docx?)$/i.test(url.pathname)) continue;
    const text = m[2].replace(/<[^>]+>/g, " ");
    const hay = `${text} ${url.pathname}`;
    if (!LINK_WORDS.test(hay)) continue;
    const score = (/(service|worship|mass)\s*times|schedule|plan.{0,10}visit|new here|visit/i.test(hay) ? 3 : 1) + (/about/i.test(hay) ? -0.5 : 0);
    if (!scored.some((s) => s.url === url.href)) scored.push({ url: url.href, score });
  }
  return scored.sort((a, b) => b.score - a.score).map((s) => s.url);
}

const DAY_RE = /\b(mon(?:day)?\s*(?:-|–|—|through|thru|to)\s*fri(?:day)?|sun(?:day)?s?|mon(?:day)?s?|tue(?:s|sday)?s?|wed(?:nesday)?s?|thu(?:r|rs|rsday)?s?|fri(?:day)?s?|sat(?:urday)?s?|weekdays?|daily|shabbat|jumu'?ah)\b/gi;
const TIME_RE = /\b(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(a\.?\s?m\.?|p\.?\s?m\.?)(?![a-z])|\bnoon\b/gi;
const SERVICE_WORDS = /\b(worship|service|services|mass|masses|liturgy|vigil|gathering|celebration|prayer|shabbat|jumu'?ah|kabbalat|minyan|meditation|satsang|aarti|kirtan|sunday school|bible study|confession|vespers|matins|eucharist|communion|traditional|contemporary)\b/i;
const NOT_SERVICE = /\b(office hours|office is open|thrift|store|daycare|preschool|pantry|clinic|gym|rental|copyright)\b/i;
const NOTE_WORDS = /\b(traditional|contemporary|blended|spanish|español|espanol|korean|vigil|youth|sunday school|bible study|confession|vespers|matins|livestream(?:ed)?|online|english|latin)\b/i;

function dayIndexes(token: string): number[] {
  const t = token.toLowerCase();
  if (/weekday|^mon.*fri/.test(t)) return [1, 2, 3, 4, 5];
  if (t === "daily") return [0, 1, 2, 3, 4, 5, 6];
  if (t === "shabbat") return [6];
  if (t.startsWith("jumu")) return [5];
  const i = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].indexOf(t.slice(0, 3));
  return i >= 0 ? [i] : [];
}

/** Lines that look like service times, and the slots we can read from them. */
export function extract(text: string): { slots: ServiceSlot[]; snippets: string[] } {
  const lines = text
    .split("\n")
    .flatMap((l) => (l.length > 220 ? l.split(/(?<=[.!?])\s+/) : [l]))
    .map((l) => l.trim())
    .filter(Boolean);
  const slots: ServiceSlot[] = [];
  const strong: string[] = [];
  const weak: string[] = [];
  // Days often head a list ("Sunday" / "9:00 AM Traditional" / "11:00 AM Contemporary"),
  // so the last day named carries over a few lines.
  let carried: number[] = [];
  let sinceDay = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const skip = line.length > 240 || NOT_SERVICE.test(line);
    const tokens = [...line.matchAll(new RegExp(`${DAY_RE.source}|${TIME_RE.source}`, "gi"))];
    const hasTime = tokens.some((t) => /\d|noon/i.test(t[0]));
    const context = [lines[i - 3], lines[i - 2], lines[i - 1], line].filter(Boolean).join(" ");
    const hasDay = carried.length > 0 || tokens.some((t) => !/\d|noon/i.test(t[0]));
    const hasWord = SERVICE_WORDS.test(context);
    if (!skip && hasTime && (hasDay || hasWord)) {
      const prev = lines[i - 1];
      const snippet = (line.length < 30 && prev && prev.length < 60 ? `${prev} ${line}` : line).replace(/\s+/g, " ").slice(0, 180);
      (hasDay && hasWord ? strong : weak).push(snippet);
    }
    let days = carried;
    for (let k = 0; k < tokens.length; k++) {
      const t = tokens[k];
      const word = t[0];
      if (!/\d|noon/i.test(word)) {
        days = dayIndexes(word);
        continue;
      }
      if (skip || !hasWord || !days.length) continue;
      const start = timeOf(word);
      if (start === null || start < 5 * 60 || start > 22 * 60) continue;
      // A note belongs to the text right after this time, up to the next day or time.
      const end = (t.index ?? 0) + word.length;
      const after = line.slice(end, tokens[k + 1]?.index ?? line.length);
      const before = line.slice(tokens[k - 1] ? (tokens[k - 1].index ?? 0) + tokens[k - 1][0].length : 0, t.index);
      // The end of a range ("9am-4pm") or of a service ("ends at noon").
      if (/^\s*(-|–|to|until)\s*$/i.test(before) || /\b(ends?|until|till|through)\s*(at|around|by)?\s*$/i.test(before)) continue;
      const note = (after.match(NOTE_WORDS) ?? before.match(NOTE_WORDS))?.[0];
      for (const d of days) slots.push({ day: d, start, note: note ? cap(note) : undefined });
    }
    if (tokens.some((t) => !/\d|noon/i.test(t[0]))) {
      carried = days;
      sinceDay = 0;
    } else if (++sinceDay > 3 || (!hasTime && line.length > 40)) {
      carried = [];
    }
  }
  const snippets: string[] = [];
  for (const sn of [...strong, ...weak]) {
    if (snippets.length < 5 && !snippets.some((s) => s.includes(sn) || sn.includes(s))) snippets.push(sn);
  }
  const seen = new Set<string>();
  const unique = slots.filter((s) => {
    const k = `${s.day}|${s.start}`;
    return !seen.has(k) && !!seen.add(k);
  });
  // A page that lists dozens of times is an events calendar, not a service schedule.
  const sane = unique.length <= 16 ? unique : [];
  return {
    slots: sane.sort((a, b) => ((a.day + 6) % 7) - ((b.day + 6) % 7) || a.start - b.start),
    snippets,
  };
}

function timeOf(word: string): number | null {
  if (/noon/i.test(word)) return 12 * 60;
  const m = word.match(/(\d{1,2})(?::(\d{2}))?\s*([ap])/i);
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (m[3].toLowerCase() === "p") h += 12;
  return h * 60 + Number(m[2] ?? 0);
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1).toLowerCase();
