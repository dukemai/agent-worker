import { createClient } from "@supabase/supabase-js";
import { buildDigestEmailHtml, loadDigestEmailContent, recordDigestDeliveries, stockholmDate } from "@agent/shared";
import { getStockholmWeather } from "../lib/weather";
import { sendEmail } from "../lib/resend";
import type { Env } from "../types/env";

export async function runDailyDigest(env: Env): Promise<void> {
  if (!env.RESEND_API_KEY || !env.DIGEST_RECIPIENT_EMAIL) {
    throw new Error("RESEND_API_KEY and DIGEST_RECIPIENT_EMAIL must be set");
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

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
    targetDate: stockholmDate(),
  });

  if (!content.shouldSend) {
    console.log(`Daily digest suppressed for ${content.targetDate}: no actionable exceptions`);
    return;
  }

  const dashboardUrl = "https://agent-workder-dashboard.vercel.app";

  const html = await buildDigestEmailHtml(content, dashboardUrl);

  const exceptionCount =
    content.todayTasks.length +
    content.thisWeekTasks.length +
    content.renewalItems.length +
    content.birthdayItems.length +
    content.tripItems.length +
    content.activityItems.length +
    content.planningDayItems.length +
    content.growingSuggestions.length +
    content.recentGrowingKnowledge.length +
    content.promotionItems.length;
  const subject = `Dad-Ops: ${exceptionCount} ${exceptionCount === 1 ? "exception" : "exceptions"} — ${content.targetDate}`;

  await sendEmail(env.RESEND_API_KEY, {
    from: "Dad-Ops Agent <digest@wkalender.app>",
    to: env.DIGEST_RECIPIENT_EMAIL,
    subject,
    html,
  });
  await recordDigestDeliveries(supabase, content.targetDate, content.deliveryItems);

  console.log(
    `Daily digest sent to ${env.DIGEST_RECIPIENT_EMAIL} (today: ${content.todayTasks.length}, week: ${content.thisWeekTasks.length}, later: ${content.laterTasks.length})`
  );
}
