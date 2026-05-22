import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { cleanText, isOneOf, parseCount, parseDateOnly, parseKidAges, parseStringArray, TRIP_STATUSES } from "@/lib/trip-ops";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  const { id } = await params;
  const { data: trip, error: tripError } = await auth.supabase
    .from("trips")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (tripError) {
    return errorResponse(tripError.message, 500);
  }
  if (!trip) {
    return errorResponse("Trip not found", 404);
  }

  const [optionsResult, decisionsResult, itineraryResult, knowledgeResult, favoritesResult, tasksResult] = await Promise.all([
    auth.supabase.from("trip_options").select("*").eq("trip_id", id).order("sort_order").order("created_at"),
    auth.supabase.from("trip_decisions").select("*").eq("trip_id", id).order("due_date", { nullsFirst: false }).order("created_at"),
    auth.supabase.from("trip_itinerary_items").select("*").eq("trip_id", id).order("day_number").order("sort_order"),
    auth.supabase.from("trip_knowledge_items").select("*").eq("trip_id", id).order("updated_at", { ascending: false }),
    auth.supabase.from("trip_knowledge_favorites").select("*").eq("trip_id", id).order("created_at", { ascending: false }),
    auth.supabase
      .from("tasks")
      .select("*")
      .eq("metadata->>item_type", "trip_task")
      .eq("metadata->>trip_id", id)
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
  ]);

  const error = optionsResult.error ?? decisionsResult.error ?? itineraryResult.error ?? knowledgeResult.error ?? favoritesResult.error ?? tasksResult.error;
  if (error) {
    return errorResponse(error.message, 500);
  }

  return NextResponse.json({
    trip,
    options: optionsResult.data ?? [],
    decisions: decisionsResult.data ?? [],
    itinerary: itineraryResult.data ?? [],
    knowledge: knowledgeResult.data ?? [],
    knowledge_favorites: favoritesResult.data ?? [],
    tasks: tasksResult.data ?? [],
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  const { id } = await params;
  const payload = await request.json();
  const updates: Record<string, unknown> = {};

  if (payload.title !== undefined) {
    const title = cleanText(payload.title, 160);
    if (!title) return errorResponse("title must be a non-empty string");
    updates.title = title;
  }
  if (payload.destination !== undefined) {
    const destination = cleanText(payload.destination, 160);
    updates.destination = destination ?? "";
  }
  if (payload.status !== undefined) {
    if (!isOneOf(payload.status, TRIP_STATUSES)) return errorResponse("Invalid trip status");
    updates.status = payload.status;
  }
  for (const field of ["start_date", "end_date"] as const) {
    if (payload[field] !== undefined) {
      const parsed = parseDateOnly(payload[field]);
      if (parsed === undefined) return errorResponse(`${field} must use YYYY-MM-DD or null`);
      updates[field] = parsed;
    }
  }
  for (const field of ["logistics", "participants", "already_done", "preferences", "notes"] as const) {
    if (payload[field] !== undefined) {
      const value = cleanText(payload[field]);
      if (value === undefined) return errorResponse(`${field} must be a string or null`);
      updates[field] = value;
    }
  }
  for (const field of ["adult_count", "kid_count"] as const) {
    if (payload[field] !== undefined) {
      const count = parseCount(payload[field]);
      if (count === undefined) return errorResponse(`${field} must be an integer between 0 and 50`);
      updates[field] = count;
    }
  }
  if (payload.kid_ages !== undefined) {
    const kidAges = parseKidAges(payload.kid_ages);
    if (kidAges === undefined) return errorResponse("kid_ages must be numbers between 0 and 18");
    updates.kid_ages = kidAges;
  }
  if (payload.selected_preferences !== undefined) {
    const selectedPreferences = parseStringArray(payload.selected_preferences);
    if (selectedPreferences === undefined) return errorResponse("selected_preferences must be an array or newline text");
    updates.selected_preferences = selectedPreferences;
  }

  if (Object.keys(updates).length === 0) {
    return errorResponse("No valid fields to update");
  }

  const { data: trip, error } = await auth.supabase
    .from("trips")
    .update(updates)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) return errorResponse(error.message, 500);
  if (!trip) return errorResponse("Trip not found", 404);

  return NextResponse.json({ trip });
}
