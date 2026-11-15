import type { NextRequest } from "next/server";
import { approvedFor, listingById } from "@/lib/listings";
import { placeById } from "@/lib/osm";
import { allow, clientIp } from "@/lib/rate-limit";
import { websiteTimes } from "@/lib/website-times";

/**
 * GET /api/times?id=node/123
 * Looks for service times on the place's own website (the one the map or its listing
 * gives), never an arbitrary URL. Results are cached for days.
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!allow(`times:${clientIp(request)}`, 80, 3_600_000)) {
    return Response.json({ error: "Too many lookups. Try again later." }, { status: 429 });
  }
  let website: string | null | undefined;
  const listingId = id.match(/^listing\/(\d+)$/)?.[1];
  if (listingId) {
    const l = listingById(Number(listingId));
    website = l?.status === "approved" ? l.fields.website : null;
  } else {
    website = approvedFor(id)?.fields.website ?? (await placeById(id))?.website;
  }
  if (!website) return Response.json({ error: "No website listed" }, { status: 404 });
  return Response.json(await websiteTimes(id, website));
}
