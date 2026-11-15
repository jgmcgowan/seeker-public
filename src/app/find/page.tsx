import type { Metadata } from "next";
import { Suspense } from "react";
import { ClientOnly } from "@/components/client-only";
import { Finder } from "./finder";

// Reads on-device storage (saved place, answers), so it renders in the browser only.
export const instant = false;

export const metadata: Metadata = { title: "Find a place" };

export default function FindPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <ClientOnly>
        <Finder />
      </ClientOnly>
    </Suspense>
  );
}
