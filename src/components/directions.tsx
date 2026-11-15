/** Directions in Google Maps or Apple Maps (opens the app on phones that have it). */
export function Directions({
  name,
  address,
  lat,
  lng,
  className = "",
}: {
  name: string;
  address?: string | null;
  lat?: number;
  lng?: number;
  className?: string;
}) {
  const hasPoint = lat !== undefined && lng !== undefined && (lat !== 0 || lng !== 0);
  if (!hasPoint && !address) return null;
  const destination = address ? `${name}, ${address}` : `${lat},${lng}`;
  const google = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
  const apple = `https://maps.apple.com/?${new URLSearchParams({
    daddr: hasPoint ? `${lat},${lng}` : destination,
    q: name,
    ...(hasPoint ? { ll: `${lat},${lng}` } : {}),
  })}`;
  return (
    <span className={`inline-flex flex-wrap items-center gap-x-2 ${className}`}>
      <span className="text-muted">Directions:</span>
      <a className="font-semibold text-accent hover:underline" href={google} target="_blank" rel="noreferrer">
        Google Maps
      </a>
      <span className="text-muted" aria-hidden>
        ·
      </span>
      <a className="font-semibold text-accent hover:underline" href={apple} target="_blank" rel="noreferrer">
        Apple Maps
      </a>
    </span>
  );
}
