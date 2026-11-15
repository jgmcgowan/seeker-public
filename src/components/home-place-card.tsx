"use client";

import Link from "next/link";
import { useMyPlace } from "@/lib/my-place";
import { findBranch } from "@/lib/traditions";
import { TravelSearch } from "./travel-search";

/** Landing-page card: "travelling? find places like your home congregation", or an invite to save one. */
export function HomePlaceCard() {
  const place = useMyPlace();
  const ref = findBranch(place?.branch);

  if (!place) {
    return (
      <section className="card flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold">Already have a home congregation?</h2>
          <p className="text-sm text-muted">
            Save it once. When you travel, Seeker jumps straight to similar places and their service times.
          </p>
        </div>
        <Link href="/my-place" className="btn-ghost shrink-0">
          Save my place
        </Link>
      </section>
    );
  }

  return (
    <section className="card space-y-4 border-gold bg-gold-soft p-6">
      <div>
        <p className="text-sm font-semibold text-gold">Travelling?</p>
        <h2 className="font-display text-xl font-semibold">Find places like {place.name}</h2>
        <p className="text-sm text-muted">
          {ref ? `Searching for ${ref.branch.name} (${ref.tradition.name}) congregations.` : "Set its denomination on My place to search for similar ones."}{" "}
          <Link href="/my-place" className="underline">
            Change
          </Link>
        </p>
      </div>
      {ref && <TravelSearch branch={ref.branch.slug} />}
    </section>
  );
}
