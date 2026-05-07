import type { SavedRecipeRow } from "@/lib/saved-recipe-row";

export type RecipeShareScopeType = "recipe" | "food_style";

export type RecipeShareLink = {
  id: string;
  public_slug: string;
  scope_type: RecipeShareScopeType;
  recipe_id: string | null;
  food_type_id: string | null;
  title: string;
  disabled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PublicRecipeShare = {
  id: string;
  slug: string;
  scope_type: RecipeShareScopeType;
  recipe_id: string | null;
  food_type_id: string | null;
  title: string;
  created_at: string;
};

export type PublicRecipeSharePayload = {
  share: PublicRecipeShare;
  recipes: SavedRecipeRow[];
};
