import {
  generateRecipeIdeasFromIngredients,
  RECIPE_GENERATOR_MODEL_ID,
  RECIPE_GENERATOR_SOURCE_LABEL,
} from "@agent/shared";
import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { getFoodTypeLabelSv, isValidFoodTypeId } from "@/lib/recipe-food-types";
import { normalizeExcludeMealTitles, normalizeIngredientTexts } from "@/lib/recipe-request";

export async function POST(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
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
  const ingredientTexts = normalizeIngredientTexts(o.ingredientTexts);
  const foodTypeId = typeof o.foodTypeId === "string" ? o.foodTypeId.trim() : "";
  if (!foodTypeId || !isValidFoodTypeId(foodTypeId)) {
    return errorResponse("foodTypeId is invalid", 400);
  }
  const vegetarian = o.vegetarian === true;
  const excludeMealTitles = normalizeExcludeMealTitles(o.excludeMealTitles);

  const label = getFoodTypeLabelSv(foodTypeId);
  if (!label) {
    return errorResponse("foodTypeId is invalid", 400);
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return errorResponse(
      "GEMINI_API_KEY is not configured on the server. Add it to the dashboard environment.",
      503,
    );
  }

  try {
    const result = await generateRecipeIdeasFromIngredients(apiKey, {
      ingredientTexts,
      foodTypeLabelSv: label,
      vegetarian,
      excludeMealTitles,
    });
    return NextResponse.json({
      result,
      meta: {
        food_type_id: foodTypeId,
        food_type_label_sv: label,
        vegetarian,
        ingredient_count: ingredientTexts.length,
        exclude_count: excludeMealTitles.length,
        recipe_model: RECIPE_GENERATOR_MODEL_ID,
        recipe_source_label: RECIPE_GENERATOR_SOURCE_LABEL,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return errorResponse(`Recipe generation failed: ${msg}`, 502);
  }
}
