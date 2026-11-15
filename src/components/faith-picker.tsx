"use client";

import { ADJECTIVE, GROUPS, resolveScope, type GroupSlug } from "@/lib/traditions";

/**
 * Options for one group. Christianity, Judaism and Islam list their branches;
 * "Other" lists each tradition (with its branches when it has several).
 */
function GroupOptions({ group, broad }: { group: (typeof GROUPS)[number]; broad: boolean }) {
  if (group.slug !== "other") {
    const t = group.traditions[0];
    return (
      <>
        {broad && <option value={group.slug}>All {ADJECTIVE[group.slug]}</option>}
        {t.branches.map((b) => (
          <option key={b.slug} value={b.slug}>
            {b.name}
          </option>
        ))}
      </>
    );
  }
  return (
    <>
      {broad && <option value="other">All other traditions</option>}
      {group.traditions.map((t) =>
        t.branches.length === 1 ? (
          <option key={t.slug} value={t.branches[0].slug}>
            {t.name}
          </option>
        ) : (
          <optgroup key={t.slug} label={t.name}>
            {broad && <option value={t.slug}>All {ADJECTIVE[t.slug] ?? t.name}</option>}
            {t.branches.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.name}
              </option>
            ))}
          </optgroup>
        ),
      )}
    </>
  );
}

/** Every branch in one menu, grouped as Christianity / Judaism / Islam / Other. */
export function FaithSelect({
  value,
  onChange,
  id,
  broad = false,
}: {
  value: string;
  onChange: (v: string) => void;
  id?: string;
  /** Also offer "All Christian", "All Buddhist"… */
  broad?: boolean;
}) {
  return (
    <select id={id} className="field" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Choose…</option>
      {GROUPS.map((g) => (
        <optgroup key={g.slug} label={g.name}>
          <GroupOptions group={g} broad={broad} />
        </optgroup>
      ))}
    </select>
  );
}

/** Finder picker: four group chips, then a menu for that group. */
export function FaithPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const current = resolveScope(value)?.group.slug;
  const pick = (g: GroupSlug) => onChange(g);
  const group = GROUPS.find((g) => g.slug === current);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Tradition">
        {GROUPS.map((g) => (
          <button key={g.slug} type="button" className={`chip ${current === g.slug ? "chip-on" : ""}`} aria-pressed={current === g.slug} onClick={() => pick(g.slug)}>
            {g.name}
          </button>
        ))}
      </div>
      {group && (
        <select id="branch" aria-label="Denomination" className="field" value={value} onChange={(e) => onChange(e.target.value)}>
          <GroupOptions group={group} broad />
        </select>
      )}
    </div>
  );
}
