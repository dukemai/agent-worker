import { throwApiError } from "@/components/dashboard/recipe-generator-api";
import type { IngredientSourceIndex } from "@/lib/ingredient-source-index";
import type { SavedRecipeRow } from "@/lib/saved-recipe-row";

export type FamilyRecipeSearchResponse = {
  recipes: SavedRecipeRow[];
  meta: {
    q: string;
    ingredient: string;
    ingredientIds: string[];
    styleId: string;
    total: number;
    maxResults: number;
  };
};

export async function fetchFamilyRecipeSearch(input: {
  q: string;
  ingredientIds: string[];
  styleId: string;
  allStylesValue: string;
}): Promise<FamilyRecipeSearchResponse> {
  const params = new URLSearchParams();
  if (input.q.trim()) {
    params.set("q", input.q.trim());
  }
  for (const ingredientId of input.ingredientIds) {
    params.append("ingredientId", ingredientId);
  }
  if (input.styleId !== input.allStylesValue) {
    params.set("styleId", input.styleId);
  }

  const response = await fetch(`/api/recipe-collaboration/search?${params.toString()}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    await throwApiError(response, "Failed to search recipes");
  }
  return response.json() as Promise<FamilyRecipeSearchResponse>;
}

export async function fetchIngredientSourceIndex(): Promise<IngredientSourceIndex> {
  const response = await fetch("/api/recipes/ingredient-sources", {
    cache: "no-store",
  });
  if (!response.ok) {
    await throwApiError(response, "Failed to load ingredient sources");
  }
  const json = (await response.json()) as { index: IngredientSourceIndex };
  return json.index;
}

export async function addRecipeToPlan(recipeId: string): Promise<void> {
  const response = await fetch("/api/cook-plan/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipeId }),
  });
  if (!response.ok) {
    await throwApiError(response, "Could not add recipe to plan");
  }
}
