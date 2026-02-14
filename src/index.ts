import PostalMime from "postal-mime";
import { createClient } from "@supabase/supabase-js";

export default {
  // 1. Handles real emails from Cloudflare Email Routing
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

  // 2. Handles HTTP (curl / local dev testing)
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
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

  const title = subject ? subject.substring(0, 200) : "Untitled";
  const metadata = { from, receivedAt: new Date().toISOString() };

  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .insert({
      title,
      original_body: body,
      metadata,
      source: "email",
    })
    .select("id")
    .single();

  if (taskError) {
    throw new Error(`Supabase insert failed: ${taskError.message}`);
  }

  const { error: bucketError } = await supabase
    .from("later_tasks")
    .insert({ task_id: task.id });

  if (bucketError) {
    throw new Error(`Supabase bucket insert failed: ${bucketError.message}`);
  }

  console.log(`Task created: ${task.id} from [${from}]`);

  return {
    success: true,
    taskId: task.id,
    message: `Agent received: [${subject}] from [${from}]`,
  };
}
