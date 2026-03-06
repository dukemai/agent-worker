import type { SupabaseClient } from "@supabase/supabase-js";
import type { BucketRow, Task } from "./types";

/**
 * Fetch pending tasks for a bucket table (e.g. today_tasks, this_week_tasks, later_tasks).
 * Shared by worker daily digest and dashboard.
 */
export async function fetchPendingTasksForBucket(
  supabase: SupabaseClient,
  bucketTable: string
): Promise<Task[]> {
  const { data: bucketRows, error: bucketError } = await supabase
    .from(bucketTable)
    .select("task_id");

  if (bucketError || !bucketRows?.length) return [];

  const taskIds = (bucketRows as BucketRow[]).map((r) => r.task_id);

  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("id, title, original_body, due_date, status, source, metadata")
    .in("id", taskIds)
    .eq("status", "pending")
    .order("due_date", { ascending: true, nullsFirst: false });

  if (tasksError) return [];
  return (tasks as Task[]) ?? [];
}
