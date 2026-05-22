import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { cleanText, isOneOf, parseDateOnly, TRIP_DECISION_STATUSES } from "@/lib/trip-ops";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) return auth.error;

  const { id } = await params;
  const payload = await request.json();
  const updates: Record<string, unknown> = {};

  if (payload.title !== undefined) {
    const title = cleanText(payload.title, 180);
    if (!title) return errorResponse("title must be a non-empty string");
    updates.title = title;
  }
  if (payload.status !== undefined) {
    if (!isOneOf(payload.status, TRIP_DECISION_STATUSES)) return errorResponse("Invalid decision status");
    updates.status = payload.status;
  }
  if (payload.due_date !== undefined) {
    const dueDate = parseDateOnly(payload.due_date);
    if (dueDate === undefined) return errorResponse("due_date must use YYYY-MM-DD or null");
    updates.due_date = dueDate;
  }
  for (const field of ["owner", "outcome", "notes"] as const) {
    if (payload[field] !== undefined) {
      const value = cleanText(payload[field]);
      if (value === undefined) return errorResponse(`${field} must be a string or null`);
      updates[field] = value;
    }
  }

  if (Object.keys(updates).length === 0) return errorResponse("No valid fields to update");

  const { data: decision, error } = await auth.supabase
    .from("trip_decisions")
    .update(updates)
    .eq("id", id)
    .select("*, trips!inner(id)")
    .maybeSingle();

  if (error) return errorResponse(error.message, 500);
  if (!decision) return errorResponse("Decision not found", 404);

  const cleanDecision = { ...(decision as Record<string, unknown>) };
  delete cleanDecision.trips;
  return NextResponse.json({ decision: cleanDecision });
}

export async function DELETE(_: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) return auth.error;

  const { id } = await params;
  const { data: existing, error: lookupError } = await auth.supabase
    .from("trip_decisions")
    .select("id, trips!inner(id)")
    .eq("id", id)
    .maybeSingle();

  if (lookupError) return errorResponse(lookupError.message, 500);
  if (!existing) return errorResponse("Decision not found", 404);

  const { error } = await auth.supabase.from("trip_decisions").delete().eq("id", id);
  if (error) return errorResponse(error.message, 500);

  return NextResponse.json({ success: true });
}
