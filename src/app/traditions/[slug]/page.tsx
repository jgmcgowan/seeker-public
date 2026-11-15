import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { associationsForBranch } from "@/lib/associations";
import { ScriptureSection } from "@/components/scripture-section";
import { scripturesFor } from "@/lib/scriptures";
import { TRADITIONS, findTradition } from "@/lib/traditions";

export function generateStaticParams() {
  return TRADITIONS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: PageProps<"/traditions/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: findTradition(slug)?.name ?? "Tradition" };
}

export default async function TraditionPage({ params }: PageProps<"/traditions/[slug]">) {
  const { slug } = await params;
  const t = findTradition(slug);
  if (!t) notFound();
  const texts = scripturesFor(t.slug);

  return (
    <article className="space-y-10">
      <header className="space-y-3">
        <Link href="/traditions" className="text-sm text-muted hover:text-ink">
          ← All traditions
        </Link>
        <h1 className="font-display text-4xl font-semibold">{t.name}</h1>
        <p className="max-w-3xl text-lg">{t.summary}</p>
        <p className="max-w-3xl text-muted">{t.origins}</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-2 font-display text-lg font-semibold">Core ideas</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {t.coreIdeas.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
        <div className="card p-5">
          <h2 className="mb-2 font-display text-lg font-semibold">Common practices</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {t.practices.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted">{t.usNote}</p>
        </div>
      </section>

      {texts && (
        <section id="texts" className="scroll-mt-6 space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-2xl font-semibold">Sacred texts</h2>
            <Link href="/scriptures" className="text-sm text-accent hover:underline">
              All traditions&apos; scriptures →
            </Link>
          </div>
          <ScriptureSection s={texts} />
        </section>
      )}

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-semibold">
          {t.branches.length > 1 ? "Branches and communities" : "Visiting a local community"}
        </h2>
        {t.branches.map((b) => (
          <div key={b.slug} id={b.slug} className="card scroll-mt-6 space-y-3 p-5">
            <div>
              <h3 className="font-display text-xl font-semibold">{b.name}</h3>
              {b.aka && <p className="text-sm text-muted">{b.aka}</p>}
            </div>
            <p>{b.summary}</p>
            <p className="text-sm">
              <span className="font-semibold">Beliefs: </span>
              {b.beliefs}
            </p>
            <p className="text-sm">
              <span className="font-semibold">Worship: </span>
              {b.worship}
            </p>
            <div className="rounded-xl bg-gold-soft p-4 text-sm">
              <p className="mb-1 font-semibold">On a first visit</p>
              <ul className="list-disc space-y-1 pl-5">
                {b.firstVisit.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
            {associationsForBranch(b.slug).length > 0 && (
              <p className="text-sm">
                <span className="font-semibold">Larger bodies you&apos;ll see on listings: </span>
                {associationsForBranch(b.slug)
                  .map((a) => a.name)
                  .join(", ")}
              </p>
            )}
            <Link href={`/find?branch=${b.slug}`} className="btn-ghost">
              Find a {t.place} near me
            </Link>
          </div>
        ))}
      </section>
    </article>
  );
}
