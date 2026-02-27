import { NextRequest, NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase, parseIsoDate } from "@/lib/api";
import { BUCKET_TABLES, isBucket } from "@/lib/buckets";

export async function GET(request: NextRequest) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const bucketParam = request.nextUrl.searchParams.get("bucket");
  if (!isBucket(bucketParam)) {
    return errorResponse("Invalid bucket. Must be today, this_week, or later");
  }

  const bucketTable = BUCKET_TABLES[bucketParam];
  const { data: bucketRows, error: bucketError } = await auth.supabase
    .from(bucketTable)
    .select("task_id");

  if (bucketError) {
    return errorResponse(bucketError.message, 500);
  }

  const taskIds = (bucketRows ?? []).map((row) => row.task_id);
  if (taskIds.length === 0) {
    return NextResponse.json({ tasks: [] });
  }

  const { data: tasks, error: taskError } = await auth.supabase
    .from("tasks")
    .select("*")
    .in("id", taskIds)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (taskError) {
    return errorResponse(taskError.message, 500);
  }

  return NextResponse.json({ tasks: tasks ?? [] });
}

export async function POST(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const payload = (await request.json()) as {
    title?: unknown;
    due_date?: unknown;
    bucket?: unknown;
  };

  if (typeof payload.title !== "string" || payload.title.trim().length === 0) {
    return errorResponse("title is required");
  }
  if (!isBucket(payload.bucket)) {
    return errorResponse("Invalid bucket");
  }

  const dueDate = parseIsoDate(payload.due_date);
  if (payload.due_date !== undefined && dueDate === undefined) {
    return errorResponse("Invalid due_date. Use ISO8601 date-time or null");
  }

  const { data: task, error: insertTaskError } = await auth.supabase
    .from("tasks")
    .insert({
      title: payload.title.trim().slice(0, 200),
      due_date: dueDate ?? null,
      source: "manual",
      status: "pending",
    })
    .select("*")
    .single();

  if (insertTaskError || !task) {
    return errorResponse(insertTaskError?.message ?? "Failed to create task", 500);
  }

  const bucketTable = BUCKET_TABLES[payload.bucket];
  const { error: bucketError } = await auth.supabase
    .from(bucketTable)
    .insert({ task_id: task.id });

  if (bucketError) {
    return errorResponse(bucketError.message, 500);
  }

  return NextResponse.json(
    {
      task: {
        ...task,
        bucket: payload.bucket,
      },
    },
    { status: 201 }
  );
}
