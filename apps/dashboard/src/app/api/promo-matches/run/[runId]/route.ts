import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { deletePromoMatchRun } from "@/lib/promo-matches-run";

type RouteContext = { params: Promise<{ runId: string }> };

/**
 * DELETE: remove one import run (and its items). Use to clear the current import from the DB.
 */
export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const { runId } = await context.params;
  if (!runId || typeof runId !== "string") {
    return errorResponse("Missing run id", 400);
  }

  const result = await deletePromoMatchRun(auth.supabase, runId);
  if (!result.ok) {
    if (result.error === "Run not found") {
      return errorResponse(result.error, 404);
    }
    return errorResponse(result.error, 500);
  }

  return NextResponse.json({ deleted: true, runId });
}
