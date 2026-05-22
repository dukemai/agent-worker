import { NextRequest, NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { ensureUserHousehold } from "@/lib/household";
import { cleanText, isOneOf, parseCount, parseDateOnly, parseKidAges, parseStringArray, TRIP_STATUSES } from "@/lib/trip-ops";

export async function GET(request: NextRequest) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  const status = request.nextUrl.searchParams.get("status");
  let query = auth.supabase
    .from("trips")
    .select("*")
    .order("start_date", { ascending: true, nullsFirst: false })
    .order("updated_at", { ascending: false });

  if (status) {
    if (!isOneOf(status, TRIP_STATUSES)) {
      return errorResponse("Invalid trip status");
    }
    query = query.eq("status", status);
  }

  const { data: trips, error } = await query;
  if (error) {
    return errorResponse(error.message, 500);
  }

  return NextResponse.json({ trips: trips ?? [] });
}

export async function POST(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  const payload = await request.json();
  const title = cleanText(payload.title, 160);
  const destination = cleanText(payload.destination, 160);
  if (!title) {
    return errorResponse("title is required");
  }

  const status = payload.status === undefined ? "planning" : payload.status;
  if (!isOneOf(status, TRIP_STATUSES)) {
    return errorResponse("Invalid trip status");
  }

  const startDate = parseDateOnly(payload.start_date);
  const endDate = parseDateOnly(payload.end_date);
  if (startDate === undefined || endDate === undefined) {
    return errorResponse("Dates must use YYYY-MM-DD or null");
  }
  const adultCount = parseCount(payload.adult_count);
  const kidCount = parseCount(payload.kid_count);
  const kidAges = parseKidAges(payload.kid_ages);
  const selectedPreferences = parseStringArray(payload.selected_preferences);
  if (adultCount === undefined || kidCount === undefined) return errorResponse("Participant counts must be 0-50");
  if (kidAges === undefined) return errorResponse("kid_ages must be numbers between 0 and 18");
  if (selectedPreferences === undefined) return errorResponse("selected_preferences must be an array or newline text");

  const household = await ensureUserHousehold(auth.supabase, auth.user);
  if (household.error) return errorResponse(household.error.message, 500);

  const { data: trip, error } = await auth.supabase
    .from("trips")
    .insert({
      user_id: auth.user.id,
      household_id: household.household.id,
      title,
      destination: destination ?? "",
      status,
      start_date: startDate ?? null,
      end_date: endDate ?? null,
      logistics: cleanText(payload.logistics),
      participants: cleanText(payload.participants),
      adult_count: adultCount,
      kid_count: kidCount,
      kid_ages: kidAges,
      already_done: cleanText(payload.already_done),
      preferences: cleanText(payload.preferences),
      selected_preferences: selectedPreferences,
      notes: cleanText(payload.notes),
    })
    .select("*")
    .single();

  if (error || !trip) {
    return errorResponse(error?.message ?? "Failed to create trip", 500);
  }

  return NextResponse.json({ trip }, { status: 201 });
}
