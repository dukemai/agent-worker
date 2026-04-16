export type PrepareIngredientLine = {
  lineKey: string;
  recipeId: string;
  recipeTitle: string;
  text: string;
  ingredient_label: string;
  amount: string;
};

export function linesFromRecipeIngredients(
  recipeId: string,
  recipeTitle: string,
  ingredients: unknown,
): PrepareIngredientLine[] {
  if (!Array.isArray(ingredients)) {
    return [];
  }
  const out: PrepareIngredientLine[] = [];
  let i = 0;
  for (const row of ingredients) {
    if (!row || typeof row !== "object") {
      continue;
    }
    const o = row as Record<string, unknown>;
    const text = typeof o.text === "string" ? o.text.trim() : "";
    const ingredient_label =
      typeof o.ingredient_label === "string" ? o.ingredient_label.trim() : "";
    const amount = typeof o.amount === "string" ? o.amount.trim() : "";
    if (!text || !ingredient_label || !amount) {
      continue;
    }
    out.push({
      lineKey: `${recipeId}:${i}`,
      recipeId,
      recipeTitle,
      text,
      ingredient_label,
      amount,
    });
    i += 1;
    if (i >= 200) {
      break;
    }
  }
  return out;
}
