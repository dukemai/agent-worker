import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { cleanText, isOneOf, parseStringArray, TRIP_PREFERENCE_CATEGORIES } from "@/lib/trip-ops";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) return auth.error;

  const { id } = await params;
  const payload = await request.json();
  const updates: Record<string, unknown> = {};

  if (payload.category !== undefined) {
    if (!isOneOf(payload.category, TRIP_PREFERENCE_CATEGORIES)) return errorResponse("Invalid preference category");
    updates.category = payload.category;
  }
  for (const [field, max] of [
    ["label", 120],
    ["description", 300],
    ["preference_text", 500],
  ] as const) {
    if (payload[field] !== undefined) {
      const value = cleanText(payload[field], max);
      if (field !== "description" && !value) return errorResponse(`${field} must be a non-empty string`);
      if (value === undefined) return errorResponse(`${field} must be a string or null`);
      updates[field] = value;
    }
  }
  if (payload.tags !== undefined) {
    const tags = parseStringArray(payload.tags, 12);
    if (tags === undefined) return errorResponse("tags must be an array or newline text");
    updates.tags = tags;
  }
  if (payload.sort_order !== undefined) {
    if (!Number.isInteger(payload.sort_order)) return errorResponse("sort_order must be an integer");
    updates.sort_order = payload.sort_order;
  }
  if (payload.active !== undefined) {
    if (typeof payload.active !== "boolean") return errorResponse("active must be boolean");
    updates.active = payload.active;
  }
  if (Object.keys(updates).length === 0) return errorResponse("No valid fields to update");

  const { data: suggestion, error } = await auth.supabase
    .from("trip_preference_suggestions")
    .update(updates)
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .select("*")
    .maybeSingle();

  if (error) return errorResponse(error.message, 500);
  if (!suggestion) return errorResponse("Suggestion not found", 404);

  return NextResponse.json({ suggestion });
}

export async function DELETE(_: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) return auth.error;

  const { id } = await params;
  const { data, error } = await auth.supabase
    .from("trip_preference_suggestions")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .select("id")
    .maybeSingle();

  if (error) return errorResponse(error.message, 500);
  if (!data) return errorResponse("Suggestion not found", 404);
  return NextResponse.json({ success: true });
}
