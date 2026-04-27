import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { getUserHousehold } from "@/lib/household";

const STATUS_VALUES = new Set([
  "new",
  "want_to_try",
  "looks_good",
  "needs_changes",
  "accepted",
  "rejected",
]);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  const household = await getUserHousehold(auth.supabase, auth.user.id);
  if (household.error) {
    return errorResponse(household.error.message, 500);
  }
  if (!household.household) {
    return errorResponse("No household found", 404);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return errorResponse("Expected JSON body", 400);
  }

  const status = typeof body.status === "string" ? body.status.trim() : "";
  if (!STATUS_VALUES.has(status)) {
    return errorResponse("Invalid candidate status", 400);
  }

  const { id } = await context.params;
  const { data, error } = await auth.supabase
    .from("recipe_candidates")
    .update({ status })
    .eq("id", id)
    .eq("household_id", household.household.id)
    .select(
      "id, household_id, submitted_by, title, source_url, notes, raw_text, status, converted_recipe_id, created_at, updated_at",
    )
    .maybeSingle();

  if (error) {
    return errorResponse(error.message, 500);
  }
  if (!data) {
    return errorResponse("Recipe candidate not found", 404);
  }

  return NextResponse.json({ candidate: data });
}
