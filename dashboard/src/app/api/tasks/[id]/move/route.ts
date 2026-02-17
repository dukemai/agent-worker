import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { BUCKET_TABLES, isBucket } from "@/lib/buckets";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const payload = (await request.json()) as {
    from_bucket?: unknown;
    to_bucket?: unknown;
  };

  if (!isBucket(payload.from_bucket) || !isBucket(payload.to_bucket)) {
    return errorResponse("Invalid bucket. Must be today, this_week, or later");
  }
  if (payload.from_bucket === payload.to_bucket) {
    return errorResponse("from_bucket and to_bucket must differ");
  }

  const { id } = await params;
  const fromTable = BUCKET_TABLES[payload.from_bucket];
  const toTable = BUCKET_TABLES[payload.to_bucket];

  const { data: deleted, error: deleteError } = await auth.supabase
    .from(fromTable)
    .delete()
    .eq("task_id", id)
    .select("task_id")
    .maybeSingle();

  if (deleteError) {
    return errorResponse(deleteError.message, 500);
  }
  if (!deleted) {
    return errorResponse("Task not found in source bucket", 404);
  }

  const { error: insertError } = await auth.supabase.from(toTable).insert({ task_id: id });
  if (insertError) {
    return errorResponse(insertError.message, 500);
  }

  return NextResponse.json({ success: true, bucket: payload.to_bucket });
}
