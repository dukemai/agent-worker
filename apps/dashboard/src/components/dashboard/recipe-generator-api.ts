import type { RecipeGenerateResult } from "@agent/shared";
import { parsePromoPickerCatalogJson } from "@/lib/promo-picker-catalog-validate";
import type { SavedRecipeRow } from "@/lib/saved-recipe-row";
import type { PromoPickerCatalog } from "@/types/promo-picker-catalog";

export type FoodTypesJson = {
  options: { id: string; label: string }[];
};

export type GenerateResponse = {
  result: RecipeGenerateResult;
  meta: {
    food_type_id: string;
    food_type_label_sv: string;
    vegetarian: boolean;
    ingredient_count: number;
    exclude_count: number;
    recipe_model: string;
    recipe_source_label: string;
  };
};

export async function fetchPickerCatalog(): Promise<PromoPickerCatalog> {
  const response = await fetch("/data/ica-maxi-promo-picker-catalog.json", {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Failed to load picker catalog");
  }
  const raw: unknown = await response.json();
  return parsePromoPickerCatalogJson(raw);
}

export async function fetchFoodTypes(): Promise<FoodTypesJson> {
  const response = await fetch("/data/recipe-food-types.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load food types");
  }
  return response.json() as Promise<FoodTypesJson>;
}

export async function fetchSavedRecipes(): Promise<SavedRecipeRow[]> {
  const response = await fetch("/api/recipes", { cache: "no-store" });
  if (!response.ok) {
    const json = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(json.error ?? "Failed to load recipes");
  }
  const json = (await response.json()) as { recipes: SavedRecipeRow[] };
  return json.recipes ?? [];
}

export async function throwApiError(response: Response, fallback: string): Promise<never> {
  const json = (await response.json().catch(() => ({}))) as { error?: string };
  throw new Error(json.error ?? fallback);
}
