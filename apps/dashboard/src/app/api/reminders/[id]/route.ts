import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { BUCKET_TABLES, getTaskBucket } from "@/lib/buckets";
import type { Bucket } from "@/types/database";

type Params = { params: Promise<{ id: string }> };

function getBucketForDueDate(dueDateIso: string): Bucket {
  const now = Date.now();
  const due = new Date(dueDateIso).getTime();
  const days = Math.floor((due - now) / (1000 * 60 * 60 * 24));
  if (days <= 1) return "today";
  if (days <= 7) return "this_week";
  return "later";
}

async function moveTaskToBucket(supabase: Awaited<ReturnType<typeof getAuthedSupabase>>["supabase"], taskId: string, target: Bucket) {
  if (!supabase) return;
  const current = await getTaskBucket(supabase, taskId);
  if (current === target) return;
  if (current) {
    await supabase.from(BUCKET_TABLES[current]).delete().eq("task_id", taskId);
  }
  await supabase.from(BUCKET_TABLES[target]).upsert({ task_id: taskId }, { onConflict: "task_id" });
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const { id } = await params;
  const payload = (await request.json()) as { action?: unknown; days?: unknown };
  if (payload.action !== "snooze" && payload.action !== "complete") {
    return errorResponse("action must be snooze or complete");
  }

  const { data: task, error: taskError } = await auth.supabase
    .from("tasks")
    .select("id, title, due_date, metadata, status")
    .eq("id", id)
    .maybeSingle();

  if (taskError) return errorResponse(taskError.message, 500);
  if (!task) return errorResponse("Reminder not found", 404);

  const metadata = (task.metadata as Record<string, unknown> | null) ?? {};
  if (metadata.item_type !== "renewal") {
    return errorResponse("Task is not a renewal reminder", 400);
  }

  if (payload.action === "snooze") {
    const days =
      typeof payload.days === "number" && Number.isInteger(payload.days) && payload.days > 0
        ? payload.days
        : 7;
    const currentDue = task.due_date ? new Date(task.due_date) : new Date();
    currentDue.setDate(currentDue.getDate() + days);
    const newDue = currentDue.toISOString();

    const { data: updated, error: updateError } = await auth.supabase
      .from("tasks")
      .update({ due_date: newDue })
      .eq("id", id)
      .select("*")
      .single();
    if (updateError) return errorResponse(updateError.message, 500);

    await moveTaskToBucket(auth.supabase, id, getBucketForDueDate(newDue));
    return NextResponse.json({ reminder: updated, action: "snoozed", days });
  }

  // complete
  const { data: completed, error: completeError } = await auth.supabase
    .from("tasks")
    .update({ status: "done" })
    .eq("id", id)
    .select("*")
    .single();
  if (completeError) return errorResponse(completeError.message, 500);

  const recurrence = metadata.recurrence;
  const expiresOnRaw = metadata.expires_on;
  const leadDaysRaw = metadata.lead_days;

  if ((recurrence === "yearly" || recurrence === "monthly") && typeof expiresOnRaw === "string") {
    const nextExpiry = new Date(expiresOnRaw);
    if (recurrence === "yearly") nextExpiry.setFullYear(nextExpiry.getFullYear() + 1);
    if (recurrence === "monthly") nextExpiry.setMonth(nextExpiry.getMonth() + 1);

    const leadDays =
      typeof leadDaysRaw === "number" && Number.isInteger(leadDaysRaw) && leadDaysRaw >= 0
        ? leadDaysRaw
        : 30;
    const renewBy = new Date(nextExpiry);
    renewBy.setDate(renewBy.getDate() - leadDays);
    const renewByIso = renewBy.toISOString();
    const nextMetadata = {
      ...metadata,
      expires_on: nextExpiry.toISOString(),
      renew_by: renewByIso,
    };

    const { data: nextReminder, error: nextError } = await auth.supabase
      .from("tasks")
      .insert({
        title: task.title,
        due_date: renewByIso,
        status: "pending",
        source: "manual",
        metadata: nextMetadata,
        original_body:
          typeof completed.original_body === "string" ? completed.original_body : null,
      })
      .select("id")
      .single();
    if (!nextError && nextReminder) {
      await auth.supabase.from(BUCKET_TABLES[getBucketForDueDate(renewByIso)]).insert({ task_id: nextReminder.id });
    }
  }

  return NextResponse.json({ reminder: completed, action: "completed" });
}
