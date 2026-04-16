import type { RecipeIngredient } from "@agent/shared";

export type AppLocale = "sv" | "en" | "vi";

export const RECIPE_LOCALES: AppLocale[] = ["sv", "en", "vi"];

export const RECIPE_LOCALE_STORAGE_KEY = "dadops-recipe-locale";

export type RecipeTranslationBundle = {
  title: string;
  summary: string;
  ingredients: RecipeIngredient[];
  steps: string[];
  updated_at?: string;
};

export type RecipeI18nColumn = {
  en?: RecipeTranslationBundle;
  vi?: RecipeTranslationBundle;
};

export type SavedRecipeWithI18n = {
  id: string;
  title: string;
  title_en: string;
  title_vi: string;
  summary: string;
  meal_kind: string;
  estimated_cook_time: string;
  vegetarian: boolean;
  ingredients: RecipeIngredient[];
  steps: string[];
  i18n?: RecipeI18nColumn | null;
  forked_from_id?: string | null;
  easy_to_follow?: boolean | null;
  enjoy_rating?: number | null;
};

export function isRecipeTranslationComplete(t: RecipeTranslationBundle | undefined | null): boolean {
  if (!t) {
    return false;
  }
  return (
    !!t.summary?.trim() &&
    Array.isArray(t.ingredients) &&
    t.ingredients.length > 0 &&
    Array.isArray(t.steps) &&
    t.steps.length > 0
  );
}

/** True when viewing EN/VI but cached AI body is missing or incomplete. */
export function recipeNeedsAiTranslation(recipe: SavedRecipeWithI18n, locale: AppLocale): boolean {
  if (locale === "sv") {
    return false;
  }
  const bucket = locale === "en" ? recipe.i18n?.en : recipe.i18n?.vi;
  return !isRecipeTranslationComplete(bucket);
}

/** Title + optional translations (enough for `getRecipeDisplayTitle`). */
export type RecipeTitleFields = {
  title: string;
  title_en: string;
  title_vi: string;
  i18n?: RecipeI18nColumn | null;
};

export function getRecipeDisplayTitle(recipe: RecipeTitleFields, locale: AppLocale): string {
  if (locale === "sv") {
    return recipe.title;
  }
  if (locale === "en") {
    return (
      recipe.title_en?.trim() ||
      recipe.i18n?.en?.title?.trim() ||
      recipe.title
    );
  }
  return recipe.title_vi?.trim() || recipe.i18n?.vi?.title?.trim() || recipe.title;
}

export type RecipeDisplayFields = {
  title: string;
  summary: string;
  ingredients: RecipeIngredient[];
  steps: string[];
  /** Using Swedish body while UI locale is EN/VI (needs translation). */
  showingSourceFallback: boolean;
};

export function getRecipeDisplayFields(
  recipe: SavedRecipeWithI18n,
  locale: AppLocale,
): RecipeDisplayFields {
  const title = getRecipeDisplayTitle(recipe, locale);
  if (locale === "sv") {
    return {
      title,
      summary: recipe.summary,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      showingSourceFallback: false,
    };
  }
  const bucket = locale === "en" ? recipe.i18n?.en : recipe.i18n?.vi;
  if (isRecipeTranslationComplete(bucket)) {
    return {
      title,
      summary: bucket!.summary,
      ingredients: bucket!.ingredients,
      steps: bucket!.steps,
      showingSourceFallback: false,
    };
  }
  return {
    title,
    summary: recipe.summary,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    showingSourceFallback: true,
  };
}

export function parseAppLocale(raw: string | null | undefined): AppLocale {
  if (raw === "en" || raw === "vi" || raw === "sv") {
    return raw;
  }
  return "sv";
}
