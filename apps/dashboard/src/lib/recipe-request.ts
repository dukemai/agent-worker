import type { RecipeDifficulty, RecipeGeneratorMeal } from "@agent/shared";
import {
  RECIPE_GENERATOR_SOURCE_LABEL,
  RECIPE_SOURCE_MANUAL_MARKDOWN,
} from "@agent/shared";
import type { RecipeI18nColumn, RecipeTranslationBundle } from "@/lib/recipe-locale";
import { normalizeRecipeDifficulty } from "@/lib/recipe-difficulty";
import { parseSimilarRecipeUrl } from "@/lib/recipe-source";

export const MAX_INGREDIENT_PICKS = 15;
export const MAX_EXCLUDE_TITLES = 40;
export const MAX_EXCLUDE_TITLE_LEN = 120;

export function normalizeIngredientTexts(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x !== "string") {
      continue;
    }
    const t = x.replace(/\s+/g, " ").trim();
    if (!t) {
      continue;
    }
    out.push(t);
    if (out.length >= MAX_INGREDIENT_PICKS) {
      break;
    }
  }
  return out;
}

export function normalizeExcludeMealTitles(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of raw) {
    if (typeof x !== "string") {
      continue;
    }
    const t = x.replace(/\s+/g, " ").trim().slice(0, MAX_EXCLUDE_TITLE_LEN);
    if (!t) {
      continue;
    }
    const k = t.toLocaleLowerCase("sv-SE");
    if (seen.has(k)) {
      continue;
    }
    seen.add(k);
    out.push(t);
    if (out.length >= MAX_EXCLUDE_TITLES) {
      break;
    }
  }
  return out;
}

export type SaveRecipeBody = {
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
  estimated_cook_time: string;
  difficulty: RecipeDifficulty;
  /** Set when the user pasted markdown from an external source. */
  source: string;
  source_markdown: string | null;
  /** http(s) link to the page the recipe was taken from (optional). */
  similar_recipe_url: string;
  i18n?: RecipeI18nColumn | null;
};

function isRecipeIngredientRow(
  v: unknown,
): v is { text: string; ingredient_label: string; amount: string } {
  if (!v || typeof v !== "object") {
    return false;
  }
  const o = v as Record<string, unknown>;
  return (
    typeof o.text === "string" &&
    typeof o.ingredient_label === "string" &&
    typeof o.amount === "string" &&
    o.text.trim().length > 0 &&
    o.ingredient_label.trim().length > 0 &&
    o.amount.trim().length > 0
  );
}

export function parseSaveRecipeBody(body: unknown): SaveRecipeBody | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Expected JSON body" };
  }
  const o = body as Record<string, unknown>;
  const title = typeof o.title === "string" ? o.title.trim() : "";
  const summary = typeof o.summary === "string" ? o.summary.trim() : "";
  const meal_kind = typeof o.meal_kind === "string" ? o.meal_kind.trim() : "other";
  const food_type_id = typeof o.food_type_id === "string" ? o.food_type_id.trim() : "";
  const vegetarian = o.vegetarian === true;
  if (!title || title.length > 200) {
    return { error: "title is required" };
  }
  if (summary.length > 2000) {
    return { error: "summary too long" };
  }
  if (!food_type_id) {
    return { error: "food_type_id is required" };
  }
  const ingredientsParsed = parseIngredientsArray(o.ingredients);
  if ("error" in ingredientsParsed) {
    return ingredientsParsed;
  }
  const ingredients = ingredientsParsed;

  const stepsParsed = parseStepsArray(o.steps);
  if ("error" in stepsParsed) {
    return stepsParsed;
  }
  const steps = stepsParsed;
  const ingredient_picks = normalizeIngredientTexts(o.ingredient_picks);
  const estimated_cook_time =
    typeof o.estimated_cook_time === "string"
      ? o.estimated_cook_time.trim().slice(0, 120)
      : "";
  const difficulty = normalizeRecipeDifficulty(o.difficulty);
  const title_en =
    typeof o.title_en === "string" ? o.title_en.trim().slice(0, 200) : "";
  const title_vi =
    typeof o.title_vi === "string" ? o.title_vi.trim().slice(0, 200) : "";

  const source_markdown_raw =
    typeof o.source_markdown === "string" ? o.source_markdown.trim() : "";
  const source_markdown =
    source_markdown_raw.length > 200_000
      ? source_markdown_raw.slice(0, 200_000)
      : source_markdown_raw;

  const source =
    source_markdown.length > 0 ? RECIPE_SOURCE_MANUAL_MARKDOWN : RECIPE_GENERATOR_SOURCE_LABEL;

  const urlRaw = typeof o.similar_recipe_url === "string" ? o.similar_recipe_url : "";
  const similarParsed = parseSimilarRecipeUrl(urlRaw);
  if (typeof similarParsed === "object" && "error" in similarParsed) {
    return similarParsed;
  }

  return {
    title,
    title_en,
    title_vi,
    summary,
    meal_kind,
    ingredients,
    steps,
    food_type_id,
    vegetarian,
    ingredient_picks,
    estimated_cook_time,
    difficulty,
    source,
    source_markdown: source_markdown.length > 0 ? source_markdown : null,
    similar_recipe_url: similarParsed,
    i18n: parseI18nColumn(o.i18n),
  };
}

