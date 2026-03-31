import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase, parseIsoDate } from "@/lib/api";
import { BUCKET_TABLES, isBucket } from "@/lib/buckets";

export async function POST(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const payload = (await request.json()) as {
    suggestion_id?: unknown;
    bucket?: unknown;
    due_date?: unknown;
  };

  if (typeof payload.suggestion_id !== "string" || payload.suggestion_id.length === 0) {
    return errorResponse("suggestion_id is required");
  }
  if (!isBucket(payload.bucket)) {
    return errorResponse("Invalid bucket");
  }

  const dueDate = parseIsoDate(payload.due_date);
  if (payload.due_date !== undefined && dueDate === undefined) {
    return errorResponse("Invalid due_date. Use ISO8601 date-time or null");
  }

  const { data: suggestion, error: suggestionError } = await auth.supabase
    .from("growing_suggestions_log")
    .select("id, title, details, suggestion_kind, status, window_id")
    .eq("id", payload.suggestion_id)
    .maybeSingle();

  if (suggestionError) {
    return errorResponse(suggestionError.message, 500);
  }
  if (!suggestion) {
    return errorResponse("Suggestion not found", 404);
  }
  if (suggestion.status !== "pending") {
    return errorResponse("Only pending suggestions can be converted", 400);
  }

  const { data: task, error: taskError } = await auth.supabase
    .from("tasks")
    .insert({
      title: suggestion.title,
      original_body: suggestion.details,
      due_date: dueDate ?? null,
      source: "growing",
      status: "pending",
      window_id: suggestion.window_id,
      metadata: {
        item_type: "growing",
        suggestion_id: suggestion.id,
        suggestion_kind: suggestion.suggestion_kind,
        window_id: suggestion.window_id,
      },
    })
    .select("*")
    .single();

  if (taskError || !task) {
    return errorResponse(taskError?.message ?? "Failed to create task from suggestion", 500);
  }

  const { error: bucketError } = await auth.supabase
    .from(BUCKET_TABLES[payload.bucket])
    .insert({ task_id: task.id });

  if (bucketError) {
    return errorResponse(bucketError.message, 500);
  }

  const { error: updateSuggestionError } = await auth.supabase
    .from("growing_suggestions_log")
    .update({
      status: "converted",
      converted_task_id: task.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", suggestion.id);

  if (updateSuggestionError) {
    return errorResponse(updateSuggestionError.message, 500);
  }

  return NextResponse.json({ success: true, task, bucket: payload.bucket }, { status: 201 });
}
