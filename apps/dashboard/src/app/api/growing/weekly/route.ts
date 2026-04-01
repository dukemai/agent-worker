import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { 
  fetchGrowingProfile, 
  generateWeeklySupportingKnowledge,
  generateWeeklySuggestions, 
  getISOWeekNumber,
  getWeekStartDate,
  GrowingSuggestion
} from "@agent/shared";

export async function GET() {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const weekStartDate = getWeekStartDate();
  const currentWeekNumber = getISOWeekNumber();
  const profile = await fetchGrowingProfile(auth.supabase);

  if (!profile) {
    return errorResponse("No growing profile found. Create a profile first.", 404);
  }

  try {
    // 1. Check if we already have suggestions for this week
    const { data: existingRows, error: existingError } = await auth.supabase
      .from("growing_suggestions_log")
      .select("*")
      .eq("week_number", currentWeekNumber);

    if (existingError) {
      return errorResponse(existingError.message, 500);
    }

    let suggestions: GrowingSuggestion[] = (existingRows ?? []) as GrowingSuggestion[];

    // 2. If none exist, trigger generation
    if (suggestions.length === 0) {
      suggestions = await generateWeeklySuggestions(auth.supabase, profile);
    }

    // Sort final suggestions deterministically by title
    const sortedSuggestions = [...suggestions].sort((a, b) => a.title.localeCompare(b.title));

    const actions = sortedSuggestions.filter((item) => item.suggestion_kind === "action");
    const supportingKnowledge = await generateWeeklySupportingKnowledge(auth.supabase, actions, profile);

    return NextResponse.json({
      week_number: currentWeekNumber,
      week_start_date: weekStartDate,
      profile,
      actions,
      supporting_knowledge: supportingKnowledge,
    });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}
