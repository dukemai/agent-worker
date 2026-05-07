import {
  generateRecipesFromVietnameseMeals,
  RECIPE_GENERATOR_MODEL_ID,
  RECIPE_GENERATOR_SOURCE_LABEL,
} from "@agent/shared";
import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { normalizeExcludeMealTitles } from "@/lib/recipe-request";
import {
  isUuid,
  VIETNAMESE_MEAL_COLUMNS,
  type VietnameseMealRow,
} from "@/lib/vietnamese-meals";

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
  if (!body || typeof body !== "object") {
    return errorResponse("Invalid body", 400);
  }

  const o = body as Record<string, unknown>;
  const mealIds = Array.isArray(o.mealIds)
    ? o.mealIds.filter((id): id is string => typeof id === "string" && isUuid(id)).slice(0, 8)
    : [];
  if (mealIds.length === 0) {
    return errorResponse("mealIds must contain at least one valid meal id", 400);
  }
  const excludeMealTitles = normalizeExcludeMealTitles(o.excludeMealTitles);

  const { data, error } = await auth.supabase
    .from("vietnamese_meals")
    .select(VIETNAMESE_MEAL_COLUMNS)
    .eq("created_by", auth.user.id)
    .eq("status", "published")
    .in("id", mealIds);

  if (error) {
    return errorResponse(error.message, 500);
  }

  const meals = (data ?? []) as VietnameseMealRow[];
  if (meals.length === 0) {
    return errorResponse("No published Vietnamese meals found for those ids", 404);
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return errorResponse(
      "GEMINI_API_KEY is not configured on the server. Add it to the dashboard environment.",
      503,
    );
  }

  try {
    const result = await generateRecipesFromVietnameseMeals(apiKey, {
      meals: meals.map((meal) => ({
        name_vi: meal.name_vi,
        name_en: meal.name_en ?? "",
        summary: meal.summary,
        region_tags: meal.region_tags,
        base_tags: meal.base_tags,
        protein_tags: meal.protein_tags,
        typical_ingredients: meal.typical_ingredients,
      })),
      excludeMealTitles,
    });
    return NextResponse.json({
      result,
      meta: {
        food_type_id: "vietnamese",
        food_type_label_sv: "Vietnamesiskt",
        vegetarian: false,
        ingredient_count: meals.reduce(
          (sum, meal) => sum + Math.min(meal.typical_ingredients.length, 24),
          0,
        ),
        exclude_count: excludeMealTitles.length,
        recipe_model: RECIPE_GENERATOR_MODEL_ID,
        recipe_source_label: RECIPE_GENERATOR_SOURCE_LABEL,
        source_meal_ids: meals.map((meal) => meal.id),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return errorResponse(`Vietnamese recipe suggestion failed: ${msg}`, 502);
  }
}
