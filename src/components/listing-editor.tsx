"use client";

import { useState } from "react";
import type { ListingFields } from "@/lib/listings";
import type { OsmPlace } from "@/lib/osm";
import { FaithSelect } from "@/components/faith-picker";
import { associationsForBranch } from "@/lib/associations";
import { EXTRAS } from "@/lib/preferences";
import { DAY_LABELS, parseServiceTimes, toServiceTimes, type ServiceSlot } from "@/lib/service-times";
import { findBranch } from "@/lib/traditions";

// The form for a congregation's details, used by "Add or update a listing" and by /admin.
// It edits a full draft; `changedFields` sends only what differs from the map data, so
// un-locked listings keep picking up map updates for everything else.

export type Draft = {
  name: string;
  address: string;
  zip: string;
  city: string;
  lat?: number;
  lng?: number;
  branch: string;
  association: string;
  website: string;
  phone: string;
  slots: { day: number; time: string; note: string }[];
  features: string[];
  note: string;
  display: boolean;
  locked: boolean;
};

const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

export function draftFrom(place: OsmPlace | null, fields: ListingFields = {}, flags = { display: true, locked: false }): Draft {
  const times = fields.serviceTimes ?? place?.serviceTimes ?? undefined;
  return {
    name: fields.name ?? place?.name ?? "",
    address: fields.address ?? place?.address ?? "",
    zip: "",
    city: fields.city ?? place?.city ?? "",
    lat: fields.lat ?? place?.lat,
    lng: fields.lng ?? place?.lng,
    branch: fields.branch ?? "",
    association: fields.association ?? "",
    website: fields.website ?? place?.website ?? "",
    phone: fields.phone ?? place?.phone ?? "",
    slots: parseServiceTimes(times).map((s) => ({ day: s.day, time: hhmm(s.start), note: s.note ?? "" })),
    features: fields.features ?? [],
    note: fields.note ?? "",
    display: flags.display,
    locked: flags.locked,
  };
}

function slotsOf(d: Draft): ServiceSlot[] {
  return d.slots
    .filter((s) => /^\d{2}:\d{2}$/.test(s.time))
    .map((s) => ({ day: s.day, start: Number(s.time.slice(0, 2)) * 60 + Number(s.time.slice(3)), note: s.note.trim() || undefined }));
}

/** Only the fields that differ from the map's data (everything, for a new listing). */
export function changedFields(d: Draft, place: OsmPlace | null): ListingFields {
  const out: ListingFields = {};
  const set = <K extends keyof ListingFields>(k: K, v: ListingFields[K], base: unknown) => {
    if (v !== undefined && v !== "" && v !== base) out[k] = v;
  };
  set("name", d.name.trim(), place?.name);
  set("address", d.address.trim(), place?.address ?? "");
  set("city", d.city.trim(), place?.city ?? "");
  if (d.lat !== undefined && d.lng !== undefined && (!place || Math.abs(d.lat - place.lat) > 1e-5 || Math.abs(d.lng - place.lng) > 1e-5)) {
    out.lat = d.lat;
    out.lng = d.lng;
  }
  set("website", d.website.trim(), place?.website ?? "");
  set("phone", d.phone.trim(), place?.phone ?? "");
  const times = toServiceTimes(slotsOf(d));
  if (times !== toServiceTimes(parseServiceTimes(place?.serviceTimes ?? undefined))) out.serviceTimes = times || undefined;
  if (d.branch) {
    out.branch = d.branch;
    const religion = findBranch(d.branch)?.branch.osm.religion[0];
    if (religion && religion !== place?.religion) out.religion = religion;
  }
  if (d.association.trim()) out.association = d.association.trim();
  if (d.features.length) out.features = d.features;
  if (d.note.trim()) out.note = d.note.trim();
  return out;
}

