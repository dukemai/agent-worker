import { createClient } from "@supabase/supabase-js";
import { buildWeeklyPlanningEmailHtml, loadWeeklyPlanningContent, nextMondayDate, stockholmDate } from "@agent/shared";
import { sendEmail } from "../lib/resend";
import type { Env } from "../types/env";

export async function runWeeklyPlanning(env: Env): Promise<void> {
  if (!env.RESEND_API_KEY || !env.DIGEST_RECIPIENT_EMAIL) {
    throw new Error("RESEND_API_KEY and DIGEST_RECIPIENT_EMAIL must be set");
  }
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
  const weekStart = nextMondayDate(stockholmDate());
  const content = await loadWeeklyPlanningContent(supabase, weekStart);
  const dashboardUrl = "https://agent-workder-dashboard.vercel.app";
  const html = await buildWeeklyPlanningEmailHtml(content, dashboardUrl);
  const signals = content.tasks.length + content.planningDays.length + content.birthdays.length + content.trips.length + content.activities.length;

  await sendEmail(env.RESEND_API_KEY, {
    from: "Dad-Ops Agent <digest@wkalender.app>",
    to: env.DIGEST_RECIPIENT_EMAIL,
    subject: `Dad-Ops weekly: ${signals} things to place · ${content.weekStart}`,
    html,
  });
  console.log(`Weekly planning sent for ${content.weekStart}–${content.weekEnd}`);
}
