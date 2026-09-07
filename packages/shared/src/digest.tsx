import type { SupabaseClient } from "@supabase/supabase-js";
import { render } from "@react-email/render";
import type {
  LearningProgramDigestItem,
  DigestSendReason,
  GrowingSuggestionDigestItem,
  GrowingTaskDigestItem,
  PromotionDigestItem,
  RenewalDigestItem,
  RecentGrowingKnowledgeItem,
  RecentGrowingWindowItem,
  BirthdayDigestItem,
  ActivityDigestItem,
  PlanningDayDigestItem,
  GrowingDigestMode,
  TripDigestItem,
  Task,
} from "./types";
import type { GrowingWindowKnowledgeLink } from "./types/growing";
import { DAILY_BRIEFING } from "./prompts";
import { fetchPendingTasksForBucket } from "./fetch-pending-tasks";
import { ensureGrowingProfile } from "./growing/growing-profile";
import {
  fetchGrowingWindowsByIds,
  generateWeeklySuggestions,
  generateWeeklySupportingKnowledge,
  orderGrowingWindowsByIds,
  uniqueOrderedWindowIds,
} from "./growing/weekly";
import { getISOWeekNumber, resolveRelatedSourceUrl } from "./utils";
import { DailyDigestEmail } from "./emails/DailyDigestEmail";
import {
  addCalendarDays,
  calendarDaysBetween,
  deliveryItem,
  isDigestSendWorthy,
  isNewOrChanged,
  isReminderMilestone,
  resolveSummerActivityPhase,
  stockholmDate,
  type DigestDeliveryItem,
  type DigestItemState,
} from "./digest-relevance";

/**
 * Builds digest items for promotion/deal tasks from a task list.
 * Keeps only tasks that came from email and have metadata.email_type === "promotion".
 * Maps each to { store, summary, link }, using task title as summary fallback and "Promotion" as store fallback when missing.
 */
export function extractPromotionItems(tasks: Task[]): PromotionDigestItem[] {
  return tasks
    .filter((task) => task.source === "email")
    .filter((task) => task.metadata?.email_type === "promotion")
    .map((task) => {
      const metadata = task.metadata ?? {};
      return {
        store: typeof metadata.store === "string" && metadata.store.length > 0 ? metadata.store : "Promotion",
        summary:
          typeof metadata.deal_summary === "string" && metadata.deal_summary.length > 0
            ? metadata.deal_summary
            : task.title,
        link: typeof metadata.store_link === "string" && metadata.store_link.length > 0 ? metadata.store_link : null,
      };
    });
}

/**
 * Builds digest items for renewal-reminder tasks (e.g. subscriptions, memberships).
 * Keeps only tasks with metadata.item_type === "renewal" and a due_date, computes days until due,
 * keeps items due within 30 days, sorts by days left ascending, returns at most 8.
 */
export function extractRenewalItems(tasks: Task[], targetDate = stockholmDate()): RenewalDigestItem[] {
  return tasks
    .filter((task) => task.metadata?.item_type === "renewal")
    .filter((task) => task.due_date)
    .map((task) => {
      const dueDate = task.due_date as string;
      const daysLeft = calendarDaysBetween(targetDate, dueDate.slice(0, 10));
      return {
        title: task.title,
        dueDate,
        daysLeft,
        link: typeof task.metadata?.link === "string" && task.metadata.link.length > 0 ? task.metadata.link : null,
      };
    })
    .filter((item) => item.daysLeft >= 0 && item.daysLeft <= 30)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 8);
}

/**
 * Builds digest items for growing-season tasks (from metadata.item_type === "growing").
 * Maps to { title, dueDate } and returns at most 5 items.
 */
export function extractGrowingTaskItems(tasks: Task[]): GrowingTaskDigestItem[] {
  return tasks
    .filter((task) => task.metadata?.item_type === "growing")
    .map((task) => ({
      title: task.title,
      dueDate: task.due_date,
      body: task.original_body,
    }))
    .slice(0, 5);
}

/**
 * Loads growing suggestions for the current week from growing_suggestions_log.
 * Always includes all "inspirations" for the week, plus up to 3 pending "actions".
 * Uses the current ISO week number against week_number.
 */
export async function fetchWeeklyGrowingSuggestions(
  supabase: SupabaseClient,
  targetDate = stockholmDate()
): Promise<GrowingSuggestionDigestItem[]> {
  const weekNumber = getISOWeekNumber(new Date(`${targetDate}T12:00:00Z`));

  const { data, error } = await supabase
    .from("growing_suggestions_log")
    .select("id, window_id, title, details, suggestion_kind, status, suggested_bucket, week_number")
    .eq("week_number", weekNumber)
    .order("created_at", { ascending: true });

  if (error) return [];

  return ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    window_id: row.window_id,
    title: row.title,
    details: row.details,
    status: row.status,
    suggestion_kind: row.suggestion_kind,
    suggested_bucket: row.suggested_bucket,
    week_number: row.week_number,
  }));
}

/**
 * Flattens per-window supporting knowledge into a deduped list for the digest email payload.
 */
export function flattenSupportingKnowledgeForDigest(
  links: GrowingWindowKnowledgeLink[]
): RecentGrowingKnowledgeItem[] {
  const seen = new Set<string>();
  const out: RecentGrowingKnowledgeItem[] = [];
  for (const link of links) {
    for (const k of link.knowledge) {
      if (!seen.has(k.id)) {
        seen.add(k.id);
        out.push({
          title: k.title,
          content: k.content,
          category: k.category,
          sourceUrl: null,
        });
      }
    }
  }
  return out;
}

/**
 * Loads recent growing knowledge and window items from the last 24 hours for the digest.
 * Queries growing_knowledge (title, content, category, source url via growing_sources) and
 * growing_windows (item_name, stockholm_note, source url) in parallel. Only includes windows
 * with a non-null source_id. Returns at most 6 knowledge items and 4 window items, each with
 * sourceUrl resolved from the relation (or null). Used to show "recent tips" in the daily email.
 */
