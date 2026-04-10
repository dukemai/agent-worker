/** Desired size of saved recipe library per food style (e.g. family rotation). */
export const RECIPE_STYLE_TARGET_MIN = 30;
export const RECIPE_STYLE_TARGET_MAX = 40;

export function recipeStyleTargetRangeLabel(): string {
  return `${RECIPE_STYLE_TARGET_MIN}–${RECIPE_STYLE_TARGET_MAX}`;
}

export function countRecipesByFoodTypeId(
  recipes: { food_type_id: string }[],
): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of recipes) {
    m.set(r.food_type_id, (m.get(r.food_type_id) ?? 0) + 1);
  }
  return m;
}

export type RecipeStyleTargetStatus = "below" | "in-range" | "above";

export function recipeStyleTargetStatus(count: number): RecipeStyleTargetStatus {
  if (count < RECIPE_STYLE_TARGET_MIN) {
    return "below";
  }
  if (count > RECIPE_STYLE_TARGET_MAX) {
    return "above";
  }
  return "in-range";
}

/** Visual tiers for the library “progress per style” table (distinct row backgrounds). */
export type RecipeStyleProgressBand =
  | "zero"
  | "lt10"
  | "lt20"
  | "lt30"
  | "lt40"
  | "ge40";

export function recipeStyleProgressBand(count: number): RecipeStyleProgressBand {
  if (count === 0) {
    return "zero";
  }
  if (count < 10) {
    return "lt10";
  }
  if (count < 20) {
    return "lt20";
  }
  if (count < 30) {
    return "lt30";
  }
  if (count < 40) {
    return "lt40";
  }
  return "ge40";
}
