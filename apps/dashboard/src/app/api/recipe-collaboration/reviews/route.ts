import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { getUserHousehold } from "@/lib/household";

const REVIEW_STATUS_VALUES = new Set([
  "want_to_try",
  "looks_good",
  "needs_changes",
  "tested_keep",
  "tested_skip",
]);

function cleanComment(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 2000) : "";
}

export async function GET() {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  const household = await getUserHousehold(auth.supabase, auth.user.id);
  if (household.error) {
    return errorResponse(household.error.message, 500);
  }
  if (!household.household) {
    return NextResponse.json({ reviews: [] });
  }

  const { data, error } = await auth.supabase
    .from("recipe_reviews")
    .select("id, household_id, recipe_id, candidate_id, reviewer_user_id, status, comment, created_at")
    .eq("household_id", household.household.id)
    .order("created_at", { ascending: false });

  if (error) {
    return errorResponse(error.message, 500);
  }

  return NextResponse.json({ reviews: data ?? [] });
}

export async function POST(request: Request) {
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
  if (!REVIEW_STATUS_VALUES.has(status)) {
    return errorResponse("Invalid review status", 400);
  }

  const recipeId = typeof body.recipeId === "string" && body.recipeId.trim() ? body.recipeId.trim() : null;
  const candidateId =
    typeof body.candidateId === "string" && body.candidateId.trim() ? body.candidateId.trim() : null;
  if (!recipeId && !candidateId) {
    return errorResponse("recipeId or candidateId is required", 400);
  }

  const { data, error } = await auth.supabase
    .from("recipe_reviews")
    .insert({
      household_id: household.household.id,
      recipe_id: recipeId,
      candidate_id: candidateId,
      reviewer_user_id: auth.user.id,
      status,
      comment: cleanComment(body.comment),
    })
    .select("id, household_id, recipe_id, candidate_id, reviewer_user_id, status, comment, created_at")
    .single();

  if (error || !data) {
    return errorResponse(error?.message ?? "Failed to save review", 500);
  }

  return NextResponse.json({ review: data }, { status: 201 });
}
