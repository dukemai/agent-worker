import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { gotlandStarterDecisions, gotlandStarterItinerary, gotlandStarterOptions } from "@/lib/trip-ops";

type Params = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  const { id } = await params;
  const { data: trip, error: tripError } = await auth.supabase
    .from("trips")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (tripError) return errorResponse(tripError.message, 500);
  if (!trip) return errorResponse("Trip not found", 404);

  const { count: optionCount, error: countError } = await auth.supabase
    .from("trip_options")
    .select("id", { count: "exact", head: true })
    .eq("trip_id", id);
  if (countError) return errorResponse(countError.message, 500);
  if ((optionCount ?? 0) > 0) {
    return errorResponse("Starter can only be added before trip options exist");
  }

  const [optionsResult, decisionsResult, itineraryResult] = await Promise.all([
    auth.supabase.from("trip_options").insert(gotlandStarterOptions.map((option) => ({ ...option, trip_id: id }))).select("*"),
    auth.supabase.from("trip_decisions").insert(gotlandStarterDecisions.map((decision) => ({ ...decision, trip_id: id }))).select("*"),
    auth.supabase.from("trip_itinerary_items").insert(gotlandStarterItinerary.map((item) => ({ ...item, trip_id: id }))).select("*"),
  ]);

  const error = optionsResult.error ?? decisionsResult.error ?? itineraryResult.error;
  if (error) return errorResponse(error.message, 500);

  return NextResponse.json({
    options: optionsResult.data ?? [],
    decisions: decisionsResult.data ?? [],
    itinerary: itineraryResult.data ?? [],
  });
}

