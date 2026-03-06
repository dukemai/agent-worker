import { runDailyDigest } from "../../crons/daily-digest";
import type { Env } from "../../types/env";

const JSON_HEADERS = { "Content-Type": "application/json" };

export async function handleRunDigest(_request: Request, env: Env): Promise<Response> {
  try {
    await runDailyDigest(env);
    return new Response(
      JSON.stringify({ success: true, message: "Daily digest sent" }),
      { headers: JSON_HEADERS }
    );
  } catch (err) {
    console.error("Daily digest failed:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: JSON_HEADERS }
    );
  }
}
