"use client";

import type { SavedPlace } from "./my-place";
import { readStored, useStored, writeStored } from "./stored";

// Places someone wants to remember ("try next Sunday"), kept in this browser.

export type Favorite = SavedPlace & { label?: string; phone?: string };

const KEY = "seeker.favorites";
const EMPTY: Favorite[] = [];

export function useFavorites(): Favorite[] {
  return useStored<Favorite[]>(KEY, EMPTY);
}

export function toggleFavorite(place: Favorite) {
  const list = readStored<Favorite[]>(KEY, []);
  writeStored(KEY, list.some((f) => f.id === place.id) ? list.filter((f) => f.id !== place.id) : [place, ...list].slice(0, 100));
}

export function removeFavorite(id: string) {
  writeStored(KEY, readStored<Favorite[]>(KEY, []).filter((f) => f.id !== id));
}
