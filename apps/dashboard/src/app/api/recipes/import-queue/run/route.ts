import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type WorkerRunResponse = {
  success: boolean;
  processed?: number;
  completed?: number;
  failed?: number;
  skipped?: number;
  items?: {
    id: string;
    status: "completed" | "failed" | "skipped";
    recipe_id?: string;
    error?: string;
  }[];
  error?: string;
};

function getWorkerUrl(): string | null {
  const configured =
    process.env.RECIPE_IMPORT_WORKER_URL?.trim() || process.env.GROWING_WORKER_URL?.trim();
  return configured ? configured.replace(/\/$/, "") : null;
}

export async function POST(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  let body: unknown = {};
  try {
    const text = await request.text();
    body = text.trim() ? JSON.parse(text) : {};
  } catch {
    return errorResponse("Expected JSON body", 400);
  }

  if (!body || typeof body !== "object") {
    return errorResponse("Invalid body", 400);
  }
  const o = body as Record<string, unknown>;
  const queueItemId = typeof o.queueItemId === "string" ? o.queueItemId.trim() : "";

  if (queueItemId) {
    if (!UUID_RE.test(queueItemId)) {
      return errorResponse("queueItemId is invalid", 400);
    }
    const { data: item, error } = await auth.supabase
      .from("recipe_import_queue")
      .select("id, status")
      .eq("id", queueItemId)
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (error) {
      return errorResponse(error.message, 500);
    }
    if (!item) {
      return errorResponse("Queue item not found", 404);
    }
    if (item.status !== "pending" && item.status !== "failed") {
      return errorResponse("Only pending or failed queue items can be run manually", 409);
    }
  }

  const workerUrl = getWorkerUrl();
  if (!workerUrl) {
    return errorResponse(
      "Manual queue processing not configured (RECIPE_IMPORT_WORKER_URL or GROWING_WORKER_URL)",
      503,
    );
  }

  const token = process.env.WORKER_ADMIN_TOKEN?.trim();
  if (!token) {
    return errorResponse("Manual queue processing not configured (WORKER_ADMIN_TOKEN)", 503);
  }

  const response = await fetch(`${workerUrl}/run-recipe-import-queue`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(queueItemId ? { queueItemId, limit: 1 } : { limit: 5 }),
  });

  const result = (await response.json().catch(() => ({
    success: false,
    error: "Worker returned a non-JSON response",
  }))) as WorkerRunResponse;

  if (!response.ok) {
    return NextResponse.json(result, { status: response.status === 401 ? 502 : response.status });
  }

  return NextResponse.json(result);
}
