import type { Metadata } from "next";
import Link from "next/link";
import { ScriptureSection } from "@/components/scripture-section";
import { SCRIPTURES } from "@/lib/scriptures";
import { findTradition } from "@/lib/traditions";

export const metadata: Metadata = {
  title: "Scriptures",
  description: "The Bible, the Torah, the Quran and the sacred texts of other traditions, with the editions congregations use and free apps to read them.",
};

export default function ScripturesPage() {
  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <h1 className="font-display text-4xl font-semibold">Scriptures and sacred texts</h1>
        <p className="max-w-3xl text-muted">
          What each tradition reads, the editions and translations you&apos;re likely to see in a service, and free
          places to read them. Listed in no order of preference. Many congregations lend copies, so you never need to
          buy one before a first visit.
        </p>
        <nav className="flex flex-wrap gap-2 text-sm">
          {SCRIPTURES.map((s) => (
            <a key={s.tradition} href={`#${s.tradition}`} className="chip">
              {findTradition(s.tradition)?.name}
            </a>
          ))}
        </nav>
      </header>
      {SCRIPTURES.map((s) => {
        const t = findTradition(s.tradition);
        return (
          <section key={s.tradition} id={s.tradition} className="scroll-mt-6 space-y-4 border-t border-line pt-8">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-2xl font-semibold">{t?.name}</h2>
              <Link href={`/traditions/${s.tradition}`} className="text-sm text-accent hover:underline">
                About {t?.name} →
              </Link>
            </div>
            <ScriptureSection s={s} heading="h3" />
          </section>
        );
      })}
      <p className="text-sm text-muted">
        App features and prices change; we only call something free where its publisher does. Know a free reader we
        should add? <Link className="underline" href="/contact">Tell us</Link>.
      </p>
    </div>
  );
}
