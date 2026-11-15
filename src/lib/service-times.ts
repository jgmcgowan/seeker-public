// Parses OpenStreetMap `service_times` (opening_hours-like syntax, e.g.
// `Su 08:30,10:00; We 18:00-19:00; Sa 17:00 "Vigil"`) into something we can show
// and match against "weekend morning / weekend evening / weekday" preferences.

export type ServiceSlot = { day: number; start: number; note?: string }; // day 0 = Sunday; start in minutes

export type TimePref = "weekend-morning" | "weekend-evening" | "weekday";

export const TIME_PREFS: { id: TimePref; label: string }[] = [
  { id: "weekend-morning", label: "Weekend mornings" },
  { id: "weekend-evening", label: "Weekend afternoons/evenings" },
  { id: "weekday", label: "Weekdays" },
];

export const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function expandDays(spec: string): number[] {
  const out = new Set<number>();
  for (const part of spec.split(",")) {
    const [a, b] = part.replace(/\[.*?\]/g, "").trim().split("-").map((s) => DAYS.indexOf(s.trim().slice(0, 2)));
    if (a < 0) continue;
    if (b === undefined || b < 0) out.add(a);
    else for (let d = a; ; d = (d + 1) % 7) {
      out.add(d);
      if (d === b) break;
    }
  }
  return [...out];
}

const MONTHS = "Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec";
const SEASON = new RegExp(`^((?:${MONTHS})(?:\\s*\\d{1,2})?(?:\\s*-\\s*(?:${MONTHS})(?:\\s*\\d{1,2})?)?)\\s+`);

export function parseServiceTimes(raw: string | undefined): ServiceSlot[] {
  if (!raw) return [];
  const slots: ServiceSlot[] = [];
  // Rules are split by ";" and sometimes by ", " before a new day ("Su 10:00 "School", Su 11:00").
  for (let rule of raw.split(/;|,\s*(?=(?:Mo|Tu|We|Th|Fr|Sa|Su)\b)/)) {
    rule = rule.trim();
    // "Sep-May Su 10:45; Jun-Aug Su 10:00": keep the season as a note.
    const season = rule.match(SEASON)?.[1];
    if (season) rule = rule.slice(season.length).trim();
    const m = rule.match(/^((?:Mo|Tu|We|Th|Fr|Sa|Su|PH)[A-Za-z0-9,\-\[\] ]*?)\s+(\d.*)$/);
    if (!m) continue;
    const days = expandDays(m[1]);
    const note = [m[2].match(/"([^"]+)"/)?.[1], season].filter(Boolean).join(", ") || undefined;
    const times = [...m[2].replace(/"[^"]*"/g, "").matchAll(/(\d{1,2}):(\d{2})(?:-\d{1,2}:\d{2})?/g)];
    for (const d of days) for (const t of times) slots.push({ day: d, start: Number(t[1]) * 60 + Number(t[2]), note });
  }
  const seen = new Set<string>();
  return slots
    .filter((s) => {
      const k = `${s.day}|${s.start}|${s.note ?? ""}`;
      return !seen.has(k) && !!seen.add(k);
    })
    .sort((a, b) => ((a.day + 6) % 7) - ((b.day + 6) % 7) || a.start - b.start);
}

/** Back to OSM syntax: `Su 09:00 "Traditional"; Su 11:00; We 18:30`. */
export function toServiceTimes(slots: ServiceSlot[]): string {
  return slots
    .map((s) => `${DAYS[s.day]} ${String(Math.floor(s.start / 60)).padStart(2, "0")}:${String(s.start % 60).padStart(2, "0")}${s.note ? ` "${s.note.replace(/"/g, "'")}"` : ""}`)
    .join("; ");
}

/** Short tags for a listing: "Sunday morning", "Saturday evening", "Weekdays". */
export function timeTags(slots: ServiceSlot[]): string[] {
  const tags = new Set<string>();
  for (const s of slots) {
    if (s.day === 0) tags.add(s.start < 12 * 60 ? "Sunday morning" : "Sunday evening");
    else if (s.day === 6) tags.add(s.start < 12 * 60 ? "Saturday morning" : "Saturday evening");
    else if (s.day === 5 && s.start >= 16 * 60) tags.add("Friday evening");
    else if (s.day === 5 && s.start >= 11 * 60 && s.start < 15 * 60) tags.add("Friday midday");
    else tags.add("Weekdays");
  }
  const order = ["Friday midday", "Friday evening", "Saturday morning", "Saturday evening", "Sunday morning", "Sunday evening", "Weekdays"];
  return order.filter((t) => tags.has(t));
}

export const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function clock(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h < 12 ? "AM" : "PM"}`;
}

/** "Sun 8:30 AM, 10 AM · Wed 6 PM" (Sunday first). */
export function formatSlots(slots: ServiceSlot[]): string[] {
  const byDay = new Map<number, ServiceSlot[]>();
  for (const s of slots) byDay.set(s.day, [...(byDay.get(s.day) ?? []), s]);
  const order = [0, 1, 2, 3, 4, 5, 6];
  return order
    .filter((d) => byDay.has(d))
    .map((d) => `${DAY_NAMES[d]} ${byDay.get(d)!.map((s) => clock(s.start) + (s.note ? ` (${s.note})` : "")).join(", ")}`);
}

export function slotMatches(slot: ServiceSlot, pref: TimePref): boolean {
  const weekend = slot.day === 0 || slot.day === 6;
  if (pref === "weekday") return !weekend;
  if (pref === "weekend-morning") return weekend && slot.start < 12 * 60;
  return weekend && slot.start >= 12 * 60;
}
