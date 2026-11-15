import type { Metadata } from "next";
import Link from "next/link";
import { GROUPS } from "@/lib/traditions";

export const metadata: Metadata = { title: "Traditions" };

export default function TraditionsPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-display text-4xl font-semibold">Faith traditions</h1>
        <p className="max-w-2xl text-muted">
          Listed in no order of preference. Each page covers core ideas, what worship is like, and what to
          expect on a first visit, branch by branch.
        </p>
      </header>
      <div className="space-y-4">
        {GROUPS.filter((g) => g.slug !== "other").map((g) => {
          const t = g.traditions[0];
          return (
            <Link key={t.slug} href={`/traditions/${t.slug}`} className="card block p-5 transition-colors hover:border-accent">
              <h2 className="font-display text-2xl font-semibold">{t.name}</h2>
              <p className="mt-1 text-muted">{t.summary}</p>
              {t.branches.length > 1 && (
                <p className="mt-3 flex flex-wrap gap-2">
                  {t.branches.map((b) => (
                    <span key={b.slug} className="rounded-full bg-sunk px-2.5 py-1 text-xs text-muted">
                      {b.name}
                    </span>
                  ))}
                </p>
              )}
            </Link>
          );
        })}
      </div>
      <section id="other" className="scroll-mt-6 space-y-3">
        <h2 className="font-display text-2xl font-semibold">Other traditions</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {GROUPS.find((g) => g.slug === "other")!.traditions.map((t) => (
            <Link key={t.slug} href={`/traditions/${t.slug}`} className="card p-4 transition-colors hover:border-accent">
              <h3 className="font-display text-lg font-semibold">{t.name}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-muted">{t.summary}</p>
            </Link>
          ))}
        </div>
      </section>
      <p className="text-sm text-muted">
        Not listed here: many other living traditions, including Indigenous and Native American spiritual
        ways, Shinto, Taoism, Zoroastrianism and earth-based paths. Some are practiced within families and
        nations rather than open congregations, so we haven&apos;t tried to map them.
      </p>
    </div>
  );
}
