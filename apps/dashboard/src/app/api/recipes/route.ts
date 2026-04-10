import { RECIPE_GENERATOR_SOURCE_LABEL } from "@agent/shared";
import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { isValidFoodTypeId } from "@/lib/recipe-food-types";
import { parseSaveRecipeBody } from "@/lib/recipe-request";

export async function GET() {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  const { data, error } = await auth.supabase
    .from("saved_recipes")
    .select(
      "id, title, title_en, title_vi, summary, meal_kind, ingredients, steps, food_type_id, vegetarian, ingredient_picks, tested, want_to_try, estimated_cook_time, source, similar_recipe_url, created_at, updated_at",
    )
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
      source: RECIPE_GENERATOR_SOURCE_LABEL,
    })
    .select(
      "id, title, title_en, title_vi, summary, meal_kind, ingredients, steps, food_type_id, vegetarian, ingredient_picks, tested, want_to_try, estimated_cook_time, source, similar_recipe_url, created_at, updated_at",
    )
    .single();

  if (error) {
    return errorResponse(error.message, 500);
  }

  return NextResponse.json({ recipe: data });
}
