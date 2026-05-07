import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { isValidFoodTypeId } from "@/lib/recipe-food-types";
import { parseFeedbackPatch, parseRecipePartialUpdate } from "@/lib/recipe-request";
import { SAVED_RECIPE_COLUMNS } from "@/lib/saved-recipe-columns";
import { parseSimilarRecipeUrl } from "@/lib/recipe-source";

type Params = { params: Promise<{ id: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const RECIPE_SELECT = SAVED_RECIPE_COLUMNS;

export async function GET(_: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  const { id } = await params;
  if (!id || !UUID_RE.test(id)) {
    return errorResponse("Invalid id", 400);
  }

  const { data, error } = await auth.supabase
    .from("saved_recipes")
    .select(RECIPE_SELECT)
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (error) {
    return errorResponse(error.message, 500);
  }
  if (!data) {
    return errorResponse("Recipe not found", 404);
  }

  return NextResponse.json({ recipe: data });
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Expected JSON body", 400);
  }
  if (!body || typeof body !== "object") {
    return errorResponse("Invalid body", 400);
  }
  const o = body as Record<string, unknown>;
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (typeof o.tested === "boolean") {
    patch.tested = o.tested;
  }
  if (typeof o.want_to_try === "boolean") {
    patch.want_to_try = o.want_to_try;
  }
  if (typeof o.estimated_cook_time === "string") {
    patch.estimated_cook_time = o.estimated_cook_time.trim().slice(0, 120);
  }
  if (Object.prototype.hasOwnProperty.call(o, "similar_recipe_url")) {
    const parsed = parseSimilarRecipeUrl(o.similar_recipe_url);
    if (typeof parsed === "object" && "error" in parsed) {
      return errorResponse(parsed.error, 400);
    }
    patch.similar_recipe_url = parsed;
  }

  const recipePartial = parseRecipePartialUpdate(o);
  if ("error" in recipePartial) {
    return errorResponse(recipePartial.error, 400);
  }
  if (
    typeof recipePartial.patch.food_type_id === "string" &&
    !isValidFoodTypeId(recipePartial.patch.food_type_id)
  ) {
    return errorResponse("food_type_id is invalid", 400);
  }
  Object.assign(patch, recipePartial.patch);

  const feedbackPartial = parseFeedbackPatch(o);
  if ("error" in feedbackPartial) {
    return errorResponse(feedbackPartial.error, 400);
  }
  Object.assign(patch, feedbackPartial.patch);

  const patchKeys = Object.keys(patch).filter((k) => k !== "updated_at");
  if (patchKeys.length === 0) {
    return errorResponse(
      "Body must include at least one allowed field (flags, times, URLs, or recipe content)",
      400,
    );
  }

  const { data, error } = await auth.supabase
    .from("saved_recipes")
    .update(patch)
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .select(RECIPE_SELECT)
    .maybeSingle();

  if (error) {
    return errorResponse(error.message, 500);
  }
  if (!data) {
    return errorResponse("Recipe not found", 404);
  }

  return NextResponse.json({ recipe: data });
}

export async function DELETE(_: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  const { id } = await params;
  if (!id || !UUID_RE.test(id)) {
    return errorResponse("Invalid id", 400);
  }

  const { data, error } = await auth.supabase
    .from("saved_recipes")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return errorResponse(error.message, 500);
  }
  if (!data) {
    return errorResponse("Recipe not found", 404);
  }

  return NextResponse.json({ deleted: true, id });
}
