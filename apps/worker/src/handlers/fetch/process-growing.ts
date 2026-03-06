import { processSingleGrowingSource } from "../../crons/growing-ingest";
import type { Env } from "../../types/env";

const JSON_HEADERS = { "Content-Type": "application/json" };

export async function handleProcessGrowing(request: Request, env: Env): Promise<Response> {
  try {
    const payload = (await request.json()) as { source_id?: string };
    const sourceId = payload?.source_id;
    if (typeof sourceId !== "string" || !sourceId) {
      return new Response(
        JSON.stringify({ success: false, error: "source_id is required" }),
        { status: 400, headers: JSON_HEADERS }
      );
    }
    const result = await processSingleGrowingSource(env, sourceId);
    return new Response(JSON.stringify(result), {
      headers: JSON_HEADERS,
      status: result.success ? 200 : 400,
    });
  } catch (err) {
    console.error("Process growing failed:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: JSON_HEADERS }
    );
  }
}
