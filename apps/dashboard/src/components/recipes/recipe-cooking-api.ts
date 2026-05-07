import { throwApiError } from "@/components/dashboard/recipe-generator-api";
import type { SavedRecipeRow } from "@/lib/saved-recipe-row";

export type RecipeCookPayload = {
  recipe: SavedRecipeRow;
  canEditRecipe: boolean;
};

export async function fetchRecipeForCooking(recipeId: string): Promise<RecipeCookPayload> {
  const response = await fetch(`/api/recipes/${encodeURIComponent(recipeId)}/cook`, {
    cache: "no-store",
  });
  if (!response.ok) {
    await throwApiError(response, "Failed to load recipe");
  }
  return response.json() as Promise<RecipeCookPayload>;
}

export async function markRecipeTested(recipeId: string): Promise<SavedRecipeRow> {
  const response = await fetch(`/api/recipes/${encodeURIComponent(recipeId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tested: true }),
  });
  if (!response.ok) {
    await throwApiError(response, "Could not mark recipe tested");
  }
  const json = (await response.json()) as { recipe: SavedRecipeRow };
  return json.recipe;
}
