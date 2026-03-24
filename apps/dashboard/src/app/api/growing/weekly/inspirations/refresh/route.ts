import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";

type GrowingProfile = {
  id: string;
  city: string;
  country_code: string;
  space_type: string;
  experience_level: string;
  interests: string[];
};

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

export async function POST() {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const weekStartDate = getWeekStartDate();
  const currentMonth = new Date().getUTCMonth() + 1;

  const { data: profileRows, error: profileError } = await auth.supabase
    .from("growing_profiles")
    .select("id, city, country_code, space_type, experience_level, interests")
    .order("created_at", { ascending: false })
    .limit(1);

  if (profileError) {
    return errorResponse(profileError.message, 500);
  }

  const profile = (profileRows?.[0] as GrowingProfile | undefined) ?? null;
  if (!profile) {
    return errorResponse("No growing profile found. Create a profile first.", 404);
  }

  // Remove only inspirations for this week that are not yet linked to tasks.
  const { error: deleteError } = await auth.supabase
    .from("growing_suggestions_log")
    .delete()
    .eq("week_start_date", weekStartDate)
    .eq("suggestion_kind", "inspiration")
    .is("converted_task_id", null);

  if (deleteError) {
    return errorResponse(deleteError.message, 500);
  }

  // Collect existing window_ids for this week so we don't violate the unique
  // constraint on (week_start_date, window_id) when inserting new inspirations.
  const { data: existingRows, error: existingError } = await auth.supabase
    .from("growing_suggestions_log")
    .select("window_id")
    .eq("week_start_date", weekStartDate);

  if (existingError) {
    return errorResponse(existingError.message, 500);
  }

  const existingWindowIds = new Set(
    (existingRows ?? [])
      .map((row) => (row as { window_id: string | null }).window_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0)
  );

  const { data: windowsRows, error: windowsError } = await auth.supabase
    .from("growing_windows")
    .select(
      "id, item_name, suggestion_kind, suggested_bucket, priority, start_month, end_month, stockholm_note, tags"
    )
    .eq("verified", true);

  if (windowsError) {
    return errorResponse(windowsError.message, 500);
  }
  const windows = ((windowsRows ?? []) as GrowingWindow[]).filter(
    (window) =>
      isMonthInRange(currentMonth, window.start_month, window.end_month) && !existingWindowIds.has(window.id)
  );

  if (windows.length === 0) {
    return NextResponse.json({ success: true, created: 0 });
  }

  const interests = profile.interests ?? [];
  const selected = windows
    .sort((a, b) => {
      const scoreDiff = scoreWindow(b, interests) - scoreWindow(a, interests);
      if (scoreDiff !== 0) return scoreDiff;
      return a.item_name.localeCompare(b.item_name);
    })
    .slice(0, 6);

  if (selected.length === 0) {
    return NextResponse.json({ success: true, created: 0 });
  }

  const insertPayload = selected.map((window) => ({
    profile_id: profile.id,
    window_id: window.id,
    title: window.item_name,
    details: window.stockholm_note,
    suggestion_kind: "inspiration" as const,
    suggested_bucket: window.suggested_bucket,
    week_start_date: weekStartDate,
    status: "pending" as const,
  }));

  const { error: insertError } = await auth.supabase.from("growing_suggestions_log").insert(insertPayload);

  if (insertError) {
    return errorResponse(insertError.message, 500);
  }

  return NextResponse.json({ success: true, created: insertPayload.length });
}

