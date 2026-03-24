import { createClient } from "@supabase/supabase-js";

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
  const tags = (window.tags ?? []).map((item: string) => item.toLowerCase());
  const tagBonus = normalized.some((interest) => tags.some((tag: string) => tag.includes(interest))) ? 3 : 0;
  return window.priority + tagBonus;
}

export async function runGrowingSuggestions(env: Env): Promise<void> {
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

  const weekStartDate = getWeekStartDate();
  const currentMonth = new Date().getUTCMonth() + 1;

  const { data: profileRows, error: profileError } = await supabase
    .from("growing_profiles")
    .select("id, city, country_code, space_type, experience_level, interests")
    .order("created_at", { ascending: false })
    .limit(1);

  if (profileError) {
    throw new Error(`Failed to load growing profile: ${profileError.message}`);
  }

  let profile = (profileRows?.[0] as GrowingProfile | undefined) ?? null;
  if (!profile) {
    const { data: createdProfile, error: createProfileError } = await supabase
      .from("growing_profiles")
      .insert({
        city: "Stockholm",
        country_code: "SE",
        space_type: "balcony",
        experience_level: "beginner",
        interests: ["herb", "tomato", "berry"],
      })
      .select("id, city, country_code, space_type, experience_level, interests")
      .single();

    if (createProfileError || !createdProfile) {
      throw new Error(`Failed to create growing profile: ${createProfileError?.message}`);
    }
    profile = createdProfile as GrowingProfile;
  }

  const { error: deleteError } = await supabase
    .from("growing_suggestions_log")
    .delete()
    .eq("week_start_date", weekStartDate)
    .eq("status", "pending");

  if (deleteError) {
    throw new Error(`Failed to clear pending suggestions: ${deleteError.message}`);
  }

  // Collect existing window_ids for this week to avoid unique constraint violations
  // if some suggestions were already converted or dismissed (and thus not deleted above).
  const { data: existingRows, error: existingError } = await supabase
    .from("growing_suggestions_log")
    .select("window_id")
    .eq("week_start_date", weekStartDate);

  if (existingError) {
    throw new Error(`Failed to load existing suggestions: ${existingError.message}`);
  }

  const existingWindowIds = new Set(
    (existingRows ?? [])
      .map((row) => (row as { window_id: string }).window_id)
      .filter(Boolean)
  );

  const { data: windowsRows, error: windowsError } = await supabase
    .from("growing_windows")
    .select("id, item_name, suggestion_kind, suggested_bucket, priority, start_month, end_month, stockholm_note, tags");

  if (windowsError) {
    throw new Error(`Failed to load growing windows: ${windowsError.message}`);
  }

  const windows = ((windowsRows ?? []) as GrowingWindow[]).filter((window) =>
    isMonthInRange(currentMonth, window.start_month, window.end_month) && !existingWindowIds.has(window.id)
  );

  const interests = profile.interests ?? [];
  const actions = windows
    .filter((window) => window.suggestion_kind === "action")
    .sort((a, b) => {
      const scoreDiff = scoreWindow(b, interests) - scoreWindow(a, interests);
      if (scoreDiff !== 0) return scoreDiff;
      return a.item_name.localeCompare(b.item_name);
    })
    .slice(0, 5);
  const inspirations = windows
    .filter((window) => window.suggestion_kind === "inspiration")
    .sort((a, b) => {
      const scoreDiff = scoreWindow(b, interests) - scoreWindow(a, interests);
      if (scoreDiff !== 0) return scoreDiff;
      return a.item_name.localeCompare(b.item_name);
    })
    .slice(0, 2);
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
