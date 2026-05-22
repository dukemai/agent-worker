import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { cleanText, isOneOf, TRIP_ITINERARY_BLOCKS } from "@/lib/trip-ops";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  const { id } = await params;
  const payload = await request.json();
  const title = cleanText(payload.title, 180);
  if (!title) return errorResponse("title is required");

  if (!Number.isInteger(payload.day_number) || payload.day_number < 1 || payload.day_number > 30) {
    return errorResponse("day_number must be between 1 and 30");
  }
  if (!isOneOf(payload.block, TRIP_ITINERARY_BLOCKS)) {
    return errorResponse("Invalid itinerary block");
  }

  const { data: trip, error: tripError } = await auth.supabase
    .from("trips")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (tripError) return errorResponse(tripError.message, 500);
  if (!trip) return errorResponse("Trip not found", 404);

  const optionId = cleanText(payload.option_id, 80);
  const { data: item, error } = await auth.supabase
    .from("trip_itinerary_items")
    .insert({
      trip_id: id,
      title,
      day_number: payload.day_number,
      block: payload.block,
      option_id: optionId ?? null,
      notes: cleanText(payload.notes),
      sort_order: typeof payload.sort_order === "number" ? payload.sort_order : 0,
    })
    .select("*")
    .single();

  if (error || !item) return errorResponse(error?.message ?? "Failed to create itinerary item", 500);

  return NextResponse.json({ item }, { status: 201 });
}

