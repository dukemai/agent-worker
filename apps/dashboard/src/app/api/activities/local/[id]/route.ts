import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import type { ActivityStatus } from "@/types/database";

type Params = { params: Promise<{ id: string }> };
const VALID_STATUSES = new Set<ActivityStatus>(["active", "dismissed", "archived"]);

export async function PATCH(request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) return auth.error;

  const { id } = await params;
  if (!id) return errorResponse("Activity id is required");

  const payload = (await request.json()) as { status?: unknown; favorite?: unknown };
  const updates: { status?: ActivityStatus; favorite?: boolean } = {};

  if ("status" in payload) {
    if (typeof payload.status !== "string" || !VALID_STATUSES.has(payload.status as ActivityStatus)) {
      return errorResponse("status must be active, dismissed, or archived");
    }
    updates.status = payload.status as ActivityStatus;
  }

  if ("favorite" in payload) {
    if (typeof payload.favorite !== "boolean") {
      return errorResponse("favorite must be a boolean");
    }
    updates.favorite = payload.favorite;
  }

  if (Object.keys(updates).length === 0) {
    return errorResponse("status or favorite is required");
  }

  const { data, error } = await auth.supabase
    .from("local_activities")
    .update(updates)
    .eq("id", id)
    .select("id, status, favorite, updated_at")
    .maybeSingle();

  if (error) return errorResponse(error.message, 500);
  if (!data) return errorResponse("Activity not found", 404);
  return NextResponse.json({ activity: data });
}