function isRecipeTranslationBundle(value: unknown): value is RecipeTranslationBundle {
  if (!value || typeof value !== "object") {
    return false;
  }
  const o = value as Record<string, unknown>;
  return (
    typeof o.title === "string" &&
    o.title.trim().length > 0 &&
    typeof o.summary === "string" &&
    o.summary.trim().length > 0 &&
    Array.isArray(o.ingredients) &&
    o.ingredients.length > 0 &&
    o.ingredients.every(isRecipeIngredientRow) &&
    Array.isArray(o.steps) &&
    o.steps.some((s) => typeof s === "string" && s.trim().length > 0)
  );
}

function cleanTranslationBundle(value: RecipeTranslationBundle): RecipeTranslationBundle {
  return {
    title: value.title.trim().slice(0, 200),
    summary: value.summary.trim().slice(0, 2000),
    ingredients: value.ingredients.map((row) => ({
      text: row.text.trim(),
      ingredient_label: row.ingredient_label.trim(),
      amount: row.amount.trim(),
    })),
    steps: value.steps
      .filter((s): s is string => typeof s === "string")
      .map((s) => s.trim())
      .filter(Boolean),
    updated_at:
      typeof value.updated_at === "string" && value.updated_at.trim()
        ? value.updated_at.trim()
        : new Date().toISOString(),
  };
}

function parseI18nColumn(raw: unknown): RecipeI18nColumn | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const out: RecipeI18nColumn = {};
  if (isRecipeTranslationBundle(o.en)) {
    out.en = cleanTranslationBundle(o.en);
  }
  if (isRecipeTranslationBundle(o.vi)) {
    out.vi = cleanTranslationBundle(o.vi);
  }
  return out.en || out.vi ? out : null;
}

function parseIngredientsArray(
  ingredientsRaw: unknown,
): RecipeGeneratorMeal["ingredients"] | { error: string } {
  if (!Array.isArray(ingredientsRaw) || ingredientsRaw.length === 0) {
    return { error: "ingredients must be a non-empty array" };
  }
  const ingredients: RecipeGeneratorMeal["ingredients"] = [];
  for (const row of ingredientsRaw) {
    if (!isRecipeIngredientRow(row)) {
      return { error: "Invalid ingredients row" };
    }
    ingredients.push({
      text: row.text.trim(),
      ingredient_label: row.ingredient_label.trim(),
      amount: row.amount.trim(),
    });
  }
  return ingredients;
}

function parseStepsArray(stepsRaw: unknown): string[] | { error: string } {
  if (!Array.isArray(stepsRaw) || stepsRaw.length === 0) {
    return { error: "steps must be a non-empty array" };
  }
  const steps = stepsRaw
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.trim())
    .filter(Boolean);
  if (steps.length === 0) {
    return { error: "steps must contain at least one step" };
  }
  return steps;
}

/**
 * Partial recipe fields for PATCH. Only keys present on `o` are validated and returned.
 */
