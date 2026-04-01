import { SupabaseClient } from "@supabase/supabase-js";
import {
  GrowingActionKnowledgeLink,
  GrowingProfile,
  GrowingSuggestion,
  GrowingSupportingKnowledge,
  GrowingWindow,
} from "../types/growing";
import { getISOWeekNumber } from "../utils";

export function getWeekStartDate(now = new Date()): string {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().slice(0, 10);
}

export function isMonthInRange(month: number, startMonth: number, endMonth: number): boolean {
  if (startMonth <= endMonth) {
    return month >= startMonth && month <= endMonth;
  }
  return month >= startMonth || month <= endMonth;
}

function getMonthFromISOWeek(weekNumber: number, year = new Date().getUTCFullYear()): number {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Weekday = jan4.getUTCDay() || 7; // ISO: Mon=1 ... Sun=7
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Weekday + 1);

  const targetWeekMonday = new Date(week1Monday);
  targetWeekMonday.setUTCDate(week1Monday.getUTCDate() + (weekNumber - 1) * 7);

  return targetWeekMonday.getUTCMonth() + 1;
}

export function scoreWindow(window: GrowingWindow, interests: string[]): number {
  const normalized = (interests ?? []).map((item) => item.toLowerCase().trim()).filter(Boolean);
  const tags = (window.tags ?? []).map((item) => item.toLowerCase());
  const tagBonus = normalized.some((interest) => tags.some((tag) => tag.includes(interest))) ? 3 : 0;
  return window.priority + tagBonus;
}

/**
 * Generates and persists the weekly suggestions for the current week starting Monday.
 * It identifies gaps in the growing_suggestions_log (aiming for 10 actions and 10 inspirations)
 * and fills them by picking the best matches from the verified growing catalog.
 */
export async function generateWeeklySuggestions(
  supabase: SupabaseClient,
  profile: GrowingProfile
): Promise<GrowingSuggestion[]> {
  const currentWeekNumber = getISOWeekNumber();
  const currentMonth = getMonthFromISOWeek(currentWeekNumber);

  // 1) Clean up existing rows for current week
  const { error: cleanupError } = await supabase
    .from("growing_suggestions_log")
    .delete()
    .eq("week_number", currentWeekNumber);

  if (cleanupError) {
    throw new Error(`Failed to clean current week suggestions: ${cleanupError.message}`);
  }

  // 2) Fetch verified windows and apply month-range logic in app code.
  // PostgREST filters do not support column-to-column comparisons needed
  // for wrap-around ranges like Nov->Feb (start_month > end_month).
  const { data: windowsRows, error: windowsError } = await supabase
    .from("growing_windows")
    .select("*")
    .eq("verified", true);

  if (windowsError) {
    throw new Error(`Failed to fetch catalog windows: ${windowsError.message}`);
  }

  const seasonalWindows = ((windowsRows ?? []) as GrowingWindow[]).filter((window) =>
    isMonthInRange(currentMonth, window.start_month, window.end_month)
  );

  // 3) Restrict windows that already became tasks
  const { data: taskWindows, error: taskError } = await supabase
    .from("tasks")
    .select("window_id")
    .not("window_id", "is", null);

  if (taskError) {
    throw new Error(`Failed to fetch restricted task windows: ${taskError.message}`);
  }

  const restrictedWindowIds = new Set<string>();
  (taskWindows ?? []).forEach((row) => {
    if (row.window_id) restrictedWindowIds.add(row.window_id);
  });

  const availableWindows = seasonalWindows.filter((window) => !restrictedWindowIds.has(window.id));

  // 4) Score and sort
  const sortedWindows = availableWindows.sort((a, b) => {
    const scoreDiff = scoreWindow(b, profile.interests) - scoreWindow(a, profile.interests);
    if (scoreDiff !== 0) return scoreDiff;
    return a.item_name.localeCompare(b.item_name);
  });

  // 5) Keep action windows only and take top 10
  const topActions = sortedWindows.filter((w) => w.suggestion_kind === "action").slice(0, 10);
  const toInsert = [...topActions];
  // 6) Upsert for this week using composite key (week_number, window_id)
  if (toInsert.length > 0) {
    const payload = toInsert.map((window) => ({
      profile_id: profile.id,
      window_id: window.id,
      title: window.item_name,
      details: window.stockholm_note,
      suggestion_kind: window.suggestion_kind,
      suggested_bucket: window.suggested_bucket,
      week_number: currentWeekNumber,
      status: "pending",
    }));

    const { error: upsertError } = await supabase
      .from("growing_suggestions_log")
      .upsert(payload, { onConflict: "week_number,window_id" });

    // Fallback: environments without the composite unique index cannot use ON CONFLICT.
    // Cleanup happened earlier for current week, so plain insert is safe.
    if (upsertError?.message?.includes("no unique or exclusion constraint matching the ON CONFLICT specification")) {
      const { error: insertError } = await supabase.from("growing_suggestions_log").insert(payload);
      if (insertError) {
        throw new Error(`Failed to insert weekly suggestions: ${insertError.message}`);
      }
    } else if (upsertError) {
      throw new Error(`Failed to upsert weekly suggestions: ${upsertError.message}`);
    }
  }

  // 7) Return current-week rows after upsert
  const { data: finalRows, error: finalError } = await supabase
    .from("growing_suggestions_log")
    .select("*")
    .eq("week_number", currentWeekNumber);

  if (finalError) throw new Error(`Failed to fetch final weekly suggestions: ${finalError.message}`);
  return (finalRows ?? []) as GrowingSuggestion[];
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3);
}

