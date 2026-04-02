import { createClient } from "@supabase/supabase-js";
import { buildDigestEmailHtml, loadDigestEmailContent } from "@agent/shared";
import { getStockholmWeather } from "../lib/weather";
import { sendEmail } from "../lib/resend";
import { type GeneratedLesson } from "./learning-loop";

export async function runDailyDigest(env: Env): Promise<void> {
  if (!env.RESEND_API_KEY || !env.DIGEST_RECIPIENT_EMAIL) {
    throw new Error("RESEND_API_KEY and DIGEST_RECIPIENT_EMAIL must be set");
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

  // Generate today's learning lessons first so digest can include them.
  const lessons: GeneratedLesson[] = [];

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

  const content = await loadDigestEmailContent(supabase, {
    ensureWeeklySuggestionsWhenEmpty: true,
    weatherSummary,
    rainForecast,
    lessons,
  });

  const dashboardUrl = "https://your-dashboard.vercel.app";

  const html = await buildDigestEmailHtml(content, dashboardUrl);

  const totalTasks =
    content.todayTasks.length + content.thisWeekTasks.length + content.laterTasks.length;
  const subject = `Dad-Ops: ${content.todayTasks.length} today · ${totalTasks} total — ${new Date().toLocaleDateString("sv-SE")}`;

  await sendEmail(env.RESEND_API_KEY, {
    from: "Dad-Ops Agent <digest@wkalender.app>",
    to: env.DIGEST_RECIPIENT_EMAIL,
    subject,
    html,
  });

  console.log(
    `Daily digest sent to ${env.DIGEST_RECIPIENT_EMAIL} (today: ${content.todayTasks.length}, week: ${content.thisWeekTasks.length}, later: ${content.laterTasks.length})`
  );
}
