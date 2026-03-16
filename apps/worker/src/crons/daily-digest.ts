import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  buildEmailHtml,
  extractGrowingTaskItems,
  extractPromotionItems,
  extractRenewalItems,
  fetchPendingGrowingSuggestions,
  fetchPendingTasksForBucket,
  fetchRecentGrowingKnowledge,
  generateBriefingNarrative,
} from "@agent/shared";
import { getStockholmWeather } from "../lib/weather";
import { sendEmail } from "../lib/resend";
import { runLearningLoop, type GeneratedLesson } from "./learning-loop";

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

  const dayOfWeek = new Date().getUTCDay();
  const includeGrowing = dayOfWeek === 1 || dayOfWeek === 5;

  const growingTasks = includeGrowing ? extractGrowingTaskItems(allTasks) : [];
  const growingSuggestions = includeGrowing ? await fetchPendingGrowingSuggestions(supabase) : [];
  const recentGrowing = includeGrowing ? await fetchRecentGrowingKnowledge(supabase) : { knowledge: [], windows: [] };

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

  const html = await buildEmailHtml(
    weatherSummary,
    rainForecast,
    todayTasks,
    thisWeekTasks,
    laterTasks,
    lessons,
    promotionItems,
    renewalItems,
    growingSuggestions,
    recentGrowing.knowledge,
    recentGrowing.windows,
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
