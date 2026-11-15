"use client";

import { MAX_MILES, MILE_STOPS, MIN_MILES, clampMiles } from "@/lib/miles";

// Search radius slider from 5 to 100 miles. The stops sit evenly along the track (so 5, 10 and 25
// aren't crammed together) and the thumb clicks into a stop when dragged near it.

const SPAN = 1000;
const SEGMENT = SPAN / (MILE_STOPS.length - 1);
/** How close (in track units out of 1000) a drag must come to a stop to click into it. */
const SNAP = 35;

function toPos(miles: number) {
  let i = 0;
  while (i < MILE_STOPS.length - 2 && miles > MILE_STOPS[i + 1]) i++;
  const [a, b] = [MILE_STOPS[i], MILE_STOPS[i + 1]];
  return (i + (miles - a) / (b - a)) * SEGMENT;
}

function toMiles(pos: number) {
  const i = Math.min(MILE_STOPS.length - 2, Math.floor(pos / SEGMENT));
  const [a, b] = [MILE_STOPS[i], MILE_STOPS[i + 1]];
  return Math.round(a + ((pos - i * SEGMENT) / SEGMENT) * (b - a));
}

function click() {
  try {
    navigator.vibrate?.(8);
  } catch {}
}

export function MilesDial({ value, onChange }: { value: number; onChange: (miles: number) => void }) {
  const set = (miles: number) => {
    if (miles === value) return;
    if (MILE_STOPS.includes(miles)) click();
    onChange(miles);
  };

  const onDrag = (pos: number) => {
    const stop = MILE_STOPS.findIndex((_, i) => Math.abs(pos - i * SEGMENT) <= SNAP);
    set(stop >= 0 ? MILE_STOPS[stop] : toMiles(pos));
  };

  // Keys move a mile at a time (no snapping, or arrows could never leave a stop); Page keys jump stops.
  const onKey = (e: React.KeyboardEvent) => {
    const next = MILE_STOPS.find((s) => s > value) ?? MAX_MILES;
    const prev = [...MILE_STOPS].reverse().find((s) => s < value) ?? MIN_MILES;
    const to: Record<string, number> = {
      ArrowRight: value + 1,
      ArrowUp: value + 1,
      ArrowLeft: value - 1,
      ArrowDown: value - 1,
      PageUp: next,
      PageDown: prev,
      Home: MIN_MILES,
      End: MAX_MILES,
    };
    if (!(e.key in to)) return;
    e.preventDefault();
    set(clampMiles(to[e.key]));
  };

  return (
    <div>
      <input
        type="range"
        min={0}
        max={SPAN}
        step={1}
        value={toPos(value)}
        onChange={(e) => onDrag(Number(e.target.value))}
        onKeyDown={onKey}
        aria-label="Search radius"
        aria-valuetext={`${value} miles`}
        className="w-full cursor-pointer accent-accent"
      />
      <div className="relative mx-2 h-5 text-xs text-muted">
        {MILE_STOPS.map((s, i) => (
          <button
            key={s}
            type="button"
            tabIndex={-1}
            onClick={() => set(s)}
            className={`absolute -translate-x-1/2 px-1 hover:text-ink ${s === value ? "font-semibold text-accent" : ""}`}
            style={{ left: `${(i / (MILE_STOPS.length - 1)) * 100}%` }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
