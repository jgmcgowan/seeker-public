import Link from "next/link";
import { GROUPS } from "@/lib/traditions";
import { HomePlaceCard } from "@/components/home-place-card";

// Reads on-device storage (saved place, answers), so it renders in the browser only.
export const instant = false;

export default function Home() {
  return (
    <div className="space-y-14">
      <section className="space-y-5 pt-6">
        <p className="text-sm font-semibold uppercase tracking-widest text-gold">For seekers, newcomers and returners</p>
        <h1 className="max-w-3xl font-display text-4xl font-semibold leading-tight sm:text-5xl">
          Explore faith at your own pace, and find a community near you.
        </h1>
        <p className="max-w-2xl text-lg text-muted">
          Seeker explains the world&apos;s faith traditions in plain language, helps you notice which
          ones speak to you, and points you to real congregations nearby. It won&apos;t tell you what to
          believe.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Link href="/explore" className="card group p-6 transition-colors hover:border-accent">
          <p className="text-sm font-semibold text-accent">I&apos;m exploring</p>
          <h2 className="mt-1 font-display text-2xl font-semibold">Take the reflection</h2>
          <p className="mt-2 text-muted">
            About ten questions on what you believe, what you&apos;re looking for, and what kind of
            gathering feels right. See traditions worth exploring, and why.
          </p>
          <span className="mt-4 inline-block text-sm font-semibold text-accent group-hover:underline">Start →</span>
        </Link>
        <Link href="/find" className="card group p-6 transition-colors hover:border-accent">
          <p className="text-sm font-semibold text-accent">I know my tradition</p>
          <h2 className="mt-1 font-display text-2xl font-semibold">Find a congregation</h2>
          <p className="mt-2 text-muted">
            New in town or travelling? Pick your tradition and denomination, set your preferences, and
            see places of worship near you with service times when they&apos;re known.
          </p>
          <span className="mt-4 inline-block text-sm font-semibold text-accent group-hover:underline">Search →</span>
        </Link>
      </section>

      <HomePlaceCard />

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-2xl font-semibold">Learn about the traditions</h2>
          <Link href="/traditions" className="text-sm font-semibold text-accent hover:underline">
            All traditions
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {GROUPS.map((g) =>
            g.slug !== "other" ? (
              <Link key={g.slug} href={`/traditions/${g.slug}`} className="card p-4 transition-colors hover:border-accent">
                <h3 className="font-display text-lg font-semibold">{g.name}</h3>
                <p className="mt-1 line-clamp-3 text-sm text-muted">{g.traditions[0].summary}</p>
              </Link>
            ) : (
              <div key={g.slug} className="card p-4">
                <h3 className="font-display text-lg font-semibold">Other traditions</h3>
                <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                  {g.traditions.map((t) => (
                    <Link key={t.slug} href={`/traditions/${t.slug}`} className="text-accent hover:underline">
                      {t.name}
                    </Link>
                  ))}
                </p>
              </div>
            ),
          )}
        </div>
      </section>

      <section className="card space-y-2 bg-sunk p-6">
        <h2 className="font-display text-xl font-semibold">Our promise</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          <li>Every tradition is described the way its own members would recognize, side by side.</li>
          <li>Suggestions are starting points for curiosity, not verdicts about you.</li>
          <li>Your answers stay in your browser. No account needed.</li>
        </ul>
      </section>
    </div>
  );
}
