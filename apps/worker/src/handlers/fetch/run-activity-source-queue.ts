import { runActivitySourceQueue } from "../../crons/activity-source-queue";
import type { Env } from "../../types/env";

const HEADERS = { "Content-Type": "application/json" };

export async function handleRunActivitySourceQueue(request: Request, env: Env): Promise<Response> {
  const expected = env.WORKER_ADMIN_TOKEN?.trim();
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 401, headers: HEADERS });
  }
  let body: Record<string, unknown> = {};
  try {
    const text = await request.text();
    body = text.trim() ? JSON.parse(text) as Record<string, unknown> : {};
  } catch {
    return new Response(JSON.stringify({ success: false, error: "Expected JSON body" }), { status: 400, headers: HEADERS });
  }
  const limit = typeof body.limit === "number" && Number.isFinite(body.limit) ? body.limit : undefined;
  const sourceId = typeof body.sourceId === "string" ? body.sourceId.trim() : undefined;
  try {
    const summary = await runActivitySourceQueue(env, { limit, sourceId });
    return new Response(JSON.stringify({ success: true, ...summary }), { headers: HEADERS });
  } catch (error) {
    console.error("Activity source queue run failed:", error);
    return new Response(JSON.stringify({ success: false, error: String(error) }), { status: 500, headers: HEADERS });
  }
}
