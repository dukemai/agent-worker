import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase, parseIsoDate } from "@/lib/api";
import { BUCKET_TABLES } from "@/lib/buckets";
import { cleanText, isBucket, isOneOf, TRIP_TASK_CATEGORIES } from "@/lib/trip-ops";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  const { id } = await params;
  const payload = await request.json();
  const title = cleanText(payload.title, 200);
  if (!title) return errorResponse("title is required");
  const bucket = payload.bucket;
  if (!isBucket(bucket)) return errorResponse("Invalid bucket");

  const dueDate = parseIsoDate(payload.due_date);
  if (payload.due_date !== undefined && dueDate === undefined) {
    return errorResponse("Invalid due_date. Use ISO8601 date-time or null");
  }

  const category = payload.category ?? "other";
  if (!isOneOf(category, TRIP_TASK_CATEGORIES)) return errorResponse("Invalid task category");

  const { data: trip, error: tripError } = await auth.supabase
    .from("trips")
    .select("id, title")
    .eq("id", id)
    .maybeSingle();
  if (tripError) return errorResponse(tripError.message, 500);
  if (!trip) return errorResponse("Trip not found", 404);

  const { data: task, error: taskError } = await auth.supabase
    .from("tasks")
    .insert({
      title,
      original_body: cleanText(payload.original_body, 3000),
      due_date: dueDate ?? null,
      status: "pending",
      source: "manual",
      metadata: {
        item_type: "trip_task",
        trip_id: id,
        trip_title: trip.title,
        category,
        source_item_id: cleanText(payload.source_item_id, 80),
        source_item_type: cleanText(payload.source_item_type, 40),
      },
    })
    .select("*")
    .single();

  if (taskError || !task) return errorResponse(taskError?.message ?? "Failed to create task", 500);

  const { error: bucketError } = await auth.supabase.from(BUCKET_TABLES[bucket]).insert({ task_id: task.id });
  if (bucketError) return errorResponse(bucketError.message, 500);

  return NextResponse.json({ task: { ...task, bucket } }, { status: 201 });
}