export async function fetchRecentGrowingKnowledge(
  supabase: SupabaseClient
): Promise<{ knowledge: RecentGrowingKnowledgeItem[]; windows: RecentGrowingWindowItem[] }> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [knowledgeResult, windowsResult] = await Promise.all([
    supabase
      .from("growing_knowledge")
      .select("title, content, category, source:growing_sources(url)")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("growing_windows")
      .select("item_name, stockholm_note, source:growing_sources(url)")
      .not("source_id", "is", null)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  let knowledge =
    knowledgeResult.error || !knowledgeResult.data
      ? []
      : knowledgeResult.data.map((row) => ({
          title: row.title,
          content: row.content,
          category: row.category,
          sourceUrl: resolveRelatedSourceUrl(row.source),
        }));

  // Fallback: if nothing was added in the last 24h, still show latest verified knowledge.
  if (knowledge.length === 0) {
    const { data: fallbackKnowledge, error: fallbackError } = await supabase
      .from("growing_knowledge")
      .select("title, content, category, source:growing_sources(url)")
      .eq("verified", true)
      .order("created_at", { ascending: false })
      .limit(6);

    if (!fallbackError && fallbackKnowledge) {
      knowledge = fallbackKnowledge.map((row) => ({
        title: row.title,
        content: row.content,
        category: row.category,
        sourceUrl: resolveRelatedSourceUrl(row.source),
      }));
    }
  }

  const windows =
    windowsResult.error || !windowsResult.data
      ? []
      : windowsResult.data.map((row) => ({
          title: row.item_name,
          note: row.stockholm_note,
          sourceUrl: resolveRelatedSourceUrl(row.source),
        }));

  return { knowledge, windows };
}

/**
 * Calculates days until a birthday (Month/Day) handling year-end wrap-around.
 */
function getDaysUntilBirthday(month: number, day: number, now: Date): number {
  const currentYear = now.getUTCFullYear();
  let target = new Date(Date.UTC(currentYear, month - 1, day));
  
  // If birthday already passed this year (by more than 1 day to handle timezones safely), check next year
  if (target.getTime() < now.getTime() - 86400000) {
    target = new Date(Date.UTC(currentYear + 1, month - 1, day));
  }
  
  const diffTime = target.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Loads upcoming birthdays from the birthdays table.
 * Keeps items occurring in the next 20 days.
 */
export async function fetchUpcomingBirthdays(
  supabase: SupabaseClient,
  now = new Date()
): Promise<BirthdayDigestItem[]> {
  const { data, error } = await supabase
    .from("birthdays")
    .select("name, birthday_month, birthday_day, category")
    .eq("status", "active");

  if (error || !data) return [];

  return data
    .map((row) => ({
      name: row.name,
      category: row.category,
      daysLeft: getDaysUntilBirthday(row.birthday_month, row.birthday_day, now),
    }))
    .filter((item) => item.daysLeft <= 20)
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

/**
 * Loads upcoming trips close enough to be useful in the daily digest.
 * Keeps non-archived trips starting in the next 45 days.
 */
export async function fetchUpcomingTrips(
  supabase: SupabaseClient,
  targetDate = stockholmDate()
): Promise<TripDigestItem[]> {
  const today = targetDate;
  const { data, error } = await supabase
    .from("trips")
    .select("id, title, destination, start_date, end_date, status")
    .neq("status", "archived")
    .gte("start_date", today)
    .order("start_date", { ascending: true })
    .limit(8);

  if (error || !data) return [];

  const trips = (data as any[])
    .filter((row) => typeof row.start_date === "string" && typeof row.title === "string")
    .map((row) => ({
      id: row.id,
      title: row.title,
      destination: typeof row.destination === "string" && row.destination.trim().length > 0 ? row.destination : null,
      startDate: row.start_date,
      endDate: typeof row.end_date === "string" ? row.end_date : null,
      status: typeof row.status === "string" ? row.status : "planning",
      daysLeft: calendarDaysBetween(targetDate, row.start_date),
      readinessWarnings: [],
    }))
    .filter((item) => item.daysLeft >= 0 && item.daysLeft <= 45)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 5);

  if (trips.length === 0) return trips;
  const { data: itinerary } = await supabase
    .from("trip_itinerary_items")
    .select("trip_id, day_number")
    .in("trip_id", trips.map((trip) => trip.id))
    .eq("day_number", 1);
  const withDayOne = new Set(((itinerary ?? []) as any[]).map((row) => row.trip_id));
  return trips.map((trip) => ({
    ...trip,
    readinessWarnings: trip.daysLeft <= 21 && !withDayOne.has(trip.id) ? ["Day 1 itinerary is missing"] : [],
  }));
}

function formatActivityDateLabel(row: any): string | null {
  const occurrenceDates = Array.isArray(row.occurrence_dates) ? row.occurrence_dates.filter(Boolean) : [];
  if (occurrenceDates.length > 0) return occurrenceDates.slice(0, 3).join(", ");
  if (typeof row.valid_from === "string" && typeof row.valid_until === "string") {
    return `${row.valid_from} - ${row.valid_until}`;
  }
  if (typeof row.valid_from === "string") return `From ${row.valid_from}`;
  if (typeof row.valid_until === "string") return `Until ${row.valid_until}`;
  return null;
}

function seasonalOverlaps(row: any, start: string, end: string): boolean {
  const occurrenceDates = Array.isArray(row.occurrence_dates) ? row.occurrence_dates.filter(Boolean) : [];
  if (occurrenceDates.some((date: string) => date >= start && date <= end)) return true;
  const validFrom = typeof row.valid_from === "string" ? row.valid_from : start;
  const validUntil = typeof row.valid_until === "string" ? row.valid_until : end;
  return validFrom <= end && validUntil >= start;
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/**
 * Loads a concise set of kid activity suggestions for the digest.
 * Prioritizes today/this-week seasonal instances, booking deadlines, rainy-day fits, then evergreen fallbacks.
 */
export async function fetchActivityDigestItems(
  supabase: SupabaseClient,
  options?: { rainForecast?: boolean; targetDate?: string }
): Promise<ActivityDigestItem[]> {
  const today = options?.targetDate ?? stockholmDate();
  const weekEnd = addCalendarDays(today, 6);

  const [seasonalResult, evergreenResult] = await Promise.all([
    supabase
      .from("seasonal_activity_instances")
      .select(
        "id, title, description, valid_from, valid_until, occurrence_dates, time_text, address, area, cost_level, booking_required, booking_deadline, booking_url, weather_fit, tags, status, favorite"
      )
      .eq("status", "active")
      .limit(80),
    supabase
      .from("local_activities")
      .select("id, title, description, address, area, cost_level, booking_required, location_url, weather_fit, tags, status, favorite")
      .eq("status", "active")
      .eq("is_evergreen", true)
      .limit(30),
  ]);

  if (seasonalResult.error && evergreenResult.error) return [];

  const seasonal = ((seasonalResult.data ?? []) as any[])
    .filter((row) => row.favorite === true && seasonalOverlaps(row, today, weekEnd))
    .sort((a, b) => {
      const deadlineA = typeof a.booking_deadline === "string" ? a.booking_deadline : "9999-12-31";
      const deadlineB = typeof b.booking_deadline === "string" ? b.booking_deadline : "9999-12-31";
      const dateA = typeof a.valid_from === "string" ? a.valid_from : "9999-12-31";
      const dateB = typeof b.valid_from === "string" ? b.valid_from : "9999-12-31";
      return Number(b.favorite === true) - Number(a.favorite === true) || deadlineA.localeCompare(deadlineB) || dateA.localeCompare(dateB);
    });

  const evergreen = ((evergreenResult.data ?? []) as any[])
    .filter((row) => row.favorite === true && (!options?.rainForecast || row.weather_fit === "indoor" || row.weather_fit === "mixed"))
    .sort((a, b) => Number(b.favorite === true) - Number(a.favorite === true))
    .slice(0, 2);

  const picked: ActivityDigestItem[] = [];
  const seen = new Set<string>();
  const push = (item: ActivityDigestItem) => {
    if (seen.has(item.id) || picked.length >= 5) return;
    seen.add(item.id);
    picked.push(item);
  };

  seasonal
    .filter((row) => seasonalOverlaps(row, today, today))
    .forEach((row) =>
      push({
        id: row.id,
        title: row.title,
        description: row.description ?? null,
        itemType: "seasonal",
        dateLabel: formatActivityDateLabel(row),
        timeText: row.time_text ?? null,
        area: row.area ?? null,
        address: row.address ?? null,
        weatherFit: row.weather_fit ?? "mixed",
        costLevel: row.cost_level ?? "unknown",
        bookingRequired: row.booking_required === true,
        bookingDeadline: row.booking_deadline ?? null,
        bookingUrl: row.booking_url ?? null,
        tags: Array.isArray(row.tags) ? row.tags : [],
        favorite: row.favorite === true,
        reason: row.favorite === true ? "Favorite happening today" : "Happening today",
      })
    );

  seasonal
    .filter((row) => row.booking_required === true)
    .forEach((row) =>
      push({
        id: row.id,
        title: row.title,
        description: row.description ?? null,
        itemType: "seasonal",
        dateLabel: formatActivityDateLabel(row),
        timeText: row.time_text ?? null,
        area: row.area ?? null,
        address: row.address ?? null,
        weatherFit: row.weather_fit ?? "mixed",
        costLevel: row.cost_level ?? "unknown",
        bookingRequired: true,
        bookingDeadline: row.booking_deadline ?? null,
        bookingUrl: row.booking_url ?? null,
        tags: Array.isArray(row.tags) ? row.tags : [],
        favorite: row.favorite === true,
        reason: row.favorite === true ? "Favorite that needs booking" : "Booking needed",
      })
    );

  seasonal.forEach((row) =>
    push({
      id: row.id,
      title: row.title,
      description: row.description ?? null,
      itemType: "seasonal",
      dateLabel: formatActivityDateLabel(row),
      timeText: row.time_text ?? null,
      area: row.area ?? null,
      address: row.address ?? null,
      weatherFit: row.weather_fit ?? "mixed",
      costLevel: row.cost_level ?? "unknown",
      bookingRequired: row.booking_required === true,
      bookingDeadline: row.booking_deadline ?? null,
      bookingUrl: row.booking_url ?? null,
      tags: Array.isArray(row.tags) ? row.tags : [],
      favorite: row.favorite === true,
      reason: row.favorite === true ? "Favorite for this week" : "Relevant this week",
    })
  );

  evergreen.forEach((row) =>
    push({
      id: row.id,
      title: row.title,
      description: row.description ?? null,
      itemType: "evergreen",
      dateLabel: null,
      timeText: null,
      area: row.area ?? null,
      address: row.address ?? null,
      weatherFit: row.weather_fit ?? "mixed",
      costLevel: row.cost_level ?? "unknown",
      bookingRequired: row.booking_required === true,
      bookingDeadline: null,
      bookingUrl: row.location_url ?? null,
      tags: Array.isArray(row.tags) ? row.tags : [],
      favorite: row.favorite === true,
      reason: row.favorite === true ? "Favorite fallback" : options?.rainForecast ? "Weather-friendly fallback" : "Evergreen fallback",
    })
  );

  return picked;
}

/**
 * Formats a list of tasks as plain text for the briefing context (e.g. "  • Title — due YYYY-MM-DD").
 * Uses Swedish locale for dates. Returns "  (none)" when the list is empty.
 */
export function formatTaskList(tasks: Task[]): string {
  if (tasks.length === 0) return "  (none)";
  return tasks
    .map((t) => {
      const due = t.due_date ? ` — due ${new Date(t.due_date).toLocaleDateString("sv-SE")}` : "";
      return `  • ${t.title}${due}`;
    })
    .join("\n");
}

/**
 * List of upcoming major Swedish public holidays for countdown.
 * TODO: Replace this hardcoded list with a reliable Swedish holiday data source (API or maintained calendar file).
 */
const SWEDISH_HOLIDAYS = [
  { name: "Långfredagen", date: "2026-04-03", is_red_day: true },
  { name: "Påskdagen", date: "2026-04-05", is_red_day: true },
  { name: "Annandag påsk", date: "2026-04-06", is_red_day: true },
  { name: "Valborg", date: "2026-04-30", is_red_day: false },
  { name: "Första maj", date: "2026-05-01", is_red_day: true },
  { name: "Kristi himmelsfärds dag", date: "2026-05-14", is_red_day: true },
  { name: "Sveriges nationaldag", date: "2026-06-06", is_red_day: true },
  { name: "Midsommarafton", date: "2026-06-19", is_red_day: false },
  { name: "Allhelgonadagen", date: "2026-10-31", is_red_day: true },
  { name: "Julafton", date: "2026-12-24", is_red_day: false },
  { name: "Juldagen", date: "2026-12-25", is_red_day: true },
  { name: "Annandag jul", date: "2026-12-26", is_red_day: true },
  { name: "Nyårsafton", date: "2026-12-31", is_red_day: false },
  { name: "Nyårsdagen", date: "2027-01-01", is_red_day: true },
];

function getNextHoliday(now = new Date(), leadDays = 21) {
  for (const h of SWEDISH_HOLIDAYS) {
    const holidayDate = new Date(`${h.date}T00:00:00Z`);
    const days = utcCalendarDaysUntilDue(h.date, now);
    if (days >= 0 && days <= leadDays) {
      return { ...h, date: holidayDate };
    }
  }
  return null;
}

type DigestPreferences = {
  redDayLeadDays: number;
  highGrowthStart: string;
  highGrowthEnd: string;
  harvestStart: string;
  harvestEnd: string;
};

const DEFAULT_DIGEST_PREFERENCES: DigestPreferences = {
  redDayLeadDays: 21,
  highGrowthStart: "04-01",
  highGrowthEnd: "07-31",
  harvestStart: "08-01",
  harvestEnd: "10-15",
};

async function fetchDigestPreferences(supabase: SupabaseClient): Promise<DigestPreferences> {
  const { data, error } = await supabase.from("digest_preferences").select("*").eq("singleton", true).maybeSingle();
  if (error || !data) return DEFAULT_DIGEST_PREFERENCES;
  return {
    redDayLeadDays: typeof data.red_day_lead_days === "number" ? data.red_day_lead_days : 21,
    highGrowthStart: data.high_growth_start ?? "04-01",
    highGrowthEnd: data.high_growth_end ?? "07-31",
    harvestStart: data.harvest_start ?? "08-01",
    harvestEnd: data.harvest_end ?? "10-15",
  };
}

function isMonthDayBetween(value: string, start: string, end: string): boolean {
  return start <= end ? value >= start && value <= end : value >= start || value <= end;
}

function resolveGrowingMode(now: Date, preferences: DigestPreferences): GrowingDigestMode {
  const monthDay = now.toISOString().slice(5, 10);
  if (isMonthDayBetween(monthDay, preferences.highGrowthStart, preferences.highGrowthEnd)) return "high_growth";
  if (isMonthDayBetween(monthDay, preferences.harvestStart, preferences.harvestEnd)) return "harvest";
  return "quiet";
}

async function fetchPlanningDayItems(supabase: SupabaseClient, now: Date, redDayLeadDays: number): Promise<PlanningDayDigestItem[]> {
  const today = now.toISOString().slice(0, 10);
  const horizon = addUtcDays(now, 180).toISOString().slice(0, 10);
  const { data, error } = await supabase.from("planning_days").select("id, title, category, starts_on, ends_on").eq("enabled", true).gte("starts_on", today).lte("starts_on", horizon).order("starts_on");
  if (error || !data) return [];
  return (data as any[]).map((row) => {
    const daysLeft = utcCalendarDaysUntilDue(row.starts_on, now);
    const leadDays = row.category === "red_day" ? redDayLeadDays : 21;
    return { id: row.id, title: row.title, category: row.category, startsOn: row.starts_on, endsOn: row.ends_on ?? null, daysLeft, countdown: formatHumanScaleCountdown(daysLeft) ?? "", leadDays };
  }).filter((row) => row.daysLeft >= 0 && row.daysLeft <= row.leadDays && row.countdown).slice(0, 5);
}

const SCHOOL_START_TITLE_PATTERN = /school starts?|back to school|first school day|skolstart|första skoldag|terminens första dag|läsårets första skoldag/i;

export async function fetchAutumnSchoolStartDate(
  supabase: SupabaseClient,
  targetDate: string
): Promise<string | null> {
  const year = targetDate.slice(0, 4);
  const { data, error } = await supabase
    .from("planning_days")
    .select("title, starts_on")
    .eq("enabled", true)
    .eq("category", "school")
    .gte("starts_on", `${year}-07-01`)
    .lte("starts_on", `${year}-09-30`)
    .lte("starts_on", targetDate)
    .order("starts_on", { ascending: false });
  if (error || !data) return null;
  const schoolStart = (data as { title: string; starts_on: string }[]).find((row) =>
    SCHOOL_START_TITLE_PATTERN.test(row.title)
  );
  return schoolStart?.starts_on ?? null;
}

/** Calendar-day difference: due date minus today in UTC (aligns with YYYY-MM-DD due dates from the DB). */
function utcCalendarDaysUntilDue(ymd: string, now: Date): number {
  const [y, m, d] = ymd.split("-").map(Number);
  const dueUtc = Date.UTC(y, m - 1, d);
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((dueUtc - todayUtc) / (1000 * 60 * 60 * 24));
}

export function formatHumanScaleCountdown(days: number): string | null {
  if (days < 0) return null;
  if (days === 0) return "idag";
  if (days === 1) return "imorgon";
  if (days <= 13) return `${days} dagar`;
  if (days <= 55) {
    const weeks = Math.max(2, Math.round(days / 7));
    return `cirka ${weeks} veckor`;
  }
  if (days <= 364) {
    const months = Math.max(2, Math.round(days / 30));
    return `cirka ${months} månader`;
  }
  return null;
}

/**
 * Swedish line for the nearest task deadline (excludes renewal reminders — they have their own digest section).
 * Returns null when no pending task has a due date.
 */
export function formatTaskDeadlineCountdownLine(tasks: Task[], now: Date): string | null {
  const eligible = tasks.filter(
    (t) => t.due_date && t.metadata?.item_type !== "renewal"
  );
  if (eligible.length === 0) return null;

  eligible.sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));
  const earliestYmd = eligible[0].due_date!.slice(0, 10);
  const sameDay = eligible.filter((t) => t.due_date!.slice(0, 10) === earliestYmd);
  const days = utcCalendarDaysUntilDue(earliestYmd, now);

  const firstTitle = sameDay[0].title.trim() || "en uppgift";
  const extra = sameDay.length - 1;
  const subject =
    extra === 0
      ? firstTitle
      : `${firstTitle} och ${extra} ${extra === 1 ? "uppgift" : "uppgifter"} till`;

  if (days < 0) {
    const abs = -days;
    return `Deadline för ${subject} passerade för ${abs} ${abs === 1 ? "dag" : "dagar"} sedan.`;
  }
  if (days === 0) {
    return `Idag är deadline för ${subject}.`;
  }
  return `Det är ${days} ${days === 1 ? "dag" : "dagar"} kvar till deadline för ${subject}.`;
}

/**
 * Generates the daily briefing narrative using a simple template (no AI calls).
 * Injects current date (sv-SE), weather summary, and task counts (today / this week / later).
 * Optionally appends a rain reminder. Returns plain-text paragraphs separated by newlines.
 *
 * NOTE: `apiKey` is kept for backward compatibility with existing callers but is not used.
 */
export async function generateBriefingNarrative(
  // kept for signature compatibility; not used
  _apiKey: string,
  weatherSummary: string,
  todayTasks: Task[],
  thisWeekTasks: Task[],
  laterTasks: Task[],
  birthdayItems: BirthdayDigestItem[],
  tripItems: TripDigestItem[],
  activityItems: ActivityDigestItem[],
  planningDayItems: PlanningDayDigestItem[],
  redDayLeadDays: number,
  rainForecast: boolean,
  targetDate = stockholmDate()
): Promise<string> {
  const now = new Date(`${targetDate}T12:00:00Z`);
  const lines: string[] = [];

  const allBucketTasks = [...todayTasks, ...thisWeekTasks, ...laterTasks];
  const taskDeadlineLine = formatTaskDeadlineCountdownLine(allBucketTasks, now);
  if (taskDeadlineLine) {
    lines.push(taskDeadlineLine);
  }

  if (rainForecast) {
    lines.push(`Regn kan påverka dagen: ${weatherSummary}. Kom ihåg barnens regnkläder.`);
  }

  return lines.join("\n\n");
}

/**
 * Builds the full HTML body for the daily digest email.
 * Includes date (sv-SE), weather block, briefing narrative, task sections (today / this week / later),
 * optional inspirations section, new growing knowledge, renewals, learning program days, and deals.
 * dashboardUrl is used for the footer link. Learning programs deliver their explicitly selected current day.
 */
export async function buildEmailHtml(
  weatherSummary: string,
  rainForecast: boolean,
  todayTasks: Task[],
  thisWeekTasks: Task[],
  laterTasks: Task[],
  learningProgramItems: LearningProgramDigestItem[],
  promotionItems: PromotionDigestItem[],
  renewalItems: RenewalDigestItem[],
  growingSuggestions: GrowingSuggestionDigestItem[],
  recentGrowingKnowledge: RecentGrowingKnowledgeItem[],
  recentGrowingWindows: RecentGrowingWindowItem[],
  birthdayItems: BirthdayDigestItem[],
  tripItems: TripDigestItem[],
  activityItems: ActivityDigestItem[],
  planningDayItems: PlanningDayDigestItem[],
  growingMode: GrowingDigestMode,
  narrative: string,
  dashboardUrl: string,
  targetDate = stockholmDate(),
  sendReasons: DigestSendReason[] = []
): Promise<string> {
  const date = new Date(`${targetDate}T12:00:00Z`).toLocaleDateString("sv-SE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return await render(
    <DailyDigestEmail
      date={date}
      weatherSummary={weatherSummary}
      rainForecast={rainForecast}
      todayTasks={todayTasks}
      thisWeekTasks={thisWeekTasks}
      laterTasks={laterTasks}
      learningProgramItems={learningProgramItems}
      promotionItems={promotionItems}
      renewalItems={renewalItems}
      birthdayItems={birthdayItems}
      growingSuggestions={growingSuggestions}
      recentGrowingKnowledge={recentGrowingKnowledge}
      recentGrowingWindows={recentGrowingWindows}
      narrative={narrative}
      tripItems={tripItems}
      activityItems={activityItems}
      planningDayItems={planningDayItems}
      growingMode={growingMode}
      dashboardUrl={dashboardUrl}
      sendReasons={sendReasons}
    />
  );
}

/**
 * Options for {@link loadDigestEmailContent}. Weather is supplied by the caller (real API in worker, placeholders in preview).
 */
export type LoadDigestEmailContentOptions = {
  /**
   * When true and the weekly log is empty for the current week, generate and persist suggestions.
   * Use true for the production daily digest; false for dashboard preview so opening preview does not mutate the log.
   */
  ensureWeeklySuggestionsWhenEmpty?: boolean;
  weatherSummary: string;
  rainForecast: boolean;
  /** Stockholm calendar date represented by this digest. */
  targetDate?: string;
  /**
   * If set, used as the briefing narrative instead of the template from {@link generateBriefingNarrative}.
   */
  narrativeOverride?: string;
};

/**
 * Full payload for the daily digest email (tasks, growing sections, narrative). Built by {@link loadDigestEmailContent}.
 */
export type DigestEmailContent = {
  targetDate: string;
  shouldSend: boolean;
  sendReasons: DigestSendReason[];
  deliveryItems: DigestDeliveryItem[];
  weatherSummary: string;
  rainForecast: boolean;
  todayTasks: Task[];
  thisWeekTasks: Task[];
  laterTasks: Task[];
  learningProgramItems: LearningProgramDigestItem[];
  promotionItems: PromotionDigestItem[];
  renewalItems: RenewalDigestItem[];
  birthdayItems: BirthdayDigestItem[];
  tripItems: TripDigestItem[];
  activityItems: ActivityDigestItem[];
  planningDayItems: PlanningDayDigestItem[];
  growingMode: GrowingDigestMode;
  growingSuggestions: GrowingSuggestionDigestItem[];
  recentGrowingKnowledge: RecentGrowingKnowledgeItem[];
  recentGrowingWindows: RecentGrowingWindowItem[];
  narrative: string;
};

/**
 * Loads everything needed for the daily digest HTML: bucket tasks, promotions/renewals, weekly growing suggestions,
 * supporting knowledge for unfinished growing tasks with `window_id`, and the briefing narrative.
 * Shared by the worker cron and the dashboard digest preview so they stay in sync.
 */
export async function loadDigestEmailContent(
  supabase: SupabaseClient,
  options: LoadDigestEmailContentOptions
): Promise<DigestEmailContent> {
  const targetDate = options.targetDate ?? stockholmDate();
  const targetNow = new Date(`${targetDate}T12:00:00Z`);

  const [preferences, statesResult] = await Promise.all([
    fetchDigestPreferences(supabase),
    supabase.from("digest_item_delivery_state").select("item_key, content_hash, last_shown_on, show_count"),
  ]);
  if (statesResult.error) throw statesResult.error;
  const states = new Map<string, DigestItemState>(
    ((statesResult.data ?? []) as DigestItemState[]).map((state) => [state.item_key, state])
  );
  const deliveryItems: DigestDeliveryItem[] = [];
  const includeFresh = <T,>(key: string, value: T, force = false): boolean => {
    const item = deliveryItem(key, value);
    if (!force && !isNewOrChanged(item, states)) return false;
    deliveryItems.push(item);
    return true;
  };
  const takeFresh = <T,>(
    items: T[],
    limit: number,
    keyFor: (item: T) => string,
    valueFor: (item: T) => unknown = (item) => item
  ): T[] => {
    const picked: T[] = [];
    for (const item of items) {
      if (picked.length >= limit) break;
      if (includeFresh(keyFor(item), valueFor(item))) picked.push(item);
    }
    return picked;
  };

  const [rawTodayTasks, rawThisWeekTasks, laterTasks, rawBirthdayItems, rawTripItems, rawActivityItems, rawPlanningDayItems, schoolStartDate, rawLearningProgramItems] = await Promise.all([
    fetchPendingTasksForBucket(supabase, "today_tasks"),
    fetchPendingTasksForBucket(supabase, "this_week_tasks"),
    fetchPendingTasksForBucket(supabase, "later_tasks"),
    fetchUpcomingBirthdays(supabase, targetNow),
    fetchUpcomingTrips(supabase, targetDate),
    fetchActivityDigestItems(supabase, { rainForecast: options.rainForecast, targetDate }),
    fetchPlanningDayItems(supabase, targetNow, preferences.redDayLeadDays),
    fetchAutumnSchoolStartDate(supabase, targetDate),
    fetchActiveLearningProgramItems(supabase),
  ]);
  const learningProgramItems = rawLearningProgramItems.filter(item => includeFresh(`learning-program:${item.programId}:${item.dayNumber}`, { title: item.dayTitle, content: item.content }, true));
  const selectTask = (task: Task) => {
    if (task.metadata?.item_type === "renewal" || task.metadata?.item_type === "growing" || task.metadata?.email_type === "promotion") return false;
    const daysLeft = task.due_date ? calendarDaysBetween(targetDate, task.due_date.slice(0, 10)) : null;
    const force = daysLeft !== null && daysLeft <= 0;
    return includeFresh(`task:${task.id}`, { title: task.title, dueDate: task.due_date }, force);
  };
  const todayTasks = rawTodayTasks.filter(selectTask);
  const thisWeekTasks = rawThisWeekTasks.filter(selectTask);
  const allRawTasks = [...rawTodayTasks, ...rawThisWeekTasks, ...laterTasks];
  const promotionItems = takeFresh(
    extractPromotionItems(allRawTasks),
    3,
    (item) => `promotion:${item.store}:${item.summary}`
  );
  const renewalItems = extractRenewalItems(allRawTasks, targetDate).filter((item) =>
    includeFresh(
      `renewal:${item.title}`,
      { title: item.title, dueDate: item.dueDate, link: item.link },
      isReminderMilestone(item.daysLeft, [30, 14, 7, 2, 1, 0])
    )
  );
  const birthdayItems = rawBirthdayItems.filter((item) =>
    isReminderMilestone(item.daysLeft, [14, 7, 2, 1, 0]) &&
    includeFresh(`birthday:${item.name}`, { name: item.name, category: item.category }, true)
  );
  const tripItems = rawTripItems.filter((item) => {
    const stableValue = { title: item.title, destination: item.destination, startDate: item.startDate, endDate: item.endDate, warnings: item.readinessWarnings };
    const changed = isNewOrChanged(deliveryItem(`trip:${item.id}`, stableValue), states);
    return includeFresh(`trip:${item.id}`, stableValue, changed || isReminderMilestone(item.daysLeft, [14, 7, 3, 1, 0]));
  });
  const planningDayItems = rawPlanningDayItems.filter((item) =>
    includeFresh(
      `planning-day:${item.id}`,
      { title: item.title, category: item.category, startsOn: item.startsOn, endsOn: item.endsOn },
      isReminderMilestone(item.daysLeft, [21, 14, 7, 2, 1, 0])
    )
  );
  const dayOfWeek = targetNow.getUTCDay();
  const isWeekendPlanningDay = dayOfWeek === 4 || dayOfWeek === 5 || dayOfWeek === 6;
  const summerActivityPhase = resolveSummerActivityPhase(targetDate, schoolStartDate);
  const eligibleActivityItems = rawActivityItems.filter((item) => {
    const happensToday = item.dateLabel?.includes(targetDate) === true;
    const deadlineDays = item.bookingDeadline ? calendarDaysBetween(targetDate, item.bookingDeadline) : null;
    const urgentBooking = deadlineDays !== null && deadlineDays >= 0 && deadlineDays <= 2;
    if (summerActivityPhase === "off") return false;
    if (summerActivityPhase === "essential_only") return happensToday || urgentBooking;
    return happensToday || urgentBooking || isWeekendPlanningDay;
  });
  const activityItems: ActivityDigestItem[] = [];
  const activityLimit = summerActivityPhase === "taper" ? 2 : summerActivityPhase === "essential_only" ? 1 : 3;
  for (const item of eligibleActivityItems) {
    if (activityItems.length >= activityLimit) break;
    const happensToday = item.dateLabel?.includes(targetDate) === true;
    const deadlineDays = item.bookingDeadline ? calendarDaysBetween(targetDate, item.bookingDeadline) : null;
    const urgentBooking = deadlineDays !== null && deadlineDays >= 0 && deadlineDays <= 2;
    if (includeFresh(`activity:${item.id}`, item, happensToday || urgentBooking)) activityItems.push(item);
  }
  const growingMode = resolveGrowingMode(targetNow, preferences);

  let growingSuggestions: GrowingSuggestionDigestItem[] = await fetchWeeklyGrowingSuggestions(supabase, targetDate);
  const hadStoredGrowingSuggestions = growingSuggestions.length > 0;
  const isGrowingDigestDay = dayOfWeek === 1 || dayOfWeek === 5;
  if (!isGrowingDigestDay) growingSuggestions = [];
  if (growingMode === "quiet") growingSuggestions = [];
  if (growingMode === "harvest") {
    const harvestPattern = /harvest|skörd|pick|plock|preserv|förvar|torka|frys/i;
    const harvestFocused = growingSuggestions.filter((item) => harvestPattern.test(`${item.title} ${item.details}`));
    growingSuggestions = (harvestFocused.length > 0 ? harvestFocused : growingSuggestions).slice(0, 2);
  }
  if (growingMode !== "quiet" && isGrowingDigestDay && !hadStoredGrowingSuggestions && options.ensureWeeklySuggestionsWhenEmpty) {
    try {
      const profile = await ensureGrowingProfile(supabase);
      const generated = await generateWeeklySuggestions(supabase, profile);
      growingSuggestions = generated.map((s) => ({
        id: s.id,
        window_id: s.window_id,
        title: s.title,
        details: s.details,
        status: s.status,
        suggestion_kind: s.suggestion_kind,
        suggested_bucket: s.suggested_bucket,
        week_number: s.week_number,
      }));
    } catch (err) {
      console.warn("Growing suggestions generation during digest failed, continuing:", err);
    }
  }
  if (growingMode === "harvest") {
    const harvestPattern = /harvest|skörd|pick|plock|preserv|förvar|torka|frys/i;
    const harvestFocused = growingSuggestions.filter((item) => harvestPattern.test(`${item.title} ${item.details}`));
    growingSuggestions = (harvestFocused.length > 0 ? harvestFocused : growingSuggestions).slice(0, 2);
  }
  growingSuggestions = takeFresh(
    growingSuggestions.filter((item) => item.status === "pending"),
    3,
    (item) => `growing-suggestion:${item.id ?? item.window_id ?? item.title}`
  );

  // "Related Knowledge" in the email: derived from unfinished growing tasks linked to `growing_windows` via `window_id`.
  let relatedGrowingKnowledge: RecentGrowingKnowledgeItem[] = [];
  try {
    const undoneGrowingTasks = allRawTasks.filter(
      (t) =>
        t.status !== "done" &&
        t.metadata?.item_type === "growing" &&
        t.window_id
    );
    const windowIds = uniqueOrderedWindowIds(undoneGrowingTasks);
    if (windowIds.length > 0) {
      const profile = await ensureGrowingProfile(supabase);
      const windows = await fetchGrowingWindowsByIds(supabase, windowIds);
      const orderedWindows = orderGrowingWindowsByIds(windowIds, windows);
      const links = await generateWeeklySupportingKnowledge(supabase, orderedWindows, profile);
      relatedGrowingKnowledge = flattenSupportingKnowledgeForDigest(links);
    }
  } catch (err) {
    console.warn("Supporting knowledge for digest failed, continuing:", err);
  }
  if (growingMode === "quiet") relatedGrowingKnowledge = [];
  if (growingMode === "harvest") relatedGrowingKnowledge = relatedGrowingKnowledge.slice(0, 2);
  if (!isGrowingDigestDay) relatedGrowingKnowledge = [];
  relatedGrowingKnowledge = takeFresh(
    relatedGrowingKnowledge,
    4,
    (item) => `growing-knowledge:${item.title}`
  );

  const recentGrowingWindows: RecentGrowingWindowItem[] = [];

  let narrative: string;
  if (options.narrativeOverride !== undefined) {
    narrative = options.narrativeOverride;
  } else {
    try {
      narrative = await generateBriefingNarrative(
        "",
        options.weatherSummary,
        todayTasks,
        thisWeekTasks,
        [],
        birthdayItems,
        tripItems,
        activityItems,
        planningDayItems,
        preferences.redDayLeadDays,
        options.rainForecast,
        targetDate
      );
    } catch (err) {
      console.warn("Briefing narrative generation failed, using fallback:", err);
      narrative = "Have a great day! Check your tasks below.";
    }
  }

  const sendReasonCounts = {
    rainForecast: options.rainForecast,
    todayTasks: todayTasks.length,
    thisWeekTasks: thisWeekTasks.length,
    renewals: renewalItems.length,
    birthdays: birthdayItems.length,
    trips: tripItems.length,
    activities: activityItems.length,
    planningDays: planningDayItems.length,
    growingSuggestions: growingSuggestions.length,
    growingKnowledge: relatedGrowingKnowledge.length,
    promotions: promotionItems.length,
    learningPrograms: learningProgramItems.length,
  };
  const shouldSend = isDigestSendWorthy(sendReasonCounts);
  const sendReasons: DigestSendReason[] = [
    { code: "learning", label: "current learning program day", count: learningProgramItems.length },
    { code: "rain", label: "rain may affect the family routine", count: options.rainForecast ? 1 : 0 },
    { code: "today_tasks", label: "new, changed, or urgent task for today", count: todayTasks.length },
    { code: "week_tasks", label: "new or changed task for this week", count: thisWeekTasks.length },
    { code: "renewals", label: "renewal reminder reached a milestone", count: renewalItems.length },
    { code: "birthdays", label: "birthday reminder reached a milestone", count: birthdayItems.length },
    { code: "trips", label: "trip reminder or readiness change", count: tripItems.length },
    { code: "activities", label: "timely favorite activity", count: activityItems.length },
    { code: "planning_days", label: "school, closure, or family planning date", count: planningDayItems.length },
    { code: "growing", label: "current growing action or knowledge", count: growingSuggestions.length + relatedGrowingKnowledge.length },
    { code: "promotions", label: "new or changed promotion", count: promotionItems.length },
  ].filter((reason) => reason.count > 0);

  return {
    targetDate,
    shouldSend,
    sendReasons,
    deliveryItems,
    weatherSummary: options.weatherSummary,
    rainForecast: options.rainForecast,
    todayTasks,
    thisWeekTasks,
    laterTasks,
    learningProgramItems,
    promotionItems,
    renewalItems,
    birthdayItems,
    tripItems,
    activityItems,
    planningDayItems,
    growingMode,
    growingSuggestions,
    recentGrowingKnowledge: relatedGrowingKnowledge,
    recentGrowingWindows,
    narrative,
  };
}

export async function recordDigestDeliveries(
  supabase: SupabaseClient,
  targetDate: string,
  items: DigestDeliveryItem[]
): Promise<void> {
  if (items.length === 0) return;
  const uniqueItems = [...new Map(items.map((item) => [item.itemKey, item])).values()];
  const keys = uniqueItems.map((item) => item.itemKey);
  const { data } = await supabase
    .from("digest_item_delivery_state")
    .select("item_key, show_count")
    .in("item_key", keys);
  const counts = new Map(((data ?? []) as { item_key: string; show_count: number }[]).map((row) => [row.item_key, row.show_count]));
  const { error } = await supabase.from("digest_item_delivery_state").upsert(
    uniqueItems.map((item) => ({
      item_key: item.itemKey,
      content_hash: item.contentHash,
      last_shown_on: targetDate,
      show_count: (counts.get(item.itemKey) ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "item_key" }
  );
  if (error) throw error;
}

/**
 * Renders the digest email HTML from {@link DigestEmailContent} (same inputs as {@link buildEmailHtml}).
 */
export async function buildDigestEmailHtml(
  content: DigestEmailContent,
  dashboardUrl: string
): Promise<string> {
  return buildEmailHtml(
    content.weatherSummary,
    content.rainForecast,
    content.todayTasks,
    content.thisWeekTasks,
    content.laterTasks,
    content.learningProgramItems,
    content.promotionItems,
    content.renewalItems,
    content.growingSuggestions,
    content.recentGrowingKnowledge,
    content.recentGrowingWindows,
    content.birthdayItems,
    content.tripItems,
    content.activityItems,
    content.planningDayItems,
    content.growingMode,
    content.narrative,
    dashboardUrl,
    content.targetDate,
    content.sendReasons
  );
}

export async function fetchActiveLearningProgramItems(supabase: SupabaseClient): Promise<LearningProgramDigestItem[]> {
  const { data: programs, error } = await supabase.from("learning_programs").select("id, title, total_days, current_day").eq("status", "active").order("created_at");
  if (error) throw error;
  const items = await Promise.all((programs ?? []).map(async program => {
    const { data: day, error: dayError } = await supabase.from("learning_program_days").select("day_number, title, content, resources").eq("program_id", program.id).eq("day_number", program.current_day).maybeSingle();
    if (dayError) throw dayError;
    if (!day) return null;
    return { programId: program.id, programTitle: program.title, dayNumber: day.day_number, totalDays: program.total_days, dayTitle: day.title, content: day.content, resources: Array.isArray(day.resources) ? day.resources.filter((r: unknown): r is string => typeof r === "string") : [] } as LearningProgramDigestItem;
  }));
  return items.filter((item): item is LearningProgramDigestItem => item !== null);
}