export async function generateWeeklySupportingKnowledge(
  supabase: SupabaseClient,
  actions: GrowingSuggestion[],
  profile: GrowingProfile,
  limitPerAction = 3
): Promise<GrowingActionKnowledgeLink[]> {
  const actionWindowIds = actions.map((a) => a.window_id).filter(Boolean);
  if (actionWindowIds.length === 0) return [] as GrowingActionKnowledgeLink[];

  const { data: actionWindows, error: actionWindowsError } = await supabase
    .from("growing_windows")
    .select("id, item_name, tags")
    .in("id", actionWindowIds);

  if (actionWindowsError) {
    throw new Error(`Failed to fetch action windows for supporting knowledge: ${actionWindowsError.message}`);
  }

  const { data: knowledgeRows, error: knowledgeError } = await supabase
    .from("growing_knowledge")
    .select("id, title, content, category, tags, created_at")
    .eq("verified", true)
    .order("created_at", { ascending: false })
    .limit(200);

  if (knowledgeError) {
    throw new Error(`Failed to fetch supporting knowledge: ${knowledgeError.message}`);
  }

  const windowsById = new Map<string, { item_name: string; tags: string[] }>();
  for (const row of actionWindows ?? []) {
    windowsById.set(row.id, {
      item_name: String(row.item_name ?? ""),
      tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    });
  }

  const normalizeKnowledge = (row: any): GrowingSupportingKnowledge => ({
    id: row.id,
    title: row.title,
    content: row.content,
    category: row.category,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
  });

  const results: GrowingActionKnowledgeLink[] = [];
  for (const action of actions) {
    const actionWindow = windowsById.get(action.window_id);
    if (!actionWindow) {
      results.push({ action_id: action.id, window_id: action.window_id, knowledge: [] });
      continue;
    }

    const keywordSet = new Set<string>();
    for (const tag of actionWindow.tags) keywordSet.add(tag.toLowerCase().trim());
    for (const token of tokenize(actionWindow.item_name)) keywordSet.add(token);
    for (const interest of profile.interests ?? []) {
      const normalized = interest.toLowerCase().trim();
      if (normalized) keywordSet.add(normalized);
    }
    const keywords = Array.from(keywordSet).filter(Boolean);
    if (keywords.length === 0) {
      results.push({ action_id: action.id, window_id: action.window_id, knowledge: [] });
      continue;
    }

    const scored = (knowledgeRows ?? [])
      .map((row) => {
        const rowTags = Array.isArray(row.tags) ? (row.tags as string[]).map((t) => t.toLowerCase()) : [];
        const title = String(row.title ?? "");
        const content = String(row.content ?? "");
        const haystack = `${title} ${content}`.toLowerCase();
        const tagOverlap = rowTags.filter((tag) => keywords.some((k) => tag.includes(k) || k.includes(tag))).length;
        const textOverlap = keywords.filter((k) => haystack.includes(k)).length;
        const score = tagOverlap * 3 + textOverlap;
        return { row, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    const top = scored.slice(0, limitPerAction).map((item) => normalizeKnowledge(item.row));
    results.push({ action_id: action.id, window_id: action.window_id, knowledge: top });
  }

  return results;
}
