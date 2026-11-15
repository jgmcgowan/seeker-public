import type { Metadata } from "next";
import { Suspense } from "react";
import { ClientOnly } from "@/components/client-only";
import { ListingRequest } from "./listing-request";

export const instant = false;

export const metadata: Metadata = {
  title: "Add or update a listing",
  description: "Add your congregation to Seeker, correct its details and service times, or ask us to remove it.",
};

export default function ListingPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <ClientOnly>
        <ListingRequest />
      </ClientOnly>
    </Suspense>
  );
}
