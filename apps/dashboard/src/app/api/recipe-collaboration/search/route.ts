import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import type { IngredientSourceOption } from "@/lib/ingredient-source-index";
import {
  fetchHouseholdVisibleRecipes,
  recipeMatchesCollaborationSearch,
} from "@/lib/recipe-collaboration-search";
import { loadIngredientSourceIndex } from "@/lib/ingredient-source-server";
import { getFoodTypeLabelSv, isValidFoodTypeId } from "@/lib/recipe-food-types";

const MAX_QUERY_LENGTH = 120;
const MAX_RESULTS = 80;

function cleanParam(value: string | null): string {
  return (value ?? "").trim().slice(0, MAX_QUERY_LENGTH);
}

function parseIngredientIds(searchParams: URLSearchParams): string[] {
  return [
    ...searchParams.getAll("ingredientId"),
    ...(searchParams.get("ingredientIds") ?? "").split(","),
  ]
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export async function GET(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  const { searchParams } = new URL(request.url);
  const q = cleanParam(searchParams.get("q"));
  const ingredient = cleanParam(searchParams.get("ingredient"));
  const styleId = cleanParam(searchParams.get("styleId"));
  const ingredientIds = parseIngredientIds(searchParams);

  if (styleId && !isValidFoodTypeId(styleId)) {
    return errorResponse("styleId is invalid", 400);
  }

  const ingredientIndex = loadIngredientSourceIndex();
  const ingredientById = new Map(ingredientIndex.options.map((option) => [option.id, option]));
  const ingredientSources: IngredientSourceOption[] = [];
  for (const id of ingredientIds) {
    const source = ingredientById.get(id);
    if (!source) {
      return errorResponse("ingredientId is invalid", 400);
    }
    ingredientSources.push(source);
  }

  const result = await fetchHouseholdVisibleRecipes(auth.supabase, auth.user);
  if (result.error) {
    return errorResponse(result.error.message, 500);
  }

  const recipes = result.recipes
    .filter((recipe) =>
      recipeMatchesCollaborationSearch(recipe, {
        q,
        ingredient,
        ingredientSources,
        styleId,
        foodTypeLabel: getFoodTypeLabelSv(recipe.food_type_id) ?? undefined,
      }),
    )
    .slice(0, MAX_RESULTS);

  return NextResponse.json({
    recipes,
    meta: {
      q,
      ingredient,
      ingredientIds,
      styleId,
      total: recipes.length,
      maxResults: MAX_RESULTS,
    },
  });
}
