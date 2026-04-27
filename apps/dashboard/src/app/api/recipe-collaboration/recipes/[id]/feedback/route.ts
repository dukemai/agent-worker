import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { ensureUserHousehold } from "@/lib/household";
import { SAVED_RECIPE_COLUMNS } from "@/lib/saved-recipe-columns";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type Params = { params: Promise<{ id: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RecipeAccessRow = {
  id: string;
  user_id: string;
  household_id: string | null;
};

function applyBooleanPatch(
  patch: Record<string, unknown>,
  key: "tested" | "want_to_try" | "easy_to_follow",
  value: unknown,
) {
  if (typeof value === "boolean") {
    patch[key] = value;
  }
  if (key === "easy_to_follow" && value === null) {
    patch[key] = null;
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  const { id } = await params;
  if (!id || !UUID_RE.test(id)) {
    return errorResponse("Invalid id", 400);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return errorResponse("Expected JSON body", 400);
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  applyBooleanPatch(patch, "tested", body.tested);
  applyBooleanPatch(patch, "want_to_try", body.want_to_try);
  applyBooleanPatch(patch, "easy_to_follow", body.easy_to_follow);

  if (Object.keys(patch).length === 1) {
    return errorResponse("Body must include feedback fields", 400);
  }

  const householdResult = await ensureUserHousehold(auth.supabase, auth.user);
  if (householdResult.error) {
    return errorResponse(householdResult.error.message, 500);
  }

  const serviceSupabase = createServiceRoleClient();
  if (!serviceSupabase) {
    const { data, error } = await auth.supabase
      .from("saved_recipes")
      .update(patch)
      .eq("id", id)
      .eq("household_id", householdResult.household.id)
      .select(SAVED_RECIPE_COLUMNS)
      .maybeSingle();

    if (error) {
      return errorResponse(error.message, 500);
    }
    if (!data) {
      return errorResponse("Recipe not found", 404);
    }
    return NextResponse.json({ recipe: data });
  }

  const { data: recipe, error: recipeError } = await serviceSupabase
    .from("saved_recipes")
    .select("id, user_id, household_id")
    .eq("id", id)
    .maybeSingle();

  if (recipeError) {
    return errorResponse(recipeError.message, 500);
  }
  if (!recipe) {
    return errorResponse("Recipe not found", 404);
  }

  const access = recipe as RecipeAccessRow;
  const { data: membership, error: membershipError } = await serviceSupabase
    .from("household_members")
    .select("user_id")
    .eq("household_id", householdResult.household.id);

  if (membershipError) {
    return errorResponse(membershipError.message, 500);
  }

  const memberIds = (membership ?? [])
    .map((member) => (typeof member.user_id === "string" ? member.user_id : ""))
    .filter(Boolean);

  const canAccess =
    access.household_id === householdResult.household.id || memberIds.includes(access.user_id);

  if (!canAccess) {
    return errorResponse("Recipe not found", 404);
  }

  const { data, error } = await serviceSupabase
    .from("saved_recipes")
    .update(patch)
    .eq("id", id)
    .select(SAVED_RECIPE_COLUMNS)
    .maybeSingle();

  if (error) {
    return errorResponse(error.message, 500);
  }
  if (!data) {
    return errorResponse("Recipe not found", 404);
  }

  return NextResponse.json({ recipe: data });
}
