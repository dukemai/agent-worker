import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { cleanText, isOneOf, parseDateOnly, TRIP_DECISION_STATUSES } from "@/lib/trip-ops";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  const { id } = await params;
  const payload = await request.json();
  const title = cleanText(payload.title, 180);
  if (!title) return errorResponse("title is required");

  const status = payload.status ?? "open";
  if (!isOneOf(status, TRIP_DECISION_STATUSES)) return errorResponse("Invalid decision status");

  const dueDate = parseDateOnly(payload.due_date);
  if (dueDate === undefined) return errorResponse("due_date must use YYYY-MM-DD or null");

  const { data: trip, error: tripError } = await auth.supabase
    .from("trips")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (tripError) return errorResponse(tripError.message, 500);
  if (!trip) return errorResponse("Trip not found", 404);

  const { data: decision, error } = await auth.supabase
    .from("trip_decisions")
    .insert({
      trip_id: id,
      title,
      status,
      owner: cleanText(payload.owner, 120),
      due_date: dueDate ?? null,
      outcome: cleanText(payload.outcome),
      notes: cleanText(payload.notes),
    })
    .select("*")
    .single();

  if (error || !decision) return errorResponse(error?.message ?? "Failed to create decision", 500);

  return NextResponse.json({ decision }, { status: 201 });
}

