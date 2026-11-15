"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";

export type MapPin = { id: string; n: number; lat: number; lng: number; title: string; kind?: "maybe" | "home" };

// Free vector tiles from OpenFreeMap (OpenStreetMap data), no API key needed.
const LIGHT = "https://tiles.openfreemap.org/styles/positron";
const DARK = "https://tiles.openfreemap.org/styles/dark";

/** Numbered pins matching the result list. Loads MapLibre only in the browser. */
export function ChurchMap({
  pins,
  center,
  onPick,
  className = "h-[340px]",
}: {
  pins: MapPin[];
  center: { lat: number; lng: number };
  onPick?: (id: string) => void;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!container.current) return;
    let map: import("maplibre-gl").Map | undefined;
    let cancelled = false;
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    import("maplibre-gl")
      .then(({ Map, Marker, NavigationControl, LngLatBounds, setWorkerUrl }) => {
        if (cancelled || !container.current) return;
        // Self-hosted worker (scripts/copy-maplibre-worker.mjs); the bundled one can't load its shared chunk.
        setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
        map = new Map({
          container: container.current,
          style: dark ? DARK : LIGHT,
          center: [center.lng, center.lat],
          zoom: 11,
          attributionControl: { compact: true },
          cooperativeGestures: true,
        });
        map.addControl(new NavigationControl({ showCompass: false }), "top-right");

        const you = document.createElement("div");
        you.className = "map-you";
        you.title = "Search center";
        new Marker({ element: you }).setLngLat([center.lng, center.lat]).addTo(map);

        for (const p of pins) {
          const el = document.createElement("button");
          el.type = "button";
          el.className = `map-pin ${p.kind ? `map-pin-${p.kind}` : ""}`;
          el.title = p.title;
          el.setAttribute("aria-label", `${p.n}. ${p.title}`);
          const label = document.createElement("span");
          label.textContent = String(p.n);
          el.appendChild(label);
          el.addEventListener("click", () => onPick?.(p.id));
          new Marker({ element: el, anchor: "bottom" }).setLngLat([p.lng, p.lat]).addTo(map);
        }

        if (pins.length) {
          const bounds = new LngLatBounds([center.lng, center.lat], [center.lng, center.lat]);
          pins.forEach((p) => bounds.extend([p.lng, p.lat]));
          map.fitBounds(bounds, { padding: 48, maxZoom: 14, duration: 0 });
        }
      })
      .catch((error) => {
        console.error("map failed to load", error);
        setFailed(true);
      });

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [pins, center.lat, center.lng, onPick]);

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-line bg-sunk ${className}`}>
      <div ref={container} className="absolute inset-0 h-full w-full" />
      {failed && (
        <p className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-muted">
          The map couldn&apos;t load. The list still works.
        </p>
      )}
    </div>
  );
}
