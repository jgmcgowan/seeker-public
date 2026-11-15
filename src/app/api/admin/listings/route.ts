import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { approvedFor, cleanFields, createListing, deleteListing, listListings, listingById, reviewListing } from "@/lib/listings";
import { placeById } from "@/lib/osm";

/** GET ?status=pending&q=: listing requests and approved listings. */
export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const sp = request.nextUrl.searchParams;
  return Response.json({ listings: listListings({ status: sp.get("status") || undefined, q: sp.get("q") || undefined }) });
}

/**
 * POST {op, ...}
 * - approve / reject {id, fields?, display?, locked?}: decide a request (edits allowed).
 * - save {placeId?, id?, fields, display, locked}: the admin's own change, live right away.
 * - delete {id}: remove a listing record entirely (the map data shows again).
 */
export async function POST(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const id = Number(body.id);
  const fields = body.fields === undefined ? undefined : cleanFields(body.fields);
  const display = typeof body.display === "boolean" ? body.display : undefined;
  const locked = typeof body.locked === "boolean" ? body.locked : undefined;

  if (body.op === "approve" || body.op === "reject") {
    const l = reviewListing(id, { status: body.op === "approve" ? "approved" : "rejected", fields, display, locked });
    return l ? Response.json({ listing: l }) : Response.json({ error: "Not found" }, { status: 404 });
  }
  if (body.op === "delete") {
    deleteListing(id);
    return Response.json({ ok: true });
  }
  if (body.op === "save") {
    const placeId = typeof body.placeId === "string" && body.placeId ? body.placeId : null;
    const existing = id ? listingById(id) : placeId ? approvedFor(placeId) : null;
    if (existing && existing.status === "approved") {
      return Response.json({ listing: reviewListing(existing.id, { status: "approved", fields, display, locked }) });
    }
    const snapshot = placeId && !placeId.startsWith("listing/") ? await placeById(placeId) : null;
    const f = fields ?? {};
    if (!placeId && (!f.name || f.lat === undefined || f.lng === undefined)) {
      return Response.json({ error: "A new listing needs a name and a location." }, { status: 400 });
    }
    const newId = createListing({
      placeId,
      action: placeId ? "update" : "add",
      fields: f,
      snapshot,
      display: display ?? true,
      locked: locked ?? false,
      submitter: null,
      source: "admin",
      status: "approved",
    });
    return Response.json({ listing: listingById(newId) });
  }
  return Response.json({ error: "Unknown op" }, { status: 400 });
}
