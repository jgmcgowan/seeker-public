import type { Scriptures } from "@/lib/scriptures";

/** A tradition's sacred texts, common editions and free places to read them. */
export function ScriptureSection({ s, heading = "h2" }: { s: Scriptures; heading?: "h2" | "h3" }) {
  const H = heading;
  const Sub = heading === "h2" ? "h3" : "h4";
  return (
    <div className="space-y-4">
      <p className="max-w-3xl">{s.intro}</p>
      <div className="grid gap-4 md:grid-cols-2">
        {s.texts.map((t) => (
          <div key={t.name} className="card space-y-2 p-5">
            <Sub className="font-display text-lg font-semibold">{t.name}</Sub>
            {t.original && <p className="text-xs text-muted">Original language: {t.original}</p>}
            <p className="text-sm">{t.about}</p>
            {t.editions && (
              <ul className="space-y-1 pt-1 text-sm">
                {t.editions.map((e) => (
                  <li key={e.name}>
                    <span className="font-semibold">{e.name}</span>
                    <span className="text-muted"> · {e.note}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      <div className="rounded-xl bg-gold-soft p-4">
        <H className="mb-2 text-sm font-semibold">Read free online or in an app</H>
        <ul className="space-y-1.5 text-sm">
          {s.readers.map((r) => (
            <li key={r.name}>
              <a className="font-semibold text-accent hover:underline" href={r.url} target="_blank" rel="noreferrer">
                {r.name}
              </a>{" "}
              <span>· {r.note}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
