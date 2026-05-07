export type FoodStyleIngredientMapping = {
  priority: number;
  style_id: string;
  watchlist_text: string;
};

export function findMappingsByFoodStyle<T extends FoodStyleIngredientMapping>(
  mappings: readonly T[] | null | undefined,
  foodStyleId: string,
): T[] {
  if (!foodStyleId) {
    return [];
  }
  return (mappings ?? [])
    .filter((mapping) => mapping.style_id === foodStyleId)
    .slice()
    .sort((a, b) =>
      a.priority === b.priority
        ? a.watchlist_text.localeCompare(b.watchlist_text, "sv")
        : a.priority - b.priority,
    );
}
