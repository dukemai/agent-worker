import PostalMime from "postal-mime";
import { createClient } from "@supabase/supabase-js";
import { TASK_EXTRACTION } from "./prompts/task-extraction";
import { extractTaskFromEmail } from "./lib/gemini";
import { runDailyDigest } from "./crons/daily-digest";
import { processSingleGrowingSource, runGrowingIngest } from "./crons/growing-ingest";

const BUCKET_TABLES = {
  today: "today_tasks",
  this_week: "this_week_tasks",
  later: "later_tasks",
} as const;

export default {
  // 1. Handles scheduled cron triggers
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      (async () => {
        try {
          // "30 5 * * *" — daily digest at 06:30 Stockholm (05:30 UTC winter)
          await runGrowingIngest(env);
          await runDailyDigest(env);
        } catch (err) {
          console.error("Scheduled handler failed:", err);
        }
      })()
    );
  },

  // 2. Handles real emails from Cloudflare Email Routing
  async email(
    message: ForwardableEmailMessage,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    try {
      const rawBody = await new Response(message.raw).arrayBuffer();
      const parser = new PostalMime();
      const email = await parser.parse(rawBody);
      const body = email.text ?? email.html ?? "";
      const from = email.from?.address ?? "unknown";

      await processLogic(email.subject ?? "", body, from, env);
    } catch (err) {
      console.error("Email processing failed:", err);
      message.setReject("Processing failed");
    }
  },

  // 2. Handles HTTP (curl / local dev testing + manual growing extract)
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/process-growing" && request.method === "POST") {
      try {
        const payload = (await request.json()) as { source_id?: string };
        const sourceId = payload?.source_id;
        if (typeof sourceId !== "string" || !sourceId) {
          return new Response(
            JSON.stringify({ success: false, error: "source_id is required" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
        const result = await processSingleGrowingSource(env, sourceId);
        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json" },
          status: result.success ? 200 : 400,
        });
      } catch (err) {
        console.error("Process growing failed:", err);
        return new Response(
          JSON.stringify({ success: false, error: String(err) }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    if (request.method === "POST") {
      try {
        const payload = (await request.json()) as { subject?: string; body?: string; from?: string };
        const { subject = "", body = "", from = "test" } = payload;
        const result = await processLogic(subject, body, from, env);
        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        console.error("Fetch processing failed:", err);
        return new Response(
          JSON.stringify({ success: false, error: String(err) }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    return new Response("Dad Agent is live. Send a POST request to test.");
  },
};

async function processLogic(
  subject: string,
  body: string,
  from: string,
  env: Env
): Promise<{ success: boolean; taskId?: string; message?: string }> {
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set");
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const metadata: Record<string, unknown> = { from, receivedAt: new Date().toISOString() };

  let title: string;
  let originalBody = body;
  let dueDate: string | null = null;
  let targetBucket: "today" | "this_week" | "later" = "later";

  if (env.GEMINI_API_KEY && (subject || body)) {
    try {
      let userInterests = "None configured";
      try {
        const { data: contextRows } = await supabase
          .from("family_context")
          .select("key, value")
          .in("key", ["shopping_list", "seasonal_interests"]);
        userInterests =
          (contextRows ?? []).map((r) => `${r.key}: ${r.value}`).join("\n") || "None configured";
      } catch {
        // family_context table may not exist yet
      }

      const currentDate = new Date().toISOString();
      const systemPrompt = TASK_EXTRACTION.replace("{{currentDate}}", currentDate)
        .replace("{{userInterests}}", userInterests);

      const extracted = await extractTaskFromEmail(
        env.GEMINI_API_KEY,
        subject,
        body,
        from,
        systemPrompt
      );

      if (extracted.email_type === "promotion" && !extracted.promotion_relevant) {
        console.log(`Promotion dropped (not relevant): [${subject}] from [${from}]`);
        return { success: true, message: "Promotion dropped (not relevant)" };
      }

      if (extracted.email_type === "promotion" && extracted.promotion_relevant) {
        const store = extracted.store?.trim() || "Promotion";
        const summary = extracted.deal_summary?.trim() || extracted.title;
        const link = extracted.store_link?.trim() || "";
        title = `${store}: ${summary}`.substring(0, 200);
        originalBody = `${summary}${link ? `\n\nSeller link: ${link}` : ""}`;
        targetBucket = "today";
        metadata.email_type = "promotion";
        metadata.store = store;
        metadata.deal_summary = summary;
        metadata.store_link = link;
      } else {
        title = extracted.title.substring(0, 200) || subject.substring(0, 200) || "Untitled";
        dueDate = extracted.due_date;
        targetBucket = extracted.target_bucket;
        metadata.email_type = extracted.email_type;
      }
    } catch (err) {
      console.warn("Gemini extraction failed, using fallback:", err);
      title = subject ? subject.substring(0, 200) : "Untitled";
    }
  } else {
    title = subject ? subject.substring(0, 200) : "Untitled";
  }

  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .insert({
      title,
      original_body: originalBody,
      due_date: dueDate,
      metadata,
      source: "email",
    })
    .select("id")
    .single();

  if (taskError) {
    throw new Error(`Supabase insert failed: ${taskError.message}`);
  }

  const bucketTable = BUCKET_TABLES[targetBucket];
  const { error: bucketError } = await supabase
    .from(bucketTable)
    .insert({ task_id: task.id });

  if (bucketError) {
    throw new Error(`Supabase bucket insert failed: ${bucketError.message}`);
  }

  console.log(`Task created: ${task.id} in ${bucketTable} from [${from}]`);

  return {
    success: true,
    taskId: task.id,
    message: `Agent received: [${subject}] from [${from}]`,
  };
}
