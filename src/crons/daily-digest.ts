import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { DAILY_BRIEFING } from "../prompts/daily-briefing";
import { getStockholmWeather } from "../lib/weather";
import { sendEmail } from "../lib/resend";

interface Task {
  id: string;
  title: string;
  due_date: string | null;
  status: string;
}

interface BucketRow {
  task_id: string;
}

async function fetchPendingTasksForBucket(
  supabase: ReturnType<typeof createClient>,
  bucketTable: string
): Promise<Task[]> {
  const { data: bucketRows, error: bucketError } = await supabase
    .from(bucketTable)
    .select("task_id");

  if (bucketError || !bucketRows?.length) return [];

  const taskIds = (bucketRows as BucketRow[]).map((r) => r.task_id);

  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("id, title, due_date, status")
    .in("id", taskIds)
    .eq("status", "pending")
    .order("due_date", { ascending: true, nullsFirst: false });

  if (tasksError) return [];
  return (tasks as Task[]) ?? [];
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
