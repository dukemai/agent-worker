import type { SupabaseClient } from "@supabase/supabase-js";
import { render } from "@react-email/render";
import { addCalendarDays, calendarDaysBetween, resolveSummerActivityPhase, stockholmDate } from "./digest-relevance";
import { fetchActivityDigestItems, fetchAutumnSchoolStartDate, fetchUpcomingBirthdays, fetchUpcomingTrips } from "./digest";
import { fetchPendingTasksForBucket } from "./fetch-pending-tasks";
import { WeeklyPlanningEmail, type WeeklyMealItem, type WeeklyPlanningContent, type WeeklyShoppingSummary } from "./emails/WeeklyPlanningEmail";
import type { PlanningDayDigestItem, Task } from "./types";

export async function loadWeeklyPlanningContent(
  supabase: SupabaseClient,
  weekStart = stockholmDate()
): Promise<WeeklyPlanningContent> {
  const weekEnd = addCalendarDays(weekStart, 6);
  const targetNow = new Date(`${weekStart}T12:00:00Z`);
  const [todayTasks, weekTasks, laterTasks, planningResult, birthdays, trips, rawActivities, schoolStartDate, planResult, shoppingResult] = await Promise.all([
    fetchPendingTasksForBucket(supabase, "today_tasks"),
    fetchPendingTasksForBucket(supabase, "this_week_tasks"),
    fetchPendingTasksForBucket(supabase, "later_tasks"),
    supabase.from("planning_days").select("id, title, category, starts_on, ends_on").eq("enabled", true).gte("starts_on", weekStart).lte("starts_on", weekEnd).order("starts_on"),
    fetchUpcomingBirthdays(supabase, targetNow),
    fetchUpcomingTrips(supabase, weekStart),
    fetchActivityDigestItems(supabase, { targetDate: weekStart }),
    fetchAutumnSchoolStartDate(supabase, weekStart),
    supabase.from("cook_plans").select("id, title").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("shared_shopping_lists").select("id, title, public_slug").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  for (const result of [planningResult, planResult, shoppingResult]) {
    if (result.error) throw result.error;
  }

  const tasks = [...todayTasks, ...weekTasks, ...laterTasks.filter((task) => {
    if (!task.due_date) return false;
    const days = calendarDaysBetween(weekStart, task.due_date.slice(0, 10));
    return days >= 0 && days <= 6;
  })].filter((task, index, all) => all.findIndex((candidate) => candidate.id === task.id) === index);

  let meals: WeeklyMealItem[] = [];
  if (planResult.data?.id) {
    const { data } = await supabase
      .from("cook_plan_items")
      .select("recipe_id, sort_order, saved_recipes(id, title)")
      .eq("plan_id", planResult.data.id)
      .order("sort_order")
      .limit(7);
    meals = ((data ?? []) as any[]).flatMap((row) => {
      const recipe = Array.isArray(row.saved_recipes) ? row.saved_recipes[0] : row.saved_recipes;
      return recipe?.id && recipe?.title ? [{ id: recipe.id, title: recipe.title }] : [];
    });
  }

  let shopping: WeeklyShoppingSummary = null;
  if (shoppingResult.data?.id) {
    const { count } = await supabase
      .from("shared_shopping_list_items")
      .select("id", { count: "exact", head: true })
      .eq("list_id", shoppingResult.data.id)
      .in("line_state", ["need", "want"]);
    shopping = {
      title: shoppingResult.data.title || "Shopping list",
      publicSlug: shoppingResult.data.public_slug,
      remainingItems: count ?? 0,
    };
  }

  const planningDays: PlanningDayDigestItem[] = ((planningResult.data ?? []) as any[]).map((row) => ({
    id: row.id,
    title: row.title,
    category: row.category,
    startsOn: row.starts_on,
    endsOn: row.ends_on ?? null,
    daysLeft: calendarDaysBetween(weekStart, row.starts_on),
    countdown: "this week",
  }));
  const activityPhase = resolveSummerActivityPhase(weekStart, schoolStartDate);
  const activities = activityPhase === "off" ? [] : rawActivities.slice(0, activityPhase === "essential_only" ? 1 : activityPhase === "taper" ? 2 : 3);

  return {
    weekStart,
    weekEnd,
    tasks,
    planningDays,
    birthdays: birthdays.filter((item) => item.daysLeft <= 7),
    trips: trips.filter((item) => item.daysLeft <= 14),
    activities,
    meals,
    shopping,
  };
}

export async function buildWeeklyPlanningEmailHtml(content: WeeklyPlanningContent, dashboardUrl: string): Promise<string> {
  return render(<WeeklyPlanningEmail content={content} dashboardUrl={dashboardUrl} />);
}
