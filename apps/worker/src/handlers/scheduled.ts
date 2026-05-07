import type { ScheduledEvent, ExecutionContext } from "@cloudflare/workers-types";
import { runDailyDigest } from "../crons/daily-digest";
import { runGrowingIngest } from "../crons/growing-ingest";
import { runGrowingSuggestions } from "../crons/growing-suggestions";
import { runRecipeImportQueue } from "../crons/recipe-import-queue";
import type { Env } from "../types/env";

export async function handleScheduled(
  event: ScheduledEvent,
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  ctx.waitUntil(
    (async () => {
      try {
        const cron = event.cron ?? "";
        if (cron === "30 5 * * Sun,Wed") {
          await runGrowingSuggestions(env);
        } else if (cron === "15 3 * * *") {
          await runRecipeImportQueue(env, { limit: 5 });
        } else {
          await runGrowingIngest(env);
          await runDailyDigest(env);
        }
      } catch (err) {
        console.error("Scheduled handler failed:", err);
      }
    })()
  );
}