export function parseRecipePartialUpdate(
  o: Record<string, unknown>,
): { patch: Record<string, unknown> } | { error: string } {
  const patch: Record<string, unknown> = {};

  if (Object.prototype.hasOwnProperty.call(o, "title")) {
    const title = typeof o.title === "string" ? o.title.trim() : "";
    if (!title || title.length > 200) {
      return { error: "title must be 1–200 characters" };
    }
    patch.title = title;
  }
  if (Object.prototype.hasOwnProperty.call(o, "title_en")) {
    patch.title_en = typeof o.title_en === "string" ? o.title_en.trim().slice(0, 200) : "";
  }
  if (Object.prototype.hasOwnProperty.call(o, "title_vi")) {
    patch.title_vi = typeof o.title_vi === "string" ? o.title_vi.trim().slice(0, 200) : "";
  }
  if (Object.prototype.hasOwnProperty.call(o, "summary")) {
    const summary = typeof o.summary === "string" ? o.summary.trim() : "";
    if (summary.length > 2000) {
      return { error: "summary too long" };
    }
    patch.summary = summary;
  }
  if (Object.prototype.hasOwnProperty.call(o, "meal_kind")) {
    const meal_kind = typeof o.meal_kind === "string" ? o.meal_kind.trim() : "";
    if (!meal_kind) {
      return { error: "meal_kind invalid" };
    }
    patch.meal_kind = meal_kind;
  }
  if (Object.prototype.hasOwnProperty.call(o, "food_type_id")) {
    const food_type_id = typeof o.food_type_id === "string" ? o.food_type_id.trim() : "";
    if (!food_type_id) {
      return { error: "food_type_id is required" };
    }
    patch.food_type_id = food_type_id;
  }
  if (Object.prototype.hasOwnProperty.call(o, "ingredients")) {
    const ing = parseIngredientsArray(o.ingredients);
    if ("error" in ing) {
      return ing;
    }
    patch.ingredients = ing;
  }
  if (Object.prototype.hasOwnProperty.call(o, "steps")) {
    const st = parseStepsArray(o.steps);
    if ("error" in st) {
      return st;
    }
    patch.steps = st;
  }
  if (Object.prototype.hasOwnProperty.call(o, "source_markdown")) {
    const v = o.source_markdown;
    if (v === null) {
      patch.source_markdown = null;
    } else if (typeof v === "string") {
      const t = v.trim();
      patch.source_markdown = t.length > 200_000 ? t.slice(0, 200_000) : t || null;
    } else {
      return { error: "source_markdown must be a string or null" };
    }
  }
  if (Object.prototype.hasOwnProperty.call(o, "source")) {
    const s = typeof o.source === "string" ? o.source.trim() : "";
    if (s !== RECIPE_SOURCE_MANUAL_MARKDOWN && s !== RECIPE_GENERATOR_SOURCE_LABEL) {
      return { error: "source must be a supported recipe source value" };
    }
    patch.source = s;
  }
  if (Object.prototype.hasOwnProperty.call(o, "i18n")) {
    patch.i18n = parseI18nColumn(o.i18n) ?? {};
  }
  if (Object.prototype.hasOwnProperty.call(o, "difficulty")) {
    patch.difficulty = normalizeRecipeDifficulty(o.difficulty);
  }

  return { patch };
}

/** Optional feedback fields for PATCH. Use `null` to clear. */
export function parseFeedbackPatch(
  o: Record<string, unknown>,
): { patch: Record<string, unknown> } | { error: string } {
  const patch: Record<string, unknown> = {};

  if (Object.prototype.hasOwnProperty.call(o, "easy_to_follow")) {
    const v = o.easy_to_follow;
    if (v === null) {
      patch.easy_to_follow = null;
    } else if (typeof v === "boolean") {
      patch.easy_to_follow = v;
    } else {
      return { error: "easy_to_follow must be boolean or null" };
    }
  }

  if (Object.prototype.hasOwnProperty.call(o, "enjoy_rating")) {
    const v = o.enjoy_rating;
    if (v === null) {
      patch.enjoy_rating = null;
    } else if (typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5) {
      patch.enjoy_rating = v;
    } else {
      return { error: "enjoy_rating must be an integer 1–5 or null" };
    }
  }

  return { patch };
}
