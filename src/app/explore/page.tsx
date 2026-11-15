import type { Metadata } from "next";
import { ClientOnly } from "@/components/client-only";
import { Explore } from "./explore";

// Reads on-device storage (saved place, answers), so it renders in the browser only.
export const instant = false;

export const metadata: Metadata = { title: "Explore" };

export default function ExplorePage() {
  return (
    <ClientOnly>
      <Explore />
    </ClientOnly>
  );
}
