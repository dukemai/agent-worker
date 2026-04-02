import type { SupabaseClient } from "@supabase/supabase-js";
import { render } from "@react-email/render";
import type {
  DigestLessonItem,
  GrowingSuggestionDigestItem,
  GrowingTaskDigestItem,
  PromotionDigestItem,
  RenewalDigestItem,
  RecentGrowingKnowledgeItem,
  RecentGrowingWindowItem,
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
export function extractRenewalItems(tasks: Task[]): RenewalDigestItem[] {
  return tasks
    .filter((task) => task.metadata?.item_type === "renewal")
    .filter((task) => task.due_date)
    .map((task) => {
      const dueDate = task.due_date as string;
      const daysLeft = Math.floor((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return {
        title: task.title,
        dueDate,
        daysLeft,
        link: typeof task.metadata?.link === "string" && task.metadata.link.length > 0 ? task.metadata.link : null,
      };
    })
    .filter((item) => item.daysLeft <= 30)
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
  supabase: SupabaseClient
): Promise<GrowingSuggestionDigestItem[]> {
  const weekNumber = getISOWeekNumber();

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

function getNextHoliday() {
  const now = new Date();
  for (const h of SWEDISH_HOLIDAYS) {
    const holidayDate = new Date(h.date);
    if (holidayDate >= now) {
      return { ...h, date: holidayDate };
    }
  }
  return null;
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
  rainForecast: boolean
): Promise<string> {
  const now = new Date();
  const dateLabel = now.toLocaleDateString("sv-SE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const todayCount = todayTasks.length;
  const weekCount = thisWeekTasks.length;
  const laterCount = laterTasks.length;
  const totalCount = todayCount + weekCount + laterCount;

  const lines: string[] = [];

  // 1) Countdown to Swedish Holiday
  const nextHoliday = getNextHoliday();
  if (nextHoliday) {
    const diff = nextHoliday.date.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days === 0) {
      lines.push(`Idag är det ${nextHoliday.name}! Hoppas du får en fantastisk dag.`);
    } else {
      lines.push(`Det är ${days} ${days === 1 ? "dag" : "dagar"} kvar till ${nextHoliday.name}.`);
    }
  }

  lines.push(`Vädret i Stockholm: ${weatherSummary}`);

  if (rainForecast) {
    lines.push("Det ser ut att kunna bli regn – påminn barnen om regnjackor och stövlar.");
  }

  if (totalCount === 0) {
    lines.push(
      "Du har inga öppna uppgifter just nu. Använd tiden till återhämtning eller något du varit nyfiken på länge."
    );
  } else {
    const todayPart =
      todayCount === 0
        ? "Inga uppgifter är markerade för idag."
        : todayCount === 1
          ? "Du har 1 uppgift för idag."
          : `Du har ${todayCount} uppgifter för idag.`;

    const weekPart =
      weekCount === 0
        ? ""
        : weekCount === 1
          ? "Det finns 1 uppgift senare den här veckan."
          : `Det finns ${weekCount} uppgifter senare den här veckan.`;

    const laterPart =
      laterCount === 0
        ? ""
        : laterCount === 1
          ? "Du har 1 uppgift parkerad för senare."
          : `Du har ${laterCount} uppgifter parkerade för senare.`;

    lines.push([todayPart, weekPart, laterPart].filter(Boolean).join(" "));
  }

  lines.push("Scrolla igenom listorna nedan och välj 1–3 saker som verkligen spelar roll idag.");

  return lines.join("\n\n");
}

/**
 * Builds the full HTML body for the daily digest email.
 * Includes date (sv-SE), weather block, briefing narrative, task sections (today / this week / later),
 * optional inspirations section, new growing knowledge, renewals, learning lessons, and deals.
 * dashboardUrl is used for the footer link. Lessons use DigestLessonItem (profile_type, topic, content).
 */
export async function buildEmailHtml(
  weatherSummary: string,
  rainForecast: boolean,
  todayTasks: Task[],
  thisWeekTasks: Task[],
  laterTasks: Task[],
  lessons: DigestLessonItem[],
  promotionItems: PromotionDigestItem[],
  renewalItems: RenewalDigestItem[],
  growingSuggestions: GrowingSuggestionDigestItem[],
  recentGrowingKnowledge: RecentGrowingKnowledgeItem[],
  recentGrowingWindows: RecentGrowingWindowItem[],
  narrative: string,
  dashboardUrl: string
): Promise<string> {
  const date = new Date().toLocaleDateString("sv-SE", {
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
      lessons={lessons}
      promotionItems={promotionItems}
      renewalItems={renewalItems}
      growingSuggestions={growingSuggestions}
      recentGrowingKnowledge={recentGrowingKnowledge}
      recentGrowingWindows={recentGrowingWindows}
      narrative={narrative}
      dashboardUrl={dashboardUrl}
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
  lessons?: DigestLessonItem[];
  /**
   * If set, used as the briefing narrative instead of the template from {@link generateBriefingNarrative}.
   */
  narrativeOverride?: string;
};

/**
 * Full payload for the daily digest email (tasks, growing sections, narrative). Built by {@link loadDigestEmailContent}.
 */
export type DigestEmailContent = {
  weatherSummary: string;
  rainForecast: boolean;
  todayTasks: Task[];
  thisWeekTasks: Task[];
  laterTasks: Task[];
  lessons: DigestLessonItem[];
  promotionItems: PromotionDigestItem[];
  renewalItems: RenewalDigestItem[];
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
  const lessons = options.lessons ?? [];

  const [todayTasks, thisWeekTasks, laterTasks] = await Promise.all([
    fetchPendingTasksForBucket(supabase, "today_tasks"),
    fetchPendingTasksForBucket(supabase, "this_week_tasks"),
    fetchPendingTasksForBucket(supabase, "later_tasks"),
  ]);
  const allTasks = [...todayTasks, ...thisWeekTasks, ...laterTasks];
  const promotionItems = extractPromotionItems(allTasks);
  const renewalItems = extractRenewalItems(allTasks);

  let growingSuggestions: GrowingSuggestionDigestItem[] = await fetchWeeklyGrowingSuggestions(supabase);
  if (growingSuggestions.length === 0 && options.ensureWeeklySuggestionsWhenEmpty) {
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

  // "Related Knowledge" in the email: derived from unfinished growing tasks linked to `growing_windows` via `window_id`.
  let relatedGrowingKnowledge: RecentGrowingKnowledgeItem[] = [];
  try {
    const undoneGrowingTasks = allTasks.filter(
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
        laterTasks,
        options.rainForecast
      );
    } catch (err) {
      console.warn("Briefing narrative generation failed, using fallback:", err);
      narrative = "Have a great day! Check your tasks below.";
    }
  }

  return {
    weatherSummary: options.weatherSummary,
    rainForecast: options.rainForecast,
    todayTasks,
    thisWeekTasks,
    laterTasks,
    lessons,
    promotionItems,
    renewalItems,
    growingSuggestions,
    recentGrowingKnowledge: relatedGrowingKnowledge,
    recentGrowingWindows,
    narrative,
  };
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
    content.lessons,
    content.promotionItems,
    content.renewalItems,
    content.growingSuggestions,
    content.recentGrowingKnowledge,
    content.recentGrowingWindows,
    content.narrative,
    dashboardUrl
  );
}

