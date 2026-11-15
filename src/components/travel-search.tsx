"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LocationInput, type Loc } from "./location-input";

/** "Where are you headed?" → the finder, already searching for the saved branch. */
export function TravelSearch({ branch }: { branch: string }) {
  const router = useRouter();
  const [loc, setLoc] = useState<Loc | null>(null);
  return (
    <div className="space-y-2">
      <label className="label">Where are you headed?</label>
      <LocationInput
        defaultMode="city"
        value={loc}
        onChange={(l) => {
          setLoc(l);
          if (l) router.push(`/find?${new URLSearchParams({ branch, lat: String(l.lat), lng: String(l.lng), near: l.label })}`);
        }}
      />
    </div>
  );
}
