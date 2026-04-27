import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { SAVED_RECIPE_COLUMNS } from "@/lib/saved-recipe-columns";

type Params = { params: Promise<{ id: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  const { id } = await params;
  if (!id || !UUID_RE.test(id)) {
    return errorResponse("Invalid id", 400);
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const o = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const titleOverride =
    typeof o.title === "string" ? o.title.replace(/\s+/g, " ").trim().slice(0, 200) : "";

  const { data: source, error: fetchError } = await auth.supabase
    .from("saved_recipes")
    .select(SAVED_RECIPE_COLUMNS)
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (fetchError) {
    return errorResponse(fetchError.message, 500);
  }
  if (!source) {
    return errorResponse("Recipe not found", 404);
  }

  const baseTitle = typeof source.title === "string" ? source.title : "Recipe";
  const title =
    titleOverride ||
    (baseTitle.toLowerCase().endsWith("(my version)")
      ? baseTitle
      : `${baseTitle} (my version)`).slice(0, 200);

  const now = new Date().toISOString();

  const { data: created, error: insertError } = await auth.supabase
    .from("saved_recipes")
    .insert({
      user_id: auth.user.id,
      title,
      title_en: source.title_en ?? "",
      title_vi: source.title_vi ?? "",
      summary: source.summary ?? "",
      meal_kind: source.meal_kind ?? "other",
      ingredients: source.ingredients,
      steps: source.steps,
      food_type_id: source.food_type_id,
      vegetarian: source.vegetarian ?? false,
      ingredient_picks: source.ingredient_picks ?? [],
      tested: false,
      want_to_try: false,
      estimated_cook_time: source.estimated_cook_time ?? "",
      difficulty: source.difficulty ?? "medium",
      source: source.source ?? "ai_generator",
      similar_recipe_url: source.similar_recipe_url ?? "",
      i18n: source.i18n ?? {},
      forked_from_id: id,
      easy_to_follow: null,
      enjoy_rating: null,
      created_at: now,
      updated_at: now,
    })
    .select(SAVED_RECIPE_COLUMNS)
    .single();

  if (insertError) {
    return errorResponse(insertError.message, 500);
  }

  return NextResponse.json({ recipe: created });
}
