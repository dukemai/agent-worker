import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import {
  cleanText,
  coerceBoolean,
  isOneOf,
  TRIP_EFFORTS,
  TRIP_KID_FITS,
  TRIP_OPTION_STATUSES,
  TRIP_OPTION_TYPES,
  TRIP_WEATHER_FITS,
} from "@/lib/trip-ops";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) return auth.error;

  const { id } = await params;
  const payload = await request.json();
  const updates: Record<string, unknown> = {};

  if (payload.title !== undefined) {
    const title = cleanText(payload.title, 180);
    if (!title) return errorResponse("title must be a non-empty string");
    updates.title = title;
  }
  if (payload.option_type !== undefined) {
    if (!isOneOf(payload.option_type, TRIP_OPTION_TYPES)) return errorResponse("Invalid option_type");
    updates.option_type = payload.option_type;
  }
  if (payload.status !== undefined) {
    if (!isOneOf(payload.status, TRIP_OPTION_STATUSES)) return errorResponse("Invalid option status");
    updates.status = payload.status;
  }
  for (const field of ["location", "best_for", "why", "notes"] as const) {
    if (payload[field] !== undefined) {
      const value = cleanText(payload[field], field === "location" ? 240 : 2000);
      if (value === undefined) return errorResponse(`${field} must be a string or null`);
      updates[field] = value;
    }
  }
  for (const [field, allowed] of [
    ["effort", TRIP_EFFORTS],
    ["weather_fit", TRIP_WEATHER_FITS],
    ["kid_fit", TRIP_KID_FITS],
  ] as const) {
    if (payload[field] !== undefined) {
      if (payload[field] === null || payload[field] === "") {
        updates[field] = null;
      } else if (isOneOf(payload[field], allowed)) {
        updates[field] = payload[field];
      } else {
        return errorResponse(`Invalid ${field}`);
      }
    }
  }
  if (payload.booking_needed !== undefined) {
    const value = coerceBoolean(payload.booking_needed);
    if (value === undefined) return errorResponse("booking_needed must be boolean");
    updates.booking_needed = value;
  }

  if (Object.keys(updates).length === 0) return errorResponse("No valid fields to update");

  const { data: option, error } = await auth.supabase
    .from("trip_options")
    .update(updates)
    .eq("id", id)
    .select("*, trips!inner(id)")
    .maybeSingle();

  if (error) return errorResponse(error.message, 500);
  if (!option) return errorResponse("Option not found", 404);

  const cleanOption = { ...(option as Record<string, unknown>) };
  delete cleanOption.trips;
  return NextResponse.json({ option: cleanOption });
}

export async function DELETE(_: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) return auth.error;

  const { id } = await params;
  const { data: existing, error: lookupError } = await auth.supabase
    .from("trip_options")
    .select("id, trips!inner(id)")
    .eq("id", id)
    .maybeSingle();

  if (lookupError) return errorResponse(lookupError.message, 500);
  if (!existing) return errorResponse("Option not found", 404);

  const { error } = await auth.supabase.from("trip_options").delete().eq("id", id);
  if (error) return errorResponse(error.message, 500);

  return NextResponse.json({ success: true });
}
