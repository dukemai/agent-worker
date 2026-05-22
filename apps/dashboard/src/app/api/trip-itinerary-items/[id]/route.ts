import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { cleanText, isOneOf, TRIP_ITINERARY_BLOCKS } from "@/lib/trip-ops";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) return auth.error;

  const { id } = await params;
  const payload = await request.json();
  const updates: Record<string, unknown> = {};

  if (payload.day_number !== undefined) {
    if (!Number.isInteger(payload.day_number) || payload.day_number < 1 || payload.day_number > 30) {
      return errorResponse("day_number must be between 1 and 30");
    }
    updates.day_number = payload.day_number;
  }

  if (payload.block !== undefined) {
    if (!isOneOf(payload.block, TRIP_ITINERARY_BLOCKS)) return errorResponse("Invalid itinerary block");
    updates.block = payload.block;
  }

  if (payload.notes !== undefined) {
    const value = cleanText(payload.notes, 2000);
    if (value === undefined) return errorResponse("notes must be a string or null");
    updates.notes = value;
  }

  if (payload.sort_order !== undefined) {
    if (!Number.isInteger(payload.sort_order)) return errorResponse("sort_order must be an integer");
    updates.sort_order = payload.sort_order;
  }

  if (Object.keys(updates).length === 0) return errorResponse("No valid fields to update");

  const { data: item, error } = await auth.supabase
    .from("trip_itinerary_items")
    .update(updates)
    .eq("id", id)
    .select("*, trips!inner(id)")
    .maybeSingle();

  if (error) return errorResponse(error.message, 500);
  if (!item) return errorResponse("Itinerary item not found", 404);

  const cleanItem = { ...(item as Record<string, unknown>) };
  delete cleanItem.trips;
  return NextResponse.json({ item: cleanItem });
}

export async function DELETE(_: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) return auth.error;

  const { id } = await params;
  const { data: existing, error: lookupError } = await auth.supabase
    .from("trip_itinerary_items")
    .select("id, trips!inner(id)")
    .eq("id", id)
    .maybeSingle();

  if (lookupError) return errorResponse(lookupError.message, 500);
  if (!existing) return errorResponse("Itinerary item not found", 404);

  const { error } = await auth.supabase.from("trip_itinerary_items").delete().eq("id", id);
  if (error) return errorResponse(error.message, 500);

  return NextResponse.json({ success: true });
}
