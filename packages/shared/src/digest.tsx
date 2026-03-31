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
import { DAILY_BRIEFING } from "./prompts";
import { getWeekStartDate, resolveRelatedSourceUrl } from "./utils";
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
 * Uses the Monday of the current week (UTC) as week_start_date.
 */
export async function fetchWeeklyGrowingSuggestions(
  supabase: SupabaseClient
): Promise<GrowingSuggestionDigestItem[]> {
  const weekStart = getWeekStartDate();

  // Fetch all inspirations for the week (to ensure they are "always included")
  // and pending actions.
  const { data, error } = await supabase
    .from("growing_suggestions_log")
    .select("title, details, suggestion_kind, status")
    .eq("week_start_date", weekStart)
    .or("suggestion_kind.eq.inspiration,status.eq.pending")
    .order("suggestion_kind", { ascending: false }) // inspirations first
    .order("created_at", { ascending: true });

  if (error) return [];

  // Map to the digest item shape, including status for inspirations
  return ((data ?? []) as any[]).map((row) => ({
    title: row.title,
    details: row.details,
    status: row.status,
    suggestion_kind: row.suggestion_kind,
  }));
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

  const knowledge =
    knowledgeResult.error || !knowledgeResult.data
      ? []
      : knowledgeResult.data.map((row) => ({
          title: row.title,
          content: row.content,
          category: row.category,
          sourceUrl: resolveRelatedSourceUrl(row.source),
        }));

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
 */
const SWEDISH_HOLIDAYS = [
  { name: "Långfredagen", date: "2026-04-03" },
  { name: "Påskdagen", date: "2026-04-05" },
  { name: "Annandag påsk", date: "2026-04-06" },
  { name: "Valborg", date: "2026-04-30" },
  { name: "Första maj", date: "2026-05-01" },
  { name: "Kristi himmelsfärds dag", date: "2026-05-14" },
  { name: "Sveriges nationaldag", date: "2026-06-06" },
  { name: "Midsommarafton", date: "2026-06-19" },
  { name: "Allhelgonadagen", date: "2026-10-31" },
  { name: "Julafton", date: "2026-12-24" },
  { name: "Juldagen", date: "2026-12-25" },
  { name: "Annandag jul", date: "2026-12-26" },
  { name: "Nyårsafton", date: "2026-12-31" },
  { name: "Nyårsdagen", date: "2027-01-01" },
];

function getNextHoliday() {
  const now = new Date();
  for (const h of SWEDISH_HOLIDAYS) {
    const holidayDate = new Date(h.date);
    if (holidayDate >= now) {
      return { name: h.name, date: holidayDate };
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

