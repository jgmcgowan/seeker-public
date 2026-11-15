"use client";

import { toggleFavorite, useFavorites, type Favorite } from "@/lib/favorites";

/** Heart toggle that saves a place to favorites in this browser. */
export function FavoriteButton({ place, className = "" }: { place: Omit<Favorite, "savedAt">; className?: string }) {
  const saved = useFavorites().some((f) => f.id === place.id);
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${place.name} from favorites` : `Save ${place.name} to favorites`}
      title={saved ? "Saved to favorites" : "Save to favorites"}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors ${
        saved ? "border-gold bg-gold-soft text-gold" : "border-line text-muted hover:bg-sunk hover:text-ink"
      } ${className}`}
      onClick={() => toggleFavorite({ ...place, savedAt: new Date().toISOString() })}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
        <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.3 3 4.5 6.7 4.5c2.1 0 3.6 1.1 5.3 3 1.7-1.9 3.2-3 5.3-3 3.7 0 5.8 3.8 4.3 7.3C19.5 16.4 12 21 12 21z" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
