import { runRecipeImportQueue } from "../../crons/recipe-import-queue";
import type { Env } from "../../types/env";

const JSON_HEADERS = { "Content-Type": "application/json" };

function unauthorized(): Response {
  return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
    status: 401,
    headers: JSON_HEADERS,
  });
}

function hasAdminAccess(request: Request, env: Env): boolean {
  const expected = env.WORKER_ADMIN_TOKEN?.trim();
  if (!expected) {
    return false;
  }
  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${expected}`;
}

function parseLimit(raw: unknown): number | undefined {
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return undefined;
  }
  return raw;
}

export async function handleRunRecipeImportQueue(
  request: Request,
  env: Env,
): Promise<Response> {
  if (!hasAdminAccess(request, env)) {
    return unauthorized();
  }

  let body: unknown = {};
  try {
    const text = await request.text();
    body = text.trim() ? JSON.parse(text) : {};
  } catch {
    return new Response(JSON.stringify({ success: false, error: "Expected JSON body" }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const o = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const queueItemId = typeof o.queueItemId === "string" ? o.queueItemId.trim() : undefined;
  const limit = parseLimit(o.limit);

  try {
    const summary = await runRecipeImportQueue(env, { limit, queueItemId });
    return new Response(JSON.stringify({ success: true, ...summary }), {
      headers: JSON_HEADERS,
    });
  } catch (err) {
    console.error("Recipe import queue run failed:", err);
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
}
