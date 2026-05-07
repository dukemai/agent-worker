import type { RecipeGenerateResult } from "@agent/shared";
import { parsePromoPickerCatalogJson } from "@/lib/promo-picker-catalog-validate";
import type {
  CreateRecipeImportQueueBody,
  RecipeImportQueueRow,
} from "@/lib/recipe-import-queue";
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

export type RecipeImportQueueRunResponse = {
  success: boolean;
  processed: number;
  completed: number;
  failed: number;
  skipped: number;
  items: {
    id: string;
    status: "completed" | "failed" | "skipped";
    recipe_id?: string;
    error?: string;
  }[];
  error?: string;
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

export async function fetchRecipeImportQueue(): Promise<RecipeImportQueueRow[]> {
  const response = await fetch("/api/recipes/import-queue", { cache: "no-store" });
  if (!response.ok) {
    await throwApiError(response, "Failed to load import queue");
  }
  const json = (await response.json()) as { items: RecipeImportQueueRow[] };
  return json.items ?? [];
}

export async function createRecipeImportQueueItem(
  body: CreateRecipeImportQueueBody,
): Promise<RecipeImportQueueRow> {
  const response = await fetch("/api/recipes/import-queue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    await throwApiError(response, "Failed to add import queue item");
  }
  const json = (await response.json()) as { item: RecipeImportQueueRow };
  return json.item;
}

export async function deleteRecipeImportQueueItem(id: string): Promise<void> {
  const response = await fetch(`/api/recipes/import-queue/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    await throwApiError(response, "Failed to delete import queue item");
  }
}

export async function runRecipeImportQueueNow(
  queueItemId?: string,
): Promise<RecipeImportQueueRunResponse> {
  const response = await fetch("/api/recipes/import-queue/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(queueItemId ? { queueItemId } : {}),
  });
  if (!response.ok) {
    await throwApiError(response, "Failed to run import queue");
  }
  return response.json() as Promise<RecipeImportQueueRunResponse>;
}

export async function throwApiError(response: Response, fallback: string): Promise<never> {
  const json = (await response.json().catch(() => ({}))) as { error?: string };
  throw new Error(json.error ?? fallback);
}
