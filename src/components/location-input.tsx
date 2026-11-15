"use client";

import { useEffect, useState } from "react";
import type { PlaceSuggestion } from "@/app/api/geocode/route";

export type Loc = { label: string; lat: number; lng: number };

type Props = { value: Loc | null; onChange: (loc: Loc | null) => void };

/**
 * Where to search from: street address + ZIP (fields browsers can autofill),
 * a city/ZIP type-ahead, or the device location.
 */
export function LocationInput({ defaultMode = "address", ...props }: Props & { defaultMode?: "address" | "city" }) {
  const [mode, setMode] = useState(defaultMode);
  return (
    <div className="space-y-2">
      {mode === "address" ? <AddressInput {...props} /> : <CityInput {...props} />}
      <button
        type="button"
        className="text-sm text-accent underline"
        onClick={() => {
          setMode(mode === "address" ? "city" : "address");
          props.onChange(null);
        }}
      >
        {mode === "address" ? "Search by city instead" : "Use a street address or ZIP instead"}
      </button>
    </div>
  );
}

function AddressInput({ value, onChange }: Props) {
  const [street, setStreet] = useState("");
  const [zip, setZip] = useState("");
  const [status, setStatus] = useState<"idle" | "looking" | "error">("idle");
  const [exact, setExact] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const zip5 = zip.match(/^\d{5}/)?.[0];

  // Look the address up once a full ZIP is there (typed or autofilled), after typing pauses.
  useEffect(() => {
    if (!zip5) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setStatus("looking");
      try {
        const res = await fetch(`/api/geocode?${new URLSearchParams({ street, zip: zip5 })}`, { signal: ctrl.signal });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Lookup failed");
        // ~100 m is plenty for distances; the street itself is never kept or put in links.
        onChange({
          label: `ZIP ${zip5}`,
          lat: Math.round(json.point.lat * 1000) / 1000,
          lng: Math.round(json.point.lng * 1000) / 1000,
        });
        setExact(!!json.exact);
        setStatus("idle");
        setError(null);
      } catch (e) {
        if (ctrl.signal.aborted) return;
        setStatus("error");
        setError(e instanceof Error ? e.message : "Lookup failed");
      }
    }, 700);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
    // onChange is a fresh function each render; the inputs are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [street, zip5]);

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-[1fr_9rem]">
        <input
          className="field"
          name="street-address"
          autoComplete="street-address"
          placeholder="Street address (optional)"
          aria-label="Street address"
          value={street}
          onChange={(e) => {
            setStreet(e.target.value);
            if (value) onChange(null);
          }}
        />
        <input
          className="field"
          name="postal-code"
          autoComplete="postal-code"
          inputMode="numeric"
          placeholder="ZIP code"
          aria-label="ZIP code"
          value={zip}
          onChange={(e) => {
            setZip(e.target.value);
            if (value) onChange(null);
          }}
        />
      </div>
      {status === "looking" && <p className="text-sm text-muted">Finding that address…</p>}
      {value && status === "idle" && (
        <p className="text-sm text-good">
          {street && exact ? "✓ Searching near that address" : `✓ Searching near ${value.label}`}
          {street && !exact && <span className="text-muted"> (we couldn&apos;t place the street, so we used the ZIP code)</span>}
        </p>
      )}
      {error && <p className="text-sm text-gold">{error}</p>}
      <LocateButton onChange={onChange} />
    </div>
  );
}

function LocateButton({ onChange }: Pick<Props, "onChange">) {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locate = () => {
    if (!navigator.geolocation) return setError("Location isn't available in this browser.");
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        // Rounded to ~1 km: enough to find nearby places, not your doorstep.
        onChange({
          label: "Near me",
          lat: Math.round(pos.coords.latitude * 100) / 100,
          lng: Math.round(pos.coords.longitude * 100) / 100,
        });
      },
      () => {
        setLocating(false);
        setError("Couldn't get your location. Type an address or city instead.");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000 },
    );
  };
  return (
    <>
      <button type="button" className="btn-ghost" onClick={locate} disabled={locating}>
        {locating ? "Locating…" : "Use my location"}
      </button>
      {error && <p className="text-sm text-gold">{error}</p>}
    </>
  );
}

/** City / ZIP type-ahead (US only). */
function CityInput({ value, onChange }: Props) {
  const [text, setText] = useState(value?.label ?? "");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);

  // Show the chosen place's label when the value changes from outside.
  const [shownLabel, setShownLabel] = useState(value?.label);
  if (value?.label !== shownLabel) {
    setShownLabel(value?.label);
    if (value) setText(value.label);
  }

  useEffect(() => {
    if (!open || text.trim().length < 2 || text === value?.label) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/geocode?q=${encodeURIComponent(text)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((j) => setSuggestions(j.suggestions ?? []))
        .catch(() => {});
    }, 250);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [text, open, value?.label]);

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <input
            className="field"
            placeholder="City or ZIP code"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setOpen(true);
              if (value) onChange(null);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            aria-label="City or ZIP code"
            autoComplete="off"
          />
          {open && suggestions.length > 0 && text !== value?.label && (
            <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
              {suggestions.map((s) => (
                <li key={s.label}>
                  <button
                    type="button"
                    className="flex w-full justify-between gap-3 px-3.5 py-2.5 text-left text-sm hover:bg-sunk"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange({ label: s.label, lat: s.lat, lng: s.lng });
                      setSuggestions([]);
                      setOpen(false);
                    }}
                  >
                    <span>{s.label}</span>
                    <span className="text-muted">{s.detail}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <LocateButton onChange={onChange} />
      </div>
    </div>
  );
}
