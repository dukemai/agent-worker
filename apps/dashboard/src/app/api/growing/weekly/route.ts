import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { fetchGrowingProfile, GrowingProfile } from "@agent/shared";

type GrowingWindow = {
  id: string;
  item_name: string;
  suggestion_kind: "action" | "inspiration";
  suggested_bucket: "today" | "this_week" | "later";
  priority: number;
  start_month: number;
  end_month: number;
  stockholm_note: string;
  tags: string[];
};

type GrowingSuggestion = {
  id: string;
  title: string;
  details: string;
  suggestion_kind: "action" | "inspiration";
  suggested_bucket: "today" | "this_week" | "later";
  status: "pending" | "dismissed" | "converted" | "done";
  week_start_date: string;
  converted_task_id: string | null;
  window_id: string;
};

function getWeekStartDate(now = new Date()): string {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().slice(0, 10);
}

function isMonthInRange(month: number, startMonth: number, endMonth: number): boolean {
  if (startMonth <= endMonth) {
    return month >= startMonth && month <= endMonth;
  }
  return month >= startMonth || month <= endMonth;
}

function scoreWindow(window: GrowingWindow, interests: string[]): number {
  const normalized = interests.map((item) => item.toLowerCase().trim()).filter(Boolean);
  const tags = window.tags.map((item) => item.toLowerCase());
  const tagBonus = normalized.some((interest) => tags.some((tag) => tag.includes(interest))) ? 3 : 0;
  return window.priority + tagBonus;
}

export async function GET() {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const weekStartDate = getWeekStartDate();
  const currentMonth = new Date().getUTCMonth() + 1;

  const profile = await fetchGrowingProfile(auth.supabase);

  if (!profile) {
    return errorResponse("No growing profile found. Create a profile first.", 404);
  }

  const { data: existingRows, error: existingError } = await auth.supabase
    .from("growing_suggestions_log")
    .select("id, title, details, suggestion_kind, suggested_bucket, status, week_start_date, converted_task_id, window_id")
    .eq("week_start_date", weekStartDate);

  if (existingError) {
    return errorResponse(existingError.message, 500);
  }

  let suggestions = (existingRows ?? []) as GrowingSuggestion[];

  if (suggestions.length === 0) {
    // Get all window_ids that should be restricted:
    // 1. Any window_id already suggested for this week
    // 2. Any window_id connected to an existing task (pending or done)
    const [logRes, taskRes] = await Promise.all([
      auth.supabase
        .from("growing_suggestions_log")
        .select("window_id")
        .eq("week_start_date", weekStartDate),
      auth.supabase
        .from("tasks")
        .select("window_id")
        .is("window_id", "not.null")
    ]);

    const restrictedWindowIds = new Set<string>();
    
    (logRes.data ?? []).forEach(row => {
      if (row.window_id) restrictedWindowIds.add(row.window_id);
    });

    (taskRes.data ?? []).forEach(row => {
      if (row.window_id) restrictedWindowIds.add(row.window_id);
    });

    const { data: windowsRows, error: windowsError } = await auth.supabase
      .from("growing_windows")
      .select("id, item_name, suggestion_kind, suggested_bucket, priority, start_month, end_month, stockholm_note, tags")
      .eq("verified", true);

    if (windowsError) {
      return errorResponse(windowsError.message, 500);
    }

    const windows = ((windowsRows ?? []) as GrowingWindow[]).filter((window) =>
      isMonthInRange(currentMonth, window.start_month, window.end_month) && !restrictedWindowIds.has(window.id)
    );

    const interests = profile.interests ?? [];
    const sortedWindows = windows.sort((a, b) => {
      const scoreDiff = scoreWindow(b, interests) - scoreWindow(a, interests);
      if (scoreDiff !== 0) return scoreDiff;
      return a.item_name.localeCompare(b.item_name);
    });

    const topActions = sortedWindows.filter(w => w.suggestion_kind === "action").slice(0, 10);
    const topInspirations = sortedWindows.filter(w => w.suggestion_kind === "inspiration").slice(0, 10);
    const selected = [...topActions, ...topInspirations];

    if (selected.length > 0) {
      const insertPayload = selected.map((window) => ({
        profile_id: profile.id,
        window_id: window.id,
        title: window.item_name,
        details: window.stockholm_note,
        suggestion_kind: window.suggestion_kind,
        suggested_bucket: window.suggested_bucket,
        week_start_date: weekStartDate,
        status: "pending" as const,
      }));

      const { data: createdRows, error: createSuggestionsError } = await auth.supabase
        .from("growing_suggestions_log")
        .upsert(insertPayload, { onConflict: "week_start_date,window_id" })
        .select("id, title, details, suggestion_kind, suggested_bucket, status, week_start_date, converted_task_id, window_id");

      if (createSuggestionsError) {
        return errorResponse(createSuggestionsError.message, 500);
      }

      suggestions = (createdRows ?? []) as GrowingSuggestion[];
    }
  }

  // Sort suggestions deterministically: priority (implied by score/initial order) then title
  const sortedSuggestions = [...suggestions].sort((a, b) => a.title.localeCompare(b.title));

  const actions = sortedSuggestions.filter((item) => item.suggestion_kind === "action");
  const inspirations = sortedSuggestions.filter((item) => item.suggestion_kind === "inspiration");

  return NextResponse.json({
    week_start_date: weekStartDate,
    profile,
    actions,
    inspirations,
  });
}
