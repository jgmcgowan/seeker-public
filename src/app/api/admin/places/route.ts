import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { approvedFor } from "@/lib/listings";
import { placeById, searchPlacesByName } from "@/lib/osm";

/** GET ?id=node/123 or ?q=name[&lat=&lng=]: find map places to edit. */
export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const sp = request.nextUrl.searchParams;
  const id = sp.get("id");
  if (id) {
    const place = await placeById(id);
    return Response.json({ places: place ? [{ place, listing: approvedFor(place.id) }] : [] });
  }
  const q = sp.get("q")?.trim() ?? "";
  if (q.length < 3) return Response.json({ error: "Type at least 3 letters." }, { status: 400 });
  const lat = Number(sp.get("lat"));
  const lng = Number(sp.get("lng"));
  const near = sp.get("lat") && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined;
  const places = searchPlacesByName(q, near).map((place) => ({ place, listing: approvedFor(place.id) }));
  return Response.json({ places });
}
