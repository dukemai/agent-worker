import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { buildTripOptionSuggestionPrompt, suggestTripOptions, type TripOptionSuggestionInput } from "@/lib/trip-option-suggestions";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) return auth.error;

  const body = await readRequestBody(request);
  if (body.error) return body.error;
  const mode = body.value.mode === "preview" ? "preview" : "generate";
  const promptOverride = typeof body.value.prompt === "string" ? body.value.prompt.trim() : null;
  if (promptOverride && promptOverride.length > 50000) return errorResponse("Prompt is too long", 400);

  const { id } = await params;
  const { data: trip, error: tripError } = await auth.supabase
    .from("trips")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (tripError) return errorResponse(tripError.message, 500);
  if (!trip) return errorResponse("Trip not found", 404);

  const { data: existingOptions, error: optionsError } = await auth.supabase
    .from("trip_options")
    .select("title")
    .eq("trip_id", id)
    .order("sort_order");
  if (optionsError) return errorResponse(optionsError.message, 500);

  const { data: knowledgeItems, error: knowledgeError } = await auth.supabase
    .from("trip_knowledge_items")
    .select("title, source_url, extraction, tags, extracted_at")
    .eq("trip_id", id)
    .eq("status", "processed")
    .order("extracted_at", { ascending: false })
    .limit(20);
  if (knowledgeError) return errorResponse(knowledgeError.message, 500);

  const { data: favorites, error: favoritesError } = await auth.supabase
    .from("trip_knowledge_favorites")
    .select("item_type, name, area")
    .eq("trip_id", id)
    .order("created_at", { ascending: false });
  if (favoritesError) return errorResponse(favoritesError.message, 500);

  const input: TripOptionSuggestionInput = {
    title: trip.title,
    destination: trip.destination,
    start_date: trip.start_date,
    end_date: trip.end_date,
    logistics: trip.logistics,
    logistics_details: trip.logistics_details,
    adult_count: trip.adult_count ?? 0,
    kid_count: trip.kid_count ?? 0,
    kid_ages: Array.isArray(trip.kid_ages) ? trip.kid_ages : [],
    already_done: trip.already_done,
    preferences: trip.preferences,
    selected_preferences: Array.isArray(trip.selected_preferences) ? trip.selected_preferences : [],
    knowledge_context: knowledgeItems ?? [],
    favorite_knowledge: favorites ?? [],
    existing_options: (existingOptions ?? []).map((option) => option.title).filter(Boolean),
  };

  const generatedPrompt = buildTripOptionSuggestionPrompt(input);
  if (mode === "preview") {
    return NextResponse.json({ prompt: generatedPrompt });
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return errorResponse("GEMINI_API_KEY is not configured on the server.", 503);
  }

  const result = await suggestTripOptions(apiKey, input, promptOverride ?? generatedPrompt);

  if (result.options.length === 0) {
    return NextResponse.json({ options: [] });
  }

  const currentCount = existingOptions?.length ?? 0;
  const { data: options, error: insertError } = await auth.supabase
    .from("trip_options")
    .insert(
      result.options.map((option, index) => ({
        trip_id: id,
        title: option.title,
        option_type: option.option_type,
        status: "maybe",
        location: option.location,
        best_for: option.best_for,
        effort: option.effort,
        weather_fit: option.weather_fit,
        kid_fit: option.kid_fit,
        booking_needed: option.booking_needed,
        why: option.why,
        notes: option.notes,
        sort_order: (currentCount + index + 1) * 10,
      }))
    )
    .select("*");

  if (insertError) return errorResponse(insertError.message, 500);

  return NextResponse.json({ options: options ?? [] }, { status: 201 });
}

async function readRequestBody(request: Request): Promise<{ value: Record<string, unknown>; error?: never } | { value?: never; error: NextResponse }> {
  const text = await request.text();
  if (!text.trim()) return { value: {} };

  try {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { error: errorResponse("Request body must be an object", 400) };
    }
    return { value: parsed as Record<string, unknown> };
  } catch {
    return { error: errorResponse("Invalid JSON request body", 400) };
  }
}
