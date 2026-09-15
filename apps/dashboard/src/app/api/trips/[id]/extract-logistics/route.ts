import { extractTripLogistics } from "@agent/shared";
import { NextResponse } from "next/server";
import { cleanText, parseDateOnly } from "@/lib/trip-ops";
import { errorResponse, getAuthedSupabase } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) return auth.error;

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return errorResponse("GEMINI_API_KEY is not configured on the server.", 503);
  }

  const { id } = await params;
  const payload = (await request.json().catch(() => ({}))) as { logistics?: unknown; preview?: unknown; title?: unknown; destination?: unknown; start_date?: unknown; end_date?: unknown };
  const { data: trip, error: tripError } = await auth.supabase
    .from("trips")
    .select("id, title, destination, start_date, end_date, logistics")
    .eq("id", id)
    .maybeSingle();

  if (tripError) return errorResponse(tripError.message, 500);
  if (!trip) return errorResponse("Trip not found", 404);
  const logistics = typeof payload.logistics === "string" ? payload.logistics.trim() : trip.logistics?.trim();
  if (!logistics) {
    return errorResponse("Add logistics notes before extracting structured details.");
  }

  let details: Awaited<ReturnType<typeof extractTripLogistics>>;
  try {
    details = await extractTripLogistics(apiKey, {
      title: payload.preview === true ? cleanText(payload.title, 160) || trip.title : trip.title,
      destination: payload.preview === true ? cleanText(payload.destination, 160) ?? trip.destination : trip.destination,
      start_date: payload.preview === true && payload.start_date !== undefined ? parseDateOnly(payload.start_date) ?? null : trip.start_date,
      end_date: payload.preview === true && payload.end_date !== undefined ? parseDateOnly(payload.end_date) ?? null : trip.end_date,
      logistics,
    });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Failed to extract logistics", 500);
  }

  if (payload.preview === true) return NextResponse.json({ logistics_details: details });

  const { data: updatedTrip, error: updateError } = await auth.supabase
    .from("trips")
    .update({ logistics, logistics_details: details })
    .eq("id", id)
    .select("*")
    .single();

  if (updateError || !updatedTrip) {
    return errorResponse(updateError?.message ?? "Failed to save extracted logistics", 500);
  }

  return NextResponse.json({ trip: updatedTrip, logistics_details: details });
}
