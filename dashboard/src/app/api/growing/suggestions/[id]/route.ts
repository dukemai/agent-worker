import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const payload = (await request.json()) as { status?: unknown };
  if (payload.status !== "pending" && payload.status !== "dismissed" && payload.status !== "done") {
    return errorResponse("status must be pending, dismissed, or done");
  }

  const { id } = await params;
  const { data: updated, error } = await auth.supabase
    .from("growing_suggestions_log")
    .update({
      status: payload.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, status, updated_at")
    .maybeSingle();

  if (error) {
    return errorResponse(error.message, 500);
  }
  if (!updated) {
    return errorResponse("Suggestion not found", 404);
  }

  return NextResponse.json({ suggestion: updated });
}
