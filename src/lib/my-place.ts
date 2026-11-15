"use client";

import { useStored, writeStored } from "./stored";

// The user's home congregation, kept in this browser (no accounts yet).
// Its branch drives "travelling? find places like mine".

export type SavedPlace = {
  /** OSM id like "node/123", "listing/4" for a Seeker-only listing, or "custom" when typed by hand. */
  id: string;
  name: string;
  /** Branch slug from traditions.ts. */
  branch: string | null;
  address?: string;
  city?: string;
  lat?: number;
  lng?: number;
  website?: string;
  savedAt: string;
};

export function saveMyPlace(place: SavedPlace | null) {
  writeStored("seeker.myPlace", place);
}

/** The saved home congregation; null on the server and when none is saved. */
export function useMyPlace(): SavedPlace | null {
  return useStored<SavedPlace | null>("seeker.myPlace", null);
}
