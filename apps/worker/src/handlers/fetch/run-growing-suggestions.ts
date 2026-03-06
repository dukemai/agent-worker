import { runGrowingSuggestions } from "../../crons/growing-suggestions";
import type { Env } from "../../types/env";

const JSON_HEADERS = { "Content-Type": "application/json" };

export async function handleRunGrowingSuggestions(
  _request: Request,
  env: Env
): Promise<Response> {
  try {
    await runGrowingSuggestions(env);
    return new Response(
      JSON.stringify({ success: true, message: "Growing suggestions generated" }),
      { headers: JSON_HEADERS }
    );
  } catch (err) {
    console.error("Growing suggestions failed:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: JSON_HEADERS }
    );
  }
}
