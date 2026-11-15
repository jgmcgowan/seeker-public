/** Search radius stops; any whole number of miles between the ends is allowed. */
export const MILE_STOPS = [5, 10, 25, 50, 100];
export const MIN_MILES = MILE_STOPS[0];
export const MAX_MILES = MILE_STOPS[MILE_STOPS.length - 1];

export function clampMiles(n: number) {
  return Number.isFinite(n) ? Math.min(MAX_MILES, Math.max(MIN_MILES, Math.round(n))) : 10;
}
