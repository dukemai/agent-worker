import type { RecipeDifficulty, RecipeGeneratorMeal } from "@agent/shared";
import type { RecipeI18nColumn } from "@/lib/recipe-locale";

/** Row shape returned by `/api/recipes` and `/api/recipes/[id]`. */
export type SavedRecipeRow = {
  id: string;
  title: string;
  title_en: string;
  title_vi: string;
  summary: string;
  meal_kind: string;
  ingredients: RecipeGeneratorMeal["ingredients"];
  steps: string[];
  food_type_id: string;
  vegetarian: boolean;
  ingredient_picks: string[];
  tested: boolean;
  want_to_try: boolean;
  estimated_cook_time: string;
  difficulty: RecipeDifficulty;
  source: string;
  /** Raw markdown pasted from an external recipe when fulfilling a suggestion. */
  source_markdown?: string | null;
  similar_recipe_url: string;
  created_at: string;
  i18n?: RecipeI18nColumn | null;
  forked_from_id?: string | null;
  easy_to_follow?: boolean | null;
  enjoy_rating?: number | null;
};

export type RecipeEditDraft = {
  title: string;
  title_en: string;
  title_vi: string;
  summary: string;
  meal_kind: string;
  difficulty: RecipeDifficulty;
  ingredients: RecipeGeneratorMeal["ingredients"];
};

export function savedRowToEditDraft(r: SavedRecipeRow): RecipeEditDraft {
  return {
    title: r.title,
    title_en: r.title_en ?? "",
    title_vi: r.title_vi ?? "",
    summary: r.summary,
    meal_kind: r.meal_kind,
    difficulty: r.difficulty ?? "medium",
    ingredients: r.ingredients.map((x) => ({ ...x })),
  };
}
