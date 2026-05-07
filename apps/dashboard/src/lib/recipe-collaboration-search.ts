import type { SupabaseClient, User } from "@supabase/supabase-js";
import { ensureUserHousehold } from "@/lib/household";
import { ingredientSourceTerms, type IngredientSourceOption } from "@/lib/ingredient-source-index";
import type { SavedRecipeRow } from "@/lib/saved-recipe-row";
import { SAVED_RECIPE_COLUMNS } from "@/lib/saved-recipe-columns";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type RecipeAccessRow = {
  id: string;
  user_id: string;
  household_id: string | null;
};

function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase("sv-SE");
}

function ingredientText(recipe: SavedRecipeRow): string {
  return [
    ...recipe.ingredient_picks,
    ...recipe.ingredients.flatMap((row) => [
      row.ingredient_label,
      row.amount,
      row.text,
    ]),
  ].join(" ");
}

export function recipeMatchesCollaborationSearch(
  recipe: SavedRecipeRow,
  input: {
    q: string;
    ingredient: string;
    ingredientSources?: IngredientSourceOption[];
    styleId: string;
    foodTypeLabel?: string;
  },
): boolean {
  if (input.styleId && recipe.food_type_id !== input.styleId) {
    return false;
  }

  const q = normalizeSearch(input.q);
  if (q) {
    const tokens = q.split(/\s+/).filter(Boolean);
    const haystack = normalizeSearch(
      [
        recipe.title,
        recipe.title_en,
        recipe.title_vi,
        recipe.summary,
        recipe.i18n?.en?.title ?? "",
        recipe.i18n?.en?.summary ?? "",
        recipe.i18n?.vi?.title ?? "",
        recipe.i18n?.vi?.summary ?? "",
        recipe.meal_kind,
        recipe.food_type_id,
        input.foodTypeLabel ?? "",
      ].join(" "),
    );
    if (!tokens.every((token) => haystack.includes(token))) {
      return false;
    }
  }

  const ingredient = normalizeSearch(input.ingredient);
  if (input.ingredientSources?.length) {
    const haystack = normalizeSearch(ingredientText(recipe));
    return input.ingredientSources.every((source) =>
      ingredientSourceTerms(source).some((term) => haystack.includes(normalizeSearch(term))),
    );
  }

  if (ingredient) {
    const tokens = ingredient.split(/\s+/).filter(Boolean);
    const haystack = normalizeSearch(ingredientText(recipe));
    if (!tokens.every((token) => haystack.includes(token))) {
      return false;
    }
  }

  return true;
}

export async function fetchHouseholdVisibleRecipes(
  supabase: SupabaseClient,
  user: User,
): Promise<{ recipes: SavedRecipeRow[]; error: Error | null }> {
  const householdResult = await ensureUserHousehold(supabase, user);
  if (householdResult.error) {
    return { recipes: [], error: householdResult.error };
  }

  const serviceSupabase = createServiceRoleClient();
  if (!serviceSupabase) {
    const { data, error } = await supabase
      .from("saved_recipes")
      .select(SAVED_RECIPE_COLUMNS)
      .eq("household_id", householdResult.household.id)
      .order("created_at", { ascending: false });

    return {
      recipes: (data ?? []) as SavedRecipeRow[],
      error: error ? new Error(error.message) : null,
    };
  }

  const { data: members, error: membersError } = await serviceSupabase
    .from("household_members")
    .select("user_id")
    .eq("household_id", householdResult.household.id);

  if (membersError) {
    return { recipes: [], error: new Error(membersError.message) };
  }

  const memberIds = (members ?? [])
    .map((member) => (typeof member.user_id === "string" ? member.user_id : ""))
    .filter(Boolean);

  const { data: accessRows, error: accessError } = await serviceSupabase
    .from("saved_recipes")
    .select("id, user_id, household_id");

  if (accessError) {
    return { recipes: [], error: new Error(accessError.message) };
  }

  const allowedIds = ((accessRows ?? []) as RecipeAccessRow[])
    .filter(
      (row) =>
        row.household_id === householdResult.household.id || memberIds.includes(row.user_id),
    )
    .map((row) => row.id);

  if (allowedIds.length === 0) {
    return { recipes: [], error: null };
  }

  const { data, error } = await serviceSupabase
    .from("saved_recipes")
    .select(SAVED_RECIPE_COLUMNS)
    .in("id", allowedIds)
    .order("created_at", { ascending: false });

  return {
    recipes: (data ?? []) as SavedRecipeRow[],
    error: error ? new Error(error.message) : null,
  };
}

export async function canUserAccessRecipe(
  supabase: SupabaseClient,
  user: User,
  recipeId: string,
): Promise<{ canAccess: boolean; error: Error | null }> {
  const householdResult = await ensureUserHousehold(supabase, user);
  if (householdResult.error) {
    return { canAccess: false, error: householdResult.error };
  }

  const serviceSupabase = createServiceRoleClient();
  if (!serviceSupabase) {
    const { data, error } = await supabase
      .from("saved_recipes")
      .select("id")
      .eq("id", recipeId)
      .maybeSingle();

    return {
      canAccess: Boolean(data),
      error: error ? new Error(error.message) : null,
    };
  }

  const { data: recipe, error: recipeError } = await serviceSupabase
    .from("saved_recipes")
    .select("id, user_id, household_id")
    .eq("id", recipeId)
    .maybeSingle();

  if (recipeError) {
    return { canAccess: false, error: new Error(recipeError.message) };
  }
  if (!recipe) {
    return { canAccess: false, error: null };
  }

  const access = recipe as RecipeAccessRow;
  if (access.user_id === user.id || access.household_id === householdResult.household.id) {
    return { canAccess: true, error: null };
  }

  const { data: member, error: memberError } = await serviceSupabase
    .from("household_members")
    .select("id")
    .eq("household_id", householdResult.household.id)
    .eq("user_id", access.user_id)
    .maybeSingle();

  return {
    canAccess: Boolean(member),
    error: memberError ? new Error(memberError.message) : null,
  };
}
