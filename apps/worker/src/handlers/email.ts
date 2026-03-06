import type { ForwardableEmailMessage } from "@cloudflare/workers-types";
import PostalMime from "postal-mime";
import { processEmailTask } from "../lib/process-email-task";
import type { Env } from "../types/env";

export async function handleEmail(
  message: ForwardableEmailMessage,
  env: Env
): Promise<void> {
  try {
    const rawBody = await new Response(message.raw as any).arrayBuffer();
    const parser = new PostalMime();
    const email = await parser.parse(rawBody);
    const body = email.text ?? email.html ?? "";
    const from = email.from?.address ?? "unknown";

    await processEmailTask(email.subject ?? "", body, from, env);
  } catch (err) {
    console.error("Email processing failed:", err);
    message.setReject("Processing failed");
  }
}
