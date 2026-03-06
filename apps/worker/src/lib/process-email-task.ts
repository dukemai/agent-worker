import { createClient } from "@supabase/supabase-js";
import { TASK_EXTRACTION } from "@agent/shared";
import { getTaskExtractionFromEmail } from "@agent/shared";
import type { Env } from "../types/env";
import {
  buildTaskContentFromExtraction,
  buildFallbackTaskContent,
  type BuiltEmailContent,
} from "@agent/shared";

export type ProcessEmailTaskResult = {
  success: boolean;
  taskId?: string;
  message?: string;
};

export async function processEmailTask(
  subject: string,
  body: string,
  from: string,
  env: Env
): Promise<ProcessEmailTaskResult> {
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set");
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  let metadata: Record<string, unknown> = { from, receivedAt: new Date().toISOString() };
  let built: BuiltEmailContent;

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
      const systemPrompt = TASK_EXTRACTION.replace("{{currentDate}}", currentDate).replace(
        "{{userInterests}}",
        userInterests
      );

      const extracted = await getTaskExtractionFromEmail(
        env.GEMINI_API_KEY,
        subject,
        body,
        from,
        systemPrompt
      );

      built = buildTaskContentFromExtraction(subject, body, extracted, metadata);
    } catch (err) {
      console.warn("Gemini extraction failed, using fallback:", err);
      built = buildFallbackTaskContent(subject, body, metadata);
    }
  } else {
    built = buildFallbackTaskContent(subject, body, metadata);
  }

  if (built.kind === "dropped") {
    console.log(`Promotion dropped (not relevant): [${subject}] from [${from}]`);
    return { success: true, message: built.message };
  }

  const { title, body: finalBody, dueDate, targetBucket, metadata: finalMetadata } = built;

  const BUCKET_TABLES = {
    today: "today_tasks",
    this_week: "this_week_tasks",
    later: "later_tasks",
  } as const;

  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .insert({
      title,
      original_body: finalBody,
      due_date: dueDate,
      metadata: finalMetadata,
      source: "email",
    })
    .select("id")
    .single();

  if (taskError) {
    throw new Error(`Supabase insert failed: ${taskError.message}`);
  }

  const bucketTable = BUCKET_TABLES[targetBucket];
  const { error: bucketError } = await supabase.from(bucketTable).insert({ task_id: task.id });

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
