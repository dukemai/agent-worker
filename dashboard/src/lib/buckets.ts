import type { Bucket } from "@/types/database";

export const BUCKET_TABLES: Record<Bucket, string> = {
  today: "today_tasks",
  this_week: "this_week_tasks",
  later: "later_tasks",
};

export function isBucket(value: unknown): value is Bucket {
  return value === "today" || value === "this_week" || value === "later";
}

type BucketLookupClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{ data: unknown }>;
      };
    };
  };
};

export async function getTaskBucket(supabase: unknown, taskId: string): Promise<Bucket | null> {
  const client = supabase as BucketLookupClient;
  for (const [bucket, table] of Object.entries(BUCKET_TABLES) as [Bucket, string][]) {
    const { data } = await client.from(table).select("task_id").eq("task_id", taskId).maybeSingle();
    if (data) {
      return bucket;
    }
  }
  return null;
}