export function ListingEditor({
  draft,
  onChange,
  isNew,
  admin,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
  isNew?: boolean;
  admin?: boolean;
}) {
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const set = (patch: Partial<Draft>) => onChange({ ...draft, ...patch });
  const associations = draft.branch ? associationsForBranch(draft.branch) : [];
  const customAssociation = !!draft.association && !associations.some((a) => a.slug === draft.association);

  const locate = async () => {
    const zip = draft.zip.match(/\d{5}/)?.[0] ?? draft.address.match(/\b\d{5}\b/)?.[0];
    if (!zip) return setLocError("Add the ZIP code so we can place it on the map.");
    setLocating(true);
    setLocError(null);
    try {
      const street = draft.address.split(",")[0];
      const res = await fetch(`/api/geocode?${new URLSearchParams({ street, zip })}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Lookup failed");
      set({ lat: json.point.lat, lng: json.point.lng });
      if (!json.exact) setLocError("We couldn't find the street, so the pin is at the ZIP code's center.");
    } catch (e) {
      setLocError(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setLocating(false);
    }
  };

  return (
    <div className="space-y-5">
      <Field label="Congregation name" id="l-name">
        <input id="l-name" className="field" value={draft.name} onChange={(e) => set({ name: e.target.value })} required />
      </Field>

      <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
        <Field label="Street address" id="l-address">
          <input id="l-address" className="field" value={draft.address} onChange={(e) => set({ address: e.target.value })} placeholder="123 Main St, Springfield, TN" />
        </Field>
        <Field label="ZIP" id="l-zip">
          <input id="l-zip" className="field" inputMode="numeric" value={draft.zip} onChange={(e) => set({ zip: e.target.value })} />
        </Field>
      </div>
      <div className="-mt-2 flex flex-wrap items-center gap-3 text-sm">
        <button type="button" className="btn-ghost py-1.5" onClick={locate} disabled={locating}>
          {locating ? "Finding…" : isNew || draft.lat === undefined ? "Find it on the map" : "Move the pin to this address"}
        </button>
        {draft.lat !== undefined && draft.lng !== undefined && (
          <span className="text-good">
            ✓ On the map at {draft.lat.toFixed(4)}, {draft.lng.toFixed(4)}
          </span>
        )}
        {locError && <span className="text-gold">{locError}</span>}
      </div>

      <Field label="Tradition and denomination" id="l-branch">
        <FaithSelect id="l-branch" value={draft.branch} onChange={(branch) => set({ branch, association: "" })} />
      </Field>

      {draft.branch && (
        <Field label="Part of a larger body? (convention, synod, diocese, network)" id="l-assoc">
          <select
            id="l-assoc"
            className="field"
            value={customAssociation ? "__other" : draft.association}
            onChange={(e) => set({ association: e.target.value === "__other" ? " " : e.target.value })}
          >
            <option value="">None or independent</option>
            {associations.map((a) => (
              <option key={a.slug} value={a.slug}>
                {a.name}
              </option>
            ))}
            <option value="__other">Another one…</option>
          </select>
          {customAssociation && (
            <input
              className="field mt-2"
              placeholder="e.g. Diocese of Springfield, Baptist General Convention of Texas"
              value={draft.association.trim()}
              onChange={(e) => set({ association: e.target.value || " " })}
            />
          )}
        </Field>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Website" id="l-web">
          <input id="l-web" className="field" type="url" inputMode="url" value={draft.website} onChange={(e) => set({ website: e.target.value })} placeholder="https://" />
        </Field>
        <Field label="Phone" id="l-phone">
          <input id="l-phone" className="field" type="tel" value={draft.phone} onChange={(e) => set({ phone: e.target.value })} />
        </Field>
      </div>

      <div>
        <span className="label">Service times</span>
        <div className="space-y-2">
          {draft.slots.map((s, i) => (
            <div key={i} className="grid grid-cols-[1fr_7rem] gap-2 sm:grid-cols-[10rem_8rem_1fr_auto]">
              <select
                aria-label="Day"
                className="field"
                value={s.day}
                onChange={(e) => set({ slots: draft.slots.map((x, j) => (j === i ? { ...x, day: Number(e.target.value) } : x)) })}
              >
                {DAY_LABELS.map((d, k) => (
                  <option key={d} value={k}>
                    {d}
                  </option>
                ))}
              </select>
              <input
                aria-label="Time"
                type="time"
                className="field"
                value={s.time}
                onChange={(e) => set({ slots: draft.slots.map((x, j) => (j === i ? { ...x, time: e.target.value } : x)) })}
              />
              <input
                aria-label="Label"
                className="field col-span-2 sm:col-span-1"
                placeholder="Label (optional): Traditional, Spanish, Vigil…"
                value={s.note}
                onChange={(e) => set({ slots: draft.slots.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)) })}
              />
              <button type="button" className="text-sm text-muted underline" onClick={() => set({ slots: draft.slots.filter((_, j) => j !== i) })}>
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="btn-ghost py-1.5" onClick={() => set({ slots: [...draft.slots, { day: 0, time: "10:00", note: "" }] })}>
            + Add a service time
          </button>
        </div>
      </div>

      <div>
        <span className="label">What you offer (shown as tags)</span>
        <div className="flex flex-wrap gap-2">
          {EXTRAS.map((x) => (
            <button
              key={x.id}
              type="button"
              className={`chip ${draft.features.includes(x.id) ? "chip-on" : ""}`}
              aria-pressed={draft.features.includes(x.id)}
              onClick={() => set({ features: draft.features.includes(x.id) ? draft.features.filter((f) => f !== x.id) : [...draft.features, x.id] })}
            >
              {x.label}
            </button>
          ))}
        </div>
      </div>

      <Field label="Short note for visitors (optional)" id="l-note">
        <textarea id="l-note" className="field" rows={2} maxLength={300} value={draft.note} onChange={(e) => set({ note: e.target.value })} placeholder="e.g. Free parking behind the building. Livestream at 10 AM." />
      </Field>

      <fieldset className="space-y-3 rounded-xl border border-line p-4">
        <legend className="px-1 text-sm font-semibold">Listing settings</legend>
        <Toggle
          checked={draft.display}
          onChange={(display) => set({ display })}
          label="Show this listing on Seeker"
          help="Turn off to take the congregation off Seeker's search results and map."
        />
        <Toggle
          checked={draft.locked}
          onChange={(locked) => set({ locked })}
          label="Don't update or delete automatically"
          help={
            admin
              ? "Locked: weekly map refreshes never change or remove these details."
              : "Keeps these details exactly as approved, even if the public map data changes or the place is removed from it. Only the site admin can change a locked listing."
          }
        />
      </fieldset>
    </div>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange, label, help }: { checked: boolean; onChange: (v: boolean) => void; label: string; help: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--color-accent)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-sm text-muted">{help}</span>
      </span>
    </label>
  );
}
