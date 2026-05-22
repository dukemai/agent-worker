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

export async function POST(request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  const { id } = await params;
  const payload = await request.json();
  const title = cleanText(payload.title, 180);
  if (!title) return errorResponse("title is required");

  const optionType = payload.option_type ?? "activity";
  if (!isOneOf(optionType, TRIP_OPTION_TYPES)) return errorResponse("Invalid option_type");

  const status = payload.status ?? "maybe";
  if (!isOneOf(status, TRIP_OPTION_STATUSES)) return errorResponse("Invalid option status");

  const effort = payload.effort === undefined || payload.effort === null || payload.effort === ""
    ? null
    : payload.effort;
  if (effort !== null && !isOneOf(effort, TRIP_EFFORTS)) return errorResponse("Invalid effort");

  const weatherFit = payload.weather_fit === undefined || payload.weather_fit === null || payload.weather_fit === ""
    ? null
    : payload.weather_fit;
  if (weatherFit !== null && !isOneOf(weatherFit, TRIP_WEATHER_FITS)) return errorResponse("Invalid weather_fit");

  const kidFit = payload.kid_fit === undefined || payload.kid_fit === null || payload.kid_fit === "" ? null : payload.kid_fit;
  if (kidFit !== null && !isOneOf(kidFit, TRIP_KID_FITS)) return errorResponse("Invalid kid_fit");

  const bookingNeeded = coerceBoolean(payload.booking_needed);
  if (bookingNeeded === undefined && payload.booking_needed !== undefined) {
    return errorResponse("booking_needed must be boolean");
  }

  const { data: trip, error: tripError } = await auth.supabase
    .from("trips")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (tripError) return errorResponse(tripError.message, 500);
  if (!trip) return errorResponse("Trip not found", 404);

  const { data: option, error } = await auth.supabase
    .from("trip_options")
    .insert({
      trip_id: id,
      title,
      option_type: optionType,
      status,
      location: cleanText(payload.location, 240),
      best_for: cleanText(payload.best_for, 300),
      effort,
      weather_fit: weatherFit,
      kid_fit: kidFit,
      booking_needed: bookingNeeded ?? false,
      why: cleanText(payload.why),
      notes: cleanText(payload.notes),
      sort_order: typeof payload.sort_order === "number" ? payload.sort_order : 0,
    })
    .select("*")
    .single();

  if (error || !option) return errorResponse(error?.message ?? "Failed to create option", 500);

  return NextResponse.json({ option }, { status: 201 });
}

