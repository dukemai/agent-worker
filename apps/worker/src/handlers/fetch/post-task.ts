import { processEmailTask } from "../../lib/process-email-task";
import type { Env } from "../../types/env";

const JSON_HEADERS = { "Content-Type": "application/json" };

export async function handlePostTask(request: Request, env: Env): Promise<Response> {
  try {
    const payload = (await request.json()) as {
      subject?: string;
      body?: string;
      from?: string;
    };
    const { subject = "", body = "", from = "test" } = payload;
    const result = await processEmailTask(subject, body, from, env);
    return new Response(JSON.stringify(result), {
      headers: JSON_HEADERS,
    });
  } catch (err) {
    console.error("Fetch processing failed:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: JSON_HEADERS }
    );
  }
}
