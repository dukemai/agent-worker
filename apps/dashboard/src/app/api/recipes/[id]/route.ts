import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { parseRecipePartialUpdate } from "@/lib/recipe-request";
import { parseSimilarRecipeUrl } from "@/lib/recipe-source";

type Params = { params: Promise<{ id: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  Object.assign(patch, recipePartial.patch);

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
    .select(
      "id, title, title_en, title_vi, summary, meal_kind, ingredients, steps, food_type_id, vegetarian, ingredient_picks, tested, want_to_try, estimated_cook_time, source, similar_recipe_url, created_at, updated_at",
    )
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
