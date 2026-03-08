import type { SupabaseClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";
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
    }))
    .slice(0, 5);
}

/**
 * Loads pending growing suggestions for the current week from growing_suggestions_log.
 * Uses the Monday of the current week (UTC) as week_start_date, filters by status = "pending",
 * orders by created_at ascending, returns at most 3 rows as { title, details }.
 */
export async function fetchPendingGrowingSuggestions(
  supabase: SupabaseClient
): Promise<GrowingSuggestionDigestItem[]> {
  const { data, error } = await supabase
    .from("growing_suggestions_log")
    .select("title, details")
    .eq("week_start_date", getWeekStartDate())
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(3);

  if (error) return [];
  return ((data ?? []) as GrowingSuggestionDigestItem[]).map((row) => ({
    title: row.title,
    details: row.details,
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
 * Generates the daily briefing narrative with Gemini using DAILY_BRIEFING prompt.
 * Injects current date (sv-SE), weather summary, and formatted task lists (today / this week / later).
 * Optionally appends a rain reminder. Returns the model's plain-text response.
 */
export async function generateBriefingNarrative(
  apiKey: string,
  weatherSummary: string,
  todayTasks: Task[],
  thisWeekTasks: Task[],
  laterTasks: Task[],
  rainForecast: boolean
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const taskContext = `
TODAY:
${formatTaskList(todayTasks)}

THIS WEEK:
${formatTaskList(thisWeekTasks)}

LATER:
${formatTaskList(laterTasks)}
${rainForecast ? "\n⚠️ Rain is forecast — remind the kids to bring their rain coats!" : ""}
  `.trim();

  const prompt = DAILY_BRIEFING
    .replace("{{currentDate}}", new Date().toLocaleDateString("sv-SE", { weekday: "long", year: "numeric", month: "long", day: "numeric" }))
    .replace("{{weather}}", weatherSummary);

  const result = await model.generateContent(`${prompt}\n\n${taskContext}`);
  return result.response.text().trim();
}

/**
 * Builds the full HTML body for the daily digest email.
 * Includes date (sv-SE), weather block, briefing narrative, task sections (today / this week / later),
 * optional garden section (growing tasks + suggestions), new growing knowledge, renewals, learning lessons, and deals.
 * dashboardUrl is used for the footer link. Lessons use DigestLessonItem (profile_type, topic, content).
 */
export function buildEmailHtml(
  weatherSummary: string,
  rainForecast: boolean,
  todayTasks: Task[],
  thisWeekTasks: Task[],
  laterTasks: Task[],
  lessons: DigestLessonItem[],
  promotionItems: PromotionDigestItem[],
  renewalItems: RenewalDigestItem[],
  growingTasks: GrowingTaskDigestItem[],
  growingSuggestions: GrowingSuggestionDigestItem[],
  recentGrowingKnowledge: RecentGrowingKnowledgeItem[],
  recentGrowingWindows: RecentGrowingWindowItem[],
  narrative: string,
  dashboardUrl: string
): string {
  const date = new Date().toLocaleDateString("sv-SE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const taskSection = (label: string, tasks: Task[]) => {
    if (tasks.length === 0) return `<h3>${label}</h3><p style="color:#888">No pending tasks</p>`;
    const items = tasks
      .map((t) => {
        const due = t.due_date
          ? ` <span style="color:#888;font-size:12px">— due ${new Date(t.due_date).toLocaleDateString("sv-SE")}</span>`
          : "";
        return `<li>${t.title}${due}</li>`;
      })
      .join("");
    return `<h3>${label}</h3><ul>${items}</ul>`;
  };

  const learningSection =
    lessons.length === 0
      ? ""
      : `
  <h2 style="font-size:16px">Today's Learning</h2>
  ${lessons
    .map(
      (lesson) => `
    <article style="border:1px solid #eee;border-radius:8px;padding:12px;margin-bottom:12px">
      <p style="margin:0 0 6px 0;color:#666;font-size:12px">${lesson.profile_type === "category" ? "Category" : "Topic"}: ${lesson.topic}</p>
      <p style="white-space:pre-wrap;margin:0">${lesson.content}</p>
    </article>
  `
    )
    .join("")}
  `;

  const dealSection =
    promotionItems.length === 0
      ? ""
      : `
  <h2 style="font-size:16px">Deals for You</h2>
  <ul>
    ${promotionItems
      .map(
        (item) =>
          `<li><strong>${item.store}</strong>: ${item.summary}${item.link ? ` (<a href="${item.link}" style="color:#2563eb">Open deal</a>)` : ""}</li>`
      )
      .join("")}
  </ul>
  `;

  const renewalSection =
    renewalItems.length === 0
      ? ""
      : `
  <h2 style="font-size:16px">Upcoming Renewals</h2>
  <ul>
    ${renewalItems
      .map(
        (item) =>
          `<li>${item.title} — due in ${item.daysLeft} days (${new Date(item.dueDate).toLocaleDateString("sv-SE")})${
            item.link ? ` (<a href="${item.link}" style="color:#2563eb">Open</a>)` : ""
          }</li>`
      )
      .join("")}
  </ul>
  `;

  const gardenSection =
    growingTasks.length === 0 && growingSuggestions.length === 0
      ? ""
      : `
  <h2 style="font-size:16px">Garden This Week</h2>
  ${growingTasks.length === 0 ? "" : `
  <h3>Converted Tasks</h3>
  <ul>
    ${growingTasks
      .map(
        (item) =>
          `<li>${item.title}${item.dueDate ? ` <span style="color:#888;font-size:12px">— due ${new Date(item.dueDate).toLocaleDateString("sv-SE")}</span>` : ""}</li>`
      )
      .join("")}
  </ul>`}
  ${growingSuggestions.length === 0 ? "" : `
  <h3>Ideas</h3>
  <ul>
    ${growingSuggestions
      .map((item) => `<li><strong>${item.title}</strong>: ${item.details}</li>`)
      .join("")}
  </ul>`}
  `;

  const newKnowledgeSection =
    recentGrowingKnowledge.length === 0 && recentGrowingWindows.length === 0
      ? ""
      : `
  <h2 style="font-size:16px">New Growing Knowledge</h2>
  ${recentGrowingWindows.length === 0 ? "" : `
  <h3>Actionable Tips from Videos</h3>
  <ul>
    ${recentGrowingWindows
      .map(
        (item) =>
          `<li><strong>${item.title}</strong>: ${item.note}${item.sourceUrl ? ` (<a href="${item.sourceUrl}" style="color:#2563eb">Source</a>)` : ""}</li>`
      )
      .join("")}
  </ul>`}
  ${recentGrowingKnowledge.length === 0 ? "" : `
  <h3>Reference Knowledge</h3>
  <ul>
    ${recentGrowingKnowledge
      .map(
        (item) =>
          `<li><strong>${item.title}</strong> (${item.category}): ${item.content.slice(0, 220)}${item.content.length > 220 ? "..." : ""}${item.sourceUrl ? ` (<a href="${item.sourceUrl}" style="color:#2563eb">Source</a>)` : ""}</li>`
      )
      .join("")}
  </ul>`}
  `;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1a1a1a">
  <h1 style="font-size:20px;margin-bottom:4px">Dad-Ops Daily Digest</h1>
  <p style="color:#888;margin-top:0">${date}</p>

  <div style="background:#f0f4ff;border-radius:8px;padding:12px 16px;margin-bottom:24px">
    <strong>🌤 Stockholm Weather:</strong> ${weatherSummary}
    ${rainForecast ? '<br><strong style="color:#2563eb">☔ Remind kids to bring rain coats today!</strong>' : ""}
  </div>

  <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin-bottom:24px;line-height:1.6">
    <h2 style="margin-top:0;font-size:16px">Today's Briefing</h2>
    ${narrative.split("\n").map((p) => `<p style="margin:8px 0">${p}</p>`).join("")}
  </div>

  <h2 style="font-size:16px">Your Tasks</h2>
  ${taskSection("📅 Today", todayTasks)}
  ${taskSection("📆 This Week", thisWeekTasks)}
  ${taskSection("🗂 Later", laterTasks)}
  ${gardenSection}
  ${newKnowledgeSection}
  ${renewalSection}
  ${learningSection}
  ${dealSection}

  <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
  <p style="color:#888;font-size:12px;text-align:center">
    <a href="${dashboardUrl}" style="color:#2563eb">Open Dashboard</a> · Dad-Ops Agent
  </p>
</body>
</html>
  `.trim();
}
