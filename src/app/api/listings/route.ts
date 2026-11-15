import type { NextRequest } from "next/server";
import { LISTING_ROLES as ROLES } from "@/lib/contact";
import { approvedFor, cleanFields, createListing, listingById, type Listing } from "@/lib/listings";
import { notifyOwner } from "@/lib/notify";
import { placeById, type OsmPlace } from "@/lib/osm";
import { allow, clientIp, sameOrigin } from "@/lib/rate-limit";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type ListingLookup = {
  place: OsmPlace | null;
  /** The current approved listing's public parts. */
  listing: Pick<Listing, "fields" | "display" | "locked" | "updatedAt"> | null;
};

/** GET /api/listings?place=node/123: what we know about a place, to prefill the form. */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("place") ?? "";
  const listingId = id.match(/^listing\/(\d+)$/)?.[1];
  const listing = listingId ? listingById(Number(listingId)) : approvedFor(id);
  const visible = listing?.status === "approved" ? listing : null;
  const place = listingId ? null : await placeById(id);
  if (!place && !visible) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({
    place,
    listing: visible && { fields: visible.fields, display: visible.display, locked: visible.locked, updatedAt: visible.updatedAt },
  } satisfies ListingLookup);
}

/**
 * POST /api/listings: a congregation asks to add, update or remove a listing.
 * {action, placeId?, fields, display, locked, submitter: {name,email,role,message}, website (honeypot)}
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (typeof body.website === "string" && body.website) return Response.json({ ok: true });
  const action = body.action === "add" || body.action === "remove" ? body.action : "update";
  const sub = (body.submitter ?? {}) as Record<string, unknown>;
  const submitter = {
    name: String(sub.name ?? "").trim().slice(0, 120),
    email: String(sub.email ?? "").trim().slice(0, 200),
    role: ROLES.includes(String(sub.role)) ? String(sub.role) : "Other",
    message: String(sub.message ?? "").trim().slice(0, 2000) || undefined,
  };
  if (!submitter.name || !EMAIL.test(submitter.email)) {
    return Response.json({ error: "Please add your name and a valid email so we can confirm the change." }, { status: 400 });
  }
  const fields = cleanFields(body.fields);
  let placeId: string | null = typeof body.placeId === "string" && body.placeId ? body.placeId : null;
  let snapshot: OsmPlace | null = null;
  if (action !== "add") {
    if (!placeId) return Response.json({ error: "Which listing is this about?" }, { status: 400 });
    if (!placeId.startsWith("listing/")) {
      snapshot = await placeById(placeId);
      if (!snapshot) return Response.json({ error: "We couldn't find that place." }, { status: 404 });
    }
  } else {
    placeId = null;
    if (!fields.name || fields.lat === undefined || fields.lng === undefined) {
      return Response.json({ error: "Add the congregation's name and find its address on the map." }, { status: 400 });
    }
  }
  if (!allow(`listing:${clientIp(request)}`, 8, 3_600_000) || !allow("listing:all", 200, 3_600_000)) {
    return Response.json({ error: "Too many requests right now. Please try again later." }, { status: 429 });
  }
  const id = createListing({
    placeId,
    action,
    fields,
    snapshot,
    display: action === "remove" ? false : body.display !== false,
    locked: body.locked === true,
    submitter,
    source: "public",
    status: "pending",
  });
  const name = fields.name ?? snapshot?.name ?? placeId;
  await notifyOwner(
    `Seeker listing request: ${action} ${name}`,
    `${submitter.name} (${submitter.role}, ${submitter.email}) asked to ${action} "${name}".\n\n${submitter.message ?? ""}\n\nReview it in the admin panel (request #${id}).`,
    submitter.email,
  );
  return Response.json({ ok: true, id });
}
