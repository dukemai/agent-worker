import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { isValidFoodTypeId } from "@/lib/recipe-food-types";
import { parseSaveRecipeBody } from "@/lib/recipe-request";
import { SAVED_RECIPE_COLUMNS } from "@/lib/saved-recipe-columns";

export async function GET() {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  const { data, error } = await auth.supabase
    .from("saved_recipes")
    .select(SAVED_RECIPE_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    return errorResponse(error.message, 500);
  }

  return NextResponse.json({ recipes: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Expected JSON body", 400);
  }

  const parsed = parseSaveRecipeBody(body);
  if ("error" in parsed) {
    return errorResponse(parsed.error, 400);
  }

  if (!isValidFoodTypeId(parsed.food_type_id)) {
    return errorResponse("food_type_id is invalid", 400);
  }

  const { data, error } = await auth.supabase
    .from("saved_recipes")
    .insert({
      user_id: auth.user.id,
      title: parsed.title,
      title_en: parsed.title_en,
      title_vi: parsed.title_vi,
      summary: parsed.summary,
      meal_kind: parsed.meal_kind,
      ingredients: parsed.ingredients,
      steps: parsed.steps,
      food_type_id: parsed.food_type_id,
      vegetarian: parsed.vegetarian,
      ingredient_picks: parsed.ingredient_picks,
      tested: false,
      want_to_try: false,
      estimated_cook_time: parsed.estimated_cook_time,
      difficulty: parsed.difficulty,
      source: parsed.source,
      source_markdown: parsed.source_markdown,
      similar_recipe_url: parsed.similar_recipe_url,
      i18n: parsed.i18n ?? {},
    })
    .select(SAVED_RECIPE_COLUMNS)
    .single();

  if (error) {
    return errorResponse(error.message, 500);
  }

  return NextResponse.json({ recipe: data });
}
