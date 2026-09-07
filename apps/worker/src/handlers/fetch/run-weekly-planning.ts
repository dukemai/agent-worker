import { runWeeklyPlanning } from "../../crons/weekly-planning";
import type { Env } from "../../types/env";

const JSON_HEADERS = { "Content-Type": "application/json" };

export async function handleRunWeeklyPlanning(request: Request, env: Env): Promise<Response> {
  const expected = env.WORKER_ADMIN_TOKEN?.trim();
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 401, headers: JSON_HEADERS });
  }
  try {
    await runWeeklyPlanning(env);
    return new Response(JSON.stringify({ success: true, message: "Weekly planning sent" }), { headers: JSON_HEADERS });
  } catch (error) {
    console.error("Weekly planning failed:", error);
    return new Response(JSON.stringify({ success: false, error: String(error) }), { status: 500, headers: JSON_HEADERS });
  }
}
