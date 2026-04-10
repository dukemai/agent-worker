import type { RecipeGeneratorMeal } from "@agent/shared";

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
  if (ingredient_picks.length === 0) {
    return { error: "ingredient_picks must include at least one item" };
  }
  const estimated_cook_time =
    typeof o.estimated_cook_time === "string"
      ? o.estimated_cook_time.trim().slice(0, 120)
      : "";
  const title_en =
    typeof o.title_en === "string" ? o.title_en.trim().slice(0, 200) : "";
  const title_vi =
    typeof o.title_vi === "string" ? o.title_vi.trim().slice(0, 200) : "";
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
  };
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

  return { patch };
}
