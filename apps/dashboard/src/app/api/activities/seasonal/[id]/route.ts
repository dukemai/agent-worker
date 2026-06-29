import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import type { SeasonalActivityStatus } from "@/types/database";

type Params = { params: Promise<{ id: string }> };
const VALID_STATUSES = new Set<SeasonalActivityStatus>(["active", "dismissed", "expired", "archived"]);

export async function PATCH(request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) return auth.error;

  const { id } = await params;
  if (!id) return errorResponse("Seasonal activity id is required");

  const payload = (await request.json()) as { status?: unknown; favorite?: unknown };
  const updates: { status?: SeasonalActivityStatus; favorite?: boolean } = {};

  if ("status" in payload) {
    if (typeof payload.status !== "string" || !VALID_STATUSES.has(payload.status as SeasonalActivityStatus)) {
      return errorResponse("status must be active, dismissed, expired, or archived");
    }
    updates.status = payload.status as SeasonalActivityStatus;
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
    .from("seasonal_activity_instances")
    .update(updates)
    .eq("id", id)
    .select("id, status, favorite, updated_at")
    .maybeSingle();

  if (error) return errorResponse(error.message, 500);
  if (!data) return errorResponse("Seasonal activity not found", 404);
  return NextResponse.json({ instance: data });
}
