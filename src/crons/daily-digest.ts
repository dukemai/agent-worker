import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { DAILY_BRIEFING } from "../prompts/daily-briefing";
import { getStockholmWeather } from "../lib/weather";
import { sendEmail } from "../lib/resend";
import { runLearningLoop, type GeneratedLesson } from "./learning-loop";

interface Task {
  id: string;
  title: string;
  original_body: string | null;
  due_date: string | null;
  status: string;
  source: string;
  metadata: Record<string, unknown> | null;
}

interface BucketRow {
  task_id: string;
}

async function fetchPendingTasksForBucket(
  supabase: SupabaseClient,
  bucketTable: string
): Promise<Task[]> {
  const { data: bucketRows, error: bucketError } = await supabase
    .from(bucketTable)
    .select("task_id");

  if (bucketError || !bucketRows?.length) return [];

  const taskIds = (bucketRows as BucketRow[]).map((r) => r.task_id);

  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("id, title, original_body, due_date, status, source, metadata")
    .in("id", taskIds)
    .eq("status", "pending")
    .order("due_date", { ascending: true, nullsFirst: false });

  if (tasksError) return [];
  return (tasks as Task[]) ?? [];
}

interface PromotionDigestItem {
  store: string;
  summary: string;
  link: string | null;
}

interface RenewalDigestItem {
  title: string;
  dueDate: string;
  daysLeft: number;
  link: string | null;
}

interface GrowingTaskDigestItem {
  title: string;
  dueDate: string | null;
}

interface GrowingSuggestionDigestItem {
  title: string;
  details: string;
}

function extractPromotionItems(tasks: Task[]): PromotionDigestItem[] {
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

function extractRenewalItems(tasks: Task[]): RenewalDigestItem[] {
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

function extractGrowingTaskItems(tasks: Task[]): GrowingTaskDigestItem[] {
  return tasks
    .filter((task) => task.metadata?.item_type === "growing")
    .map((task) => ({
      title: task.title,
      dueDate: task.due_date,
    }))
    .slice(0, 5);
}

function getWeekStartDate(now = new Date()): string {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().slice(0, 10);
}

async function fetchPendingGrowingSuggestions(supabase: SupabaseClient): Promise<GrowingSuggestionDigestItem[]> {
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

function formatTaskList(tasks: Task[]): string {
  if (tasks.length === 0) return "  (none)";
  return tasks
    .map((t) => {
      const due = t.due_date ? ` — due ${new Date(t.due_date).toLocaleDateString("sv-SE")}` : "";
      return `  • ${t.title}${due}`;
    })
    .join("\n");
}

async function generateBriefingNarrative(
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

function buildEmailHtml(
  weatherSummary: string,
  rainForecast: boolean,
  todayTasks: Task[],
  thisWeekTasks: Task[],
  laterTasks: Task[],
  lessons: GeneratedLesson[],
  promotionItems: PromotionDigestItem[],
  renewalItems: RenewalDigestItem[],
  growingTasks: GrowingTaskDigestItem[],
  growingSuggestions: GrowingSuggestionDigestItem[],
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

export async function runDailyDigest(env: Env): Promise<void> {
  if (!env.RESEND_API_KEY || !env.DIGEST_RECIPIENT_EMAIL) {
    throw new Error("RESEND_API_KEY and DIGEST_RECIPIENT_EMAIL must be set");
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

  // Fetch tasks from all buckets in parallel
  const [todayTasks, thisWeekTasks, laterTasks] = await Promise.all([
    fetchPendingTasksForBucket(supabase, "today_tasks"),
    fetchPendingTasksForBucket(supabase, "this_week_tasks"),
    fetchPendingTasksForBucket(supabase, "later_tasks"),
  ]);
  const allTasks = [...todayTasks, ...thisWeekTasks, ...laterTasks];
  const promotionItems = extractPromotionItems(allTasks);
  const renewalItems = extractRenewalItems(allTasks);
  const growingTasks = extractGrowingTaskItems(allTasks);
  const growingSuggestions = await fetchPendingGrowingSuggestions(supabase);

  // Generate today's learning lessons first so digest can include them.
  let lessons: GeneratedLesson[] = [];
  try {
    lessons = await runLearningLoop(env);
  } catch (err) {
    console.warn("Learning loop failed, continuing without lessons:", err);
  }

  // Fetch weather (non-fatal if it fails)
  let weatherSummary = "Weather unavailable";
  let rainForecast = false;
  if (env.OPENWEATHER_API_KEY) {
    try {
      const weather = await getStockholmWeather(env.OPENWEATHER_API_KEY);
      weatherSummary = weather.summary;
      rainForecast = weather.rainForecast;
    } catch (err) {
      console.warn("Weather fetch failed, continuing without it:", err);
    }
  }

  // Generate narrative with Gemini (non-fatal if it fails)
  let narrative = "Have a great day! Check your tasks below.";
  if (env.GEMINI_API_KEY) {
    try {
      narrative = await generateBriefingNarrative(
        env.GEMINI_API_KEY,
        weatherSummary,
        todayTasks,
        thisWeekTasks,
        laterTasks,
        rainForecast
      );
    } catch (err) {
      console.warn("Gemini briefing failed, using fallback:", err);
    }
  }

  const dashboardUrl = "https://your-dashboard.vercel.app";

  const html = buildEmailHtml(
    weatherSummary,
    rainForecast,
    todayTasks,
    thisWeekTasks,
    laterTasks,
    lessons,
    promotionItems,
    renewalItems,
    growingTasks,
    growingSuggestions,
    narrative,
    dashboardUrl
  );

  const totalTasks = todayTasks.length + thisWeekTasks.length + laterTasks.length;
  const subject = `Dad-Ops: ${todayTasks.length} today · ${totalTasks} total — ${new Date().toLocaleDateString("sv-SE")}`;

  await sendEmail(env.RESEND_API_KEY, {
    from: "Dad-Ops Agent <digest@wkalender.app>",
    to: env.DIGEST_RECIPIENT_EMAIL,
    subject,
    html,
  });

  console.log(`Daily digest sent to ${env.DIGEST_RECIPIENT_EMAIL} (today: ${todayTasks.length}, week: ${thisWeekTasks.length}, later: ${laterTasks.length})`);
}
