import type {
  RecipeGenerateResult,
  RecipeGeneratorMeal,
  VietnameseMealDraft,
} from "@agent/shared";
import type { SaveRecipeBody } from "@/lib/recipe-request";
import type {
  VietnameseMealRecipeLinkType,
  VietnameseMealRow,
} from "@/lib/vietnamese-meals";

export type VietnameseMealListResponse = {
  meals: VietnameseMealRow[];
};

export type VietnameseMealEnrichResponse = {
  drafts: VietnameseMealDraft[];
  meta: {
    input_count: number;
    output_count: number;
    recipe_model: string;
  };
};

export type VietnameseMealRecipeSuggestionResponse = {
  result: RecipeGenerateResult;
  meta: {
    food_type_id: "vietnamese";
    food_type_label_sv: string;
    vegetarian: boolean;
    ingredient_count: number;
    exclude_count: number;
    recipe_model: string;
    recipe_source_label: string;
    source_meal_ids: string[];
  };
};

export async function throwVietnameseMealApiError(
  response: Response,
  fallback: string,
): Promise<never> {
  const json = (await response.json().catch(() => ({}))) as { error?: string };
  throw new Error(json.error ?? fallback);
}

export async function fetchVietnameseMeals(params?: {
  status?: string;
  search?: string;
}): Promise<VietnameseMealRow[]> {
  const url = new URL("/api/vietnamese-meals", window.location.origin);
  if (params?.status && params.status !== "all") url.searchParams.set("status", params.status);
  if (params?.search?.trim()) url.searchParams.set("search", params.search.trim());
  const response = await fetch(`${url.pathname}${url.search}`, { cache: "no-store" });
  if (!response.ok) {
    await throwVietnameseMealApiError(response, "Failed to load Vietnamese meals");
  }
  const json = (await response.json()) as VietnameseMealListResponse;
  return json.meals ?? [];
}

export async function enrichVietnameseMeals(names: string[]): Promise<VietnameseMealEnrichResponse> {
  const response = await fetch("/api/vietnamese-meals/enrich", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ names }),
  });
  if (!response.ok) {
    await throwVietnameseMealApiError(response, "Vietnamese meal enrichment failed");
  }
  return response.json() as Promise<VietnameseMealEnrichResponse>;
}

export async function saveVietnameseMealDrafts(
  meals: VietnameseMealDraft[],
): Promise<VietnameseMealRow[]> {
  const response = await fetch("/api/vietnamese-meals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ meals }),
  });
  if (!response.ok) {
    await throwVietnameseMealApiError(response, "Could not save Vietnamese meals");
  }
  const json = (await response.json()) as VietnameseMealListResponse;
  return json.meals ?? [];
}

export async function updateVietnameseMeal(
  id: string,
  patch: Partial<VietnameseMealRow>,
): Promise<VietnameseMealRow> {
  const response = await fetch(`/api/vietnamese-meals/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) {
    await throwVietnameseMealApiError(response, "Could not update Vietnamese meal");
  }
  const json = (await response.json()) as { meal: VietnameseMealRow };
  return json.meal;
}

export async function deleteVietnameseMeal(id: string): Promise<void> {
  const response = await fetch(`/api/vietnamese-meals/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    await throwVietnameseMealApiError(response, "Could not delete Vietnamese meal");
  }
}

export async function generateVietnameseRecipeSuggestions(input: {
  mealIds: string[];
  excludeMealTitles: string[];
}): Promise<VietnameseMealRecipeSuggestionResponse> {
  const response = await fetch("/api/vietnamese-meals/recipe-suggestions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    await throwVietnameseMealApiError(response, "Could not generate Vietnamese recipe suggestions");
  }
  return response.json() as Promise<VietnameseMealRecipeSuggestionResponse>;
}

export async function saveRecipeFromVietnameseMeal(input: {
  meal: RecipeGeneratorMeal;
  sourceMealIds: string[];
  ingredientPicks: string[];
}): Promise<{ recipe: { id: string } }> {
  const steps =
    input.meal.steps.length > 0
      ? input.meal.steps
      : [
          "Tillagning saknas än — öppna Redigera recept och klistra in text från en källa du litar på.",
        ];
  const recipeBody: SaveRecipeBody = {
    title: input.meal.title,
    title_en: input.meal.title_en,
    title_vi: input.meal.title_vi,
    summary: input.meal.summary,
    meal_kind: input.meal.meal_kind,
    ingredients: input.meal.ingredients,
    steps,
    food_type_id: "vietnamese",
    vegetarian: false,
    ingredient_picks: input.ingredientPicks,
    estimated_cook_time: input.meal.estimated_cook_time,
    difficulty: input.meal.difficulty,
    source: "",
    source_markdown: null,
    similar_recipe_url: "",
  };

  const saveResponse = await fetch("/api/recipes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(recipeBody),
  });
  if (!saveResponse.ok) {
    await throwVietnameseMealApiError(saveResponse, "Could not save recipe");
  }
  const saved = (await saveResponse.json()) as { recipe: { id: string } };
  await Promise.all(
    input.sourceMealIds.map((mealId) =>
      linkVietnameseMealRecipe(mealId, saved.recipe.id, "inspired_by"),
    ),
  );
  return saved;
}

export async function linkVietnameseMealRecipe(
  mealId: string,
  recipeId: string,
  linkType: VietnameseMealRecipeLinkType,
): Promise<void> {
  const response = await fetch(`/api/vietnamese-meals/${encodeURIComponent(mealId)}/recipe-links`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipe_id: recipeId, link_type: linkType }),
  });
  if (!response.ok) {
    await throwVietnameseMealApiError(response, "Could not link recipe to Vietnamese meal");
  }
}
