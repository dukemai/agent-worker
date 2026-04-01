import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { 
  fetchGrowingProfile, 
  generateWeeklySuggestions, 
  getISOWeekNumber,
  GrowingSuggestion 
} from "@agent/shared";

export async function POST() {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const profile = await fetchGrowingProfile(auth.supabase);

  if (!profile) {
    return errorResponse("No growing profile found. Create a profile first.", 404);
  }

  const currentWeekNumber = getISOWeekNumber();

  // 1. Delete pending inspirations for this week before regenerating
  const { error: deleteError } = await auth.supabase
    .from("growing_suggestions_log")
    .delete()
    .eq("week_number", currentWeekNumber)
    .eq("suggestion_kind", "inspiration")
    .is("converted_task_id", null);

  if (deleteError) {
    return errorResponse(deleteError.message, 500);
  }

  try {
    const suggestions = await generateWeeklySuggestions(auth.supabase, profile);

    return NextResponse.json({ 
      success: true, 
      count: suggestions.filter((s: GrowingSuggestion) => s.suggestion_kind === 'inspiration').length 
    });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}

