import type { SavedRecipeRow } from "@/lib/saved-recipe-row";
import type { RecipeShareLink, RecipeShareScopeType } from "@/lib/recipe-shares/types";

export type RecipeSharesResponse = {
  links: RecipeShareLink[];
  recipes: SavedRecipeRow[];
};

export async function throwRecipeShareApiError(response: Response, fallback: string): Promise<never> {
  const json = (await response.json().catch(() => ({}))) as { error?: string };
  throw new Error(json.error ?? fallback);
}

export async function fetchRecipeShares(): Promise<RecipeSharesResponse> {
  const response = await fetch("/api/recipe-shares", { cache: "no-store" });
  if (!response.ok) {
    await throwRecipeShareApiError(response, "Failed to load recipe shares");
  }
  return response.json() as Promise<RecipeSharesResponse>;
}

export async function createRecipeShare(input: {
  scopeType: RecipeShareScopeType;
  recipeId?: string;
  foodTypeId?: string;
  title?: string;
}): Promise<{ link: RecipeShareLink; reused: boolean }> {
  const response = await fetch("/api/recipe-shares", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    await throwRecipeShareApiError(response, "Could not create recipe share");
  }
  return response.json() as Promise<{ link: RecipeShareLink; reused: boolean }>;
}

export async function disableRecipeShare(id: string): Promise<void> {
  const response = await fetch(`/api/recipe-shares/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    await throwRecipeShareApiError(response, "Could not disable recipe share");
  }
}
