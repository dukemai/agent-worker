import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type CreateTripShareBody = {
  tripId?: unknown;
  title?: unknown;
};

const TRIP_SHARE_COLUMNS = "id, public_slug, trip_id, title, disabled_at, created_at, updated_at";

function cleanTitle(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().slice(0, 200) : "";
}

export async function GET() {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  const readSupabase = createServiceRoleClient() ?? auth.supabase;

  const { data: links, error } = await readSupabase
    .from("trip_share_links")
    .select(TRIP_SHARE_COLUMNS)
    .eq("user_id", auth.user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return errorResponse(error.message, 500);
  }

  return NextResponse.json({ links: links ?? [] });
}

export async function POST(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  let body: CreateTripShareBody;
  try {
    body = (await request.json()) as CreateTripShareBody;
  } catch {
    return errorResponse("Expected JSON body", 400);
  }

  const tripId = typeof body.tripId === "string" ? body.tripId.trim() : "";
  const title = cleanTitle(body.title);
  if (!tripId) {
    return errorResponse("tripId is required", 400);
  }

  const { data: trip, error: tripError } = await auth.supabase
    .from("trips")
    .select("id, title")
    .eq("id", tripId)
    .maybeSingle();

  if (tripError) {
    return errorResponse(tripError.message, 500);
  }
  if (!trip) {
    return errorResponse("Trip not found", 404);
  }

  const writeSupabase = createServiceRoleClient() ?? auth.supabase;

  const { data: existing, error: existingError } = await writeSupabase
    .from("trip_share_links")
    .select(TRIP_SHARE_COLUMNS)
    .eq("user_id", auth.user.id)
    .eq("trip_id", tripId)
    .is("disabled_at", null)
    .maybeSingle();

  if (existingError) {
    return errorResponse(existingError.message, 500);
  }
  if (existing) {
    return NextResponse.json({ link: existing, reused: true });
  }

  const { data: link, error } = await writeSupabase
    .from("trip_share_links")
    .insert({
      user_id: auth.user.id,
      trip_id: tripId,
      title: title || trip.title || "Shared trip",
    })
    .select(TRIP_SHARE_COLUMNS)
    .single();

  if (error || !link) {
    return errorResponse(error?.message ?? "Failed to create share link", 500);
  }

  return NextResponse.json({ link, reused: false });
}
