import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";

export type FoodStyleFavoriteSuggestionRow = {
  id: string;
  style_id: string;
  style_label: string;
  watchlist_text: string;
  priority: number;
  reason: string | null;
  source: string;
  created_at: string;
};

function cleanString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export async function GET() {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const { data, error } = await auth.supabase
    .from("food_style_favorite_suggestions")
    .select("id, style_id, style_label, watchlist_text, priority, reason, source, created_at")
    .order("style_id", { ascending: true })
    .order("priority", { ascending: true })
    .order("watchlist_text", { ascending: true });

  if (error) {
    return errorResponse(error.message, 500);
  }

  return NextResponse.json({ suggestions: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const styleId = cleanString(body.styleId);
  const styleLabel = cleanString(body.styleLabel);
  const watchlistText = cleanString(body.watchlistText);
  const reason = cleanString(body.reason);
  const priority =
    typeof body.priority === "number" && Number.isFinite(body.priority)
      ? Math.round(body.priority)
      : 100;

  if (!styleId || !styleLabel || !watchlistText) {
    return errorResponse("styleId, styleLabel, and watchlistText are required", 400);
  }

  const { data, error } = await auth.supabase
    .from("food_style_favorite_suggestions")
    .upsert(
      {
      style_id: styleId,
      style_label: styleLabel,
      watchlist_text: watchlistText,
      priority,
      reason,
      source: "admin",
      },
      { onConflict: "style_id,watchlist_text" },
    )
    .select("id, style_id, style_label, watchlist_text, priority, reason, source, created_at")
    .single();

  if (error) {
    return errorResponse(error.message, 500);
  }

  return NextResponse.json({ suggestion: data }, { status: 201 });
}
