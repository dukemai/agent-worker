import { createClient } from "@supabase/supabase-js";
import { ensureGrowingProfile, GrowingProfile } from "@agent/shared";

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
  const tags = (window.tags ?? []).map((item: string) => item.toLowerCase());
  const tagBonus = normalized.some((interest) => tags.some((tag: string) => tag.includes(interest))) ? 3 : 0;
  return window.priority + tagBonus;
}

export async function runGrowingSuggestions(env: Env): Promise<void> {
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

  const weekStartDate = getWeekStartDate();
  const currentMonth = new Date().getUTCMonth() + 1;

  const profile = await ensureGrowingProfile(supabase);

  const { error: deleteError } = await supabase
    .from("growing_suggestions_log")
    .delete()
    .eq("week_start_date", weekStartDate)
    .eq("status", "pending");

  if (deleteError) {
    throw new Error(`Failed to clear pending suggestions: ${deleteError.message}`);
  }

  // Collect existing window_ids that should be restricted:
  // 1. Any window_id already suggested for this week
  // 2. Any window_id connected to an existing task (pending or done)
  const [logRes, taskRes] = await Promise.all([
    supabase
      .from("growing_suggestions_log")
      .select("window_id")
      .eq("week_start_date", weekStartDate),
    supabase
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

  const { data: windowsRows, error: windowsError } = await supabase
    .from("growing_windows")
    .select("id, item_name, suggestion_kind, suggested_bucket, priority, start_month, end_month, stockholm_note, tags")
    .eq("verified", true);

  if (windowsError) {
    console.error("Error fetching growing windows:", windowsError);
    return;
  }

  // Filter windows by current month and EXCLUDE those that were already converted or suggested
  const windows = ((windowsRows ?? []) as GrowingWindow[]).filter(
    (window) =>
      isMonthInRange(currentMonth, window.start_month, window.end_month) &&
      !restrictedWindowIds.has(window.id)
  );

  const interests = profile.interests ?? [];
  const sortedWindows = windows.sort((a, b) => {
    const scoreDiff = scoreWindow(b, interests) - scoreWindow(a, interests);
    if (scoreDiff !== 0) return scoreDiff;
    return a.item_name.localeCompare(b.item_name);
  });

  const actions = sortedWindows.filter(w => w.suggestion_kind === "action").slice(0, 10);
  const inspirations = sortedWindows.filter(w => w.suggestion_kind === "inspiration").slice(0, 10);
  const selected = [...actions, ...inspirations];

  if (selected.length === 0) {
    console.log(`Growing suggestions: no windows for month ${currentMonth}, skipping`);
    return;
  }

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

  const { error: insertError } = await supabase
    .from("growing_suggestions_log")
    .insert(insertPayload as never);

  if (insertError) {
    throw new Error(`Failed to insert growing suggestions: ${insertError.message}`);
  }

  console.log(`Growing suggestions: generated ${selected.length} for week ${weekStartDate}`);
}
