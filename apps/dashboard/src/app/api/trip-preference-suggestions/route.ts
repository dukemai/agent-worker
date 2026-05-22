import { NextRequest, NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import {
  cleanText,
  defaultTripPreferenceSuggestions,
  isOneOf,
  parseStringArray,
  TRIP_PREFERENCE_CATEGORIES,
} from "@/lib/trip-ops";

export async function GET(request: NextRequest) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) return auth.error;

  const includeInactive = request.nextUrl.searchParams.get("includeInactive") === "1";
  await ensureDefaultSuggestions(auth.supabase, auth.user.id);

  let query = auth.supabase
    .from("trip_preference_suggestions")
    .select("*")
    .eq("user_id", auth.user.id)
    .order("category")
    .order("sort_order")
    .order("label");

  if (!includeInactive) {
    query = query.eq("active", true);
  }

  const { data: suggestions, error } = await query;
  if (error) return errorResponse(error.message, 500);

  return NextResponse.json({ suggestions: suggestions ?? [] });
}

export async function POST(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) return auth.error;

  const payload = await request.json();
  const label = cleanText(payload.label, 120);
  const preferenceText = cleanText(payload.preference_text, 500);
  if (!label || !preferenceText) return errorResponse("label and preference_text are required");
  if (!isOneOf(payload.category, TRIP_PREFERENCE_CATEGORIES)) return errorResponse("Invalid preference category");

  const tags = parseStringArray(payload.tags, 12);
  if (tags === undefined) return errorResponse("tags must be an array or newline text");

  const { data: suggestion, error } = await auth.supabase
    .from("trip_preference_suggestions")
    .insert({
      user_id: auth.user.id,
      category: payload.category,
      label,
      description: cleanText(payload.description, 300),
      preference_text: preferenceText,
      tags,
      sort_order: typeof payload.sort_order === "number" ? payload.sort_order : 0,
      active: typeof payload.active === "boolean" ? payload.active : true,
    })
    .select("*")
    .single();

  if (error || !suggestion) return errorResponse(error?.message ?? "Failed to create suggestion", 500);

  return NextResponse.json({ suggestion }, { status: 201 });
}

async function ensureDefaultSuggestions(supabase: NonNullable<Awaited<ReturnType<typeof getAuthedSupabase>>["supabase"]>, userId: string) {
  const { count, error } = await supabase
    .from("trip_preference_suggestions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error || (count ?? 0) > 0) return;

  await supabase.from("trip_preference_suggestions").insert(
    defaultTripPreferenceSuggestions.map((suggestion) => ({
      ...suggestion,
      user_id: userId,
    }))
  );
}

