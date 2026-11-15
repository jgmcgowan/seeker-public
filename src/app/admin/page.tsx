import type { Metadata } from "next";
import { ClientOnly } from "@/components/client-only";
import { Admin } from "./admin";

export const instant = false;

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default function AdminPage() {
  return (
    <ClientOnly fallback={<p className="text-muted">Loading…</p>}>
      <Admin />
    </ClientOnly>
  );
}
