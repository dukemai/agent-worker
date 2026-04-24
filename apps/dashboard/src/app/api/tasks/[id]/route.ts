import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase, parseIsoDate } from "@/lib/api";
import { getTaskBucket } from "@/lib/buckets";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const { id } = await params;
  const { data: task, error } = await auth.supabase.from("tasks").select("*").eq("id", id).maybeSingle();
  if (error) {
    return errorResponse(error.message, 500);
  }
  if (!task) {
    return errorResponse("Task not found", 404);
  }

  const bucket = await getTaskBucket(auth.supabase, id);
  return NextResponse.json({ task: { ...task, bucket } });
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const { id } = await params;
  const payload = (await request.json()) as {
    title?: unknown;
    original_body?: unknown;
    due_date?: unknown;
    status?: unknown;
  };

  const updates: Record<string, unknown> = {};
  if (payload.title !== undefined) {
    if (typeof payload.title !== "string" || payload.title.trim().length === 0) {
      return errorResponse("title must be a non-empty string");
    }
    updates.title = payload.title.trim().slice(0, 200);
  }
  if (payload.original_body !== undefined) {
    if (payload.original_body !== null && typeof payload.original_body !== "string") {
      return errorResponse("original_body must be a string or null");
    }
    updates.original_body = typeof payload.original_body === "string" && payload.original_body.trim().length > 0
      ? payload.original_body.trim()
      : null;
  }
  if (payload.status !== undefined) {
    if (payload.status !== "pending" && payload.status !== "done") {
      return errorResponse("status must be pending or done");
    }
    updates.status = payload.status;
  }
  if (payload.due_date !== undefined) {
    const dueDate = parseIsoDate(payload.due_date);
    if (dueDate === undefined) {
      return errorResponse("Invalid due_date. Use ISO8601 date-time or null");
    }
    updates.due_date = dueDate;
  }

  if (Object.keys(updates).length === 0) {
    return errorResponse("No valid fields to update");
  }

  const { data: task, error } = await auth.supabase
    .from("tasks")
    .update(updates)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    return errorResponse(error.message, 500);
  }
  if (!task) {
    return errorResponse("Task not found", 404);
  }

  return NextResponse.json({ task });
}

export async function DELETE(_: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const { id } = await params;
  const { data: deleted, error } = await auth.supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return errorResponse(error.message, 500);
  }
  if (!deleted) {
    return errorResponse("Task not found", 404);
  }

  return NextResponse.json({ success: true });
}
