"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  ChefHat,
  Eye,
  Loader2,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  X,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { LocaleSwitcher } from "@/components/dashboard/locale-switcher";
import { useRecipeLocale } from "@/components/dashboard/recipe-locale-provider";
import { RecipeStepsDisplay } from "@/components/dashboard/recipe-steps-display";
import type { FoodStyleFavoriteSuggestionRow } from "@/app/api/promo-food-style-suggestions/route";
import {
  type FoodTypesJson,
  fetchFoodTypes,
} from "@/components/dashboard/recipe-generator-api";
import {
  addRecipeToPlan,
  fetchFamilyRecipeSearch,
  fetchIngredientSourceIndex,
} from "@/components/dashboard/family-recipes-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatRecipeDifficulty } from "@/lib/recipe-difficulty";
import {
  ingredientSourceMatchesQuery,
  type IngredientSourceOption,
} from "@/lib/ingredient-source-index";
import { findMappingsByFoodStyle } from "@/lib/food-style-ingredient-mappings";
import {
  getRecipeDisplayFields,
  type AppLocale,
  type SavedRecipeWithI18n,
} from "@/lib/recipe-locale";
import type { SavedRecipeRow } from "@/lib/saved-recipe-row";

const ALL_STYLES = "__all__";

type FoodStyleSuggestionsResponse = {
  suggestions: FoodStyleFavoriteSuggestionRow[];
};

const INGREDIENT_LANGUAGE_LABEL: Record<AppLocale, string> = {
  sv: "Swedish",
  en: "English",
  vi: "Vietnamese",
};

function ingredientDisplayLabel(ingredient: IngredientSourceOption, locale: AppLocale): string {
  return ingredient.labels[locale]?.trim() || ingredient.labels.sv;
}

async function fetchFoodStyleSuggestions(): Promise<FoodStyleSuggestionsResponse> {
  const response = await fetch("/api/promo-food-style-suggestions", { cache: "no-store" });
  if (!response.ok) {
    const json = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(json.error ?? "Failed to load food style ingredients");
  }
  return response.json() as Promise<FoodStyleSuggestionsResponse>;
}

export function FamilyRecipeSearchPage({ compact = false }: { compact?: boolean }) {
  const queryClient = useQueryClient();
  const { locale } = useRecipeLocale();
  const [nameQuery, setNameQuery] = useState("");
  const [ingredientAutocomplete, setIngredientAutocomplete] = useState("");
  const [ingredientPickerOpen, setIngredientPickerOpen] = useState(false);
  const [ingredientPickerStyleId, setIngredientPickerStyleId] = useState(ALL_STYLES);
  const [selectedIngredientIds, setSelectedIngredientIds] = useState<string[]>([]);
  const [styleId, setStyleId] = useState(ALL_STYLES);
  const [detailRecipe, setDetailRecipe] = useState<SavedRecipeRow | null>(null);
  const [submittedSearch, setSubmittedSearch] = useState({
    q: "",
    ingredientIds: [] as string[],
    styleId: ALL_STYLES,
  });
  const [addingRecipeId, setAddingRecipeId] = useState<string | null>(null);

  const foodTypesQuery = useQuery<FoodTypesJson>({
    queryKey: ["recipe-food-types"],
    queryFn: fetchFoodTypes,
  });
  const ingredientSourcesQuery = useQuery({
    queryKey: ["recipe-ingredient-sources"],
    queryFn: fetchIngredientSourceIndex,
  });
  const foodStyleSuggestionsQuery = useQuery({
    queryKey: ["promo-food-style-suggestions"],
    queryFn: fetchFoodStyleSuggestions,
  });

  const searchQuery = useQuery({
    queryKey: [
      "recipe-collaboration-search",
      submittedSearch.q,
      submittedSearch.ingredientIds.join("|"),
      submittedSearch.styleId,
    ],
    queryFn: () => fetchFamilyRecipeSearch({ ...submittedSearch, allStylesValue: ALL_STYLES }),
  });

  const addToPlanMutation = useMutation({
    mutationFn: addRecipeToPlan,
    onMutate: (recipeId) => {
      setAddingRecipeId(recipeId);
    },
    onSettled: () => {
      setAddingRecipeId(null);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["cook-plan"] });
    },
  });

  const labelByFoodTypeId = useMemo(() => {
    const labels = new Map<string, string>();
    for (const option of foodTypesQuery.data?.options ?? []) {
      labels.set(option.id, option.label);
    }
    return labels;
  }, [foodTypesQuery.data?.options]);

  const detailRecipeDisplay = useMemo(
    () =>
      detailRecipe
        ? getRecipeDisplayFields(detailRecipe as SavedRecipeWithI18n, locale)
        : null,
    [detailRecipe, locale],
  );

  const selectedIngredientSet = useMemo(
    () => new Set(selectedIngredientIds),
    [selectedIngredientIds],
  );

  const selectedIngredients = useMemo(() => {
    const byId = new Map(
      (ingredientSourcesQuery.data?.options ?? []).map((option) => [option.id, option]),
    );
    return selectedIngredientIds
      .map((id) => byId.get(id))
      .filter((option): option is IngredientSourceOption => Boolean(option));
  }, [ingredientSourcesQuery.data?.options, selectedIngredientIds]);

  const mappings = useMemo(() => {
    if (ingredientPickerStyleId === ALL_STYLES) {
      return [];
    }
    return findMappingsByFoodStyle(
      foodStyleSuggestionsQuery.data?.suggestions,
      ingredientPickerStyleId,
    );
  }, [foodStyleSuggestionsQuery.data?.suggestions, ingredientPickerStyleId]);

  const ingredientSuggestions = useMemo(() => {
    const options = ingredientSourcesQuery.data?.options ?? [];
    if (ingredientPickerStyleId !== ALL_STYLES) {
      const added = new Set<string>();
      const matched: IngredientSourceOption[] = [];
      for (const mapping of mappings) {
        const mappingText = mapping.watchlist_text.trim();
        if (!mappingText) {
          continue;
        }
        for (const option of options) {
          if (
            selectedIngredientSet.has(option.id) ||
            added.has(option.id) ||
            !ingredientSourceMatchesQuery(option, mappingText) ||
            !ingredientSourceMatchesQuery(option, ingredientAutocomplete)
          ) {
            continue;
          }
          added.add(option.id);
          matched.push(option);
        }
      }
      return matched;
    }
    const matches = options.filter(
      (option) =>
        !selectedIngredientSet.has(option.id) &&
        ingredientSourceMatchesQuery(option, ingredientAutocomplete),
    );
    const limit = ingredientAutocomplete.trim() ? 12 : 8;
    return matches.slice(0, limit);
  }, [
    ingredientAutocomplete,
    ingredientPickerStyleId,
    ingredientSourcesQuery.data?.options,
    mappings,
    selectedIngredientSet,
  ]);

  const error =
    searchQuery.error instanceof Error
      ? searchQuery.error.message
      : addToPlanMutation.error instanceof Error
        ? addToPlanMutation.error.message
        : ingredientSourcesQuery.error instanceof Error
          ? ingredientSourcesQuery.error.message
          : foodStyleSuggestionsQuery.error instanceof Error
            ? foodStyleSuggestionsQuery.error.message
            : foodTypesQuery.error instanceof Error
              ? foodTypesQuery.error.message
              : null;

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedSearch({
      q: nameQuery.trim(),
      ingredientIds: selectedIngredientIds,
      styleId,
    });
  }

  function removeIngredient(id: string) {
    setSelectedIngredientIds((current) => current.filter((item) => item !== id));
  }

  function toggleIngredient(option: IngredientSourceOption) {
    setSelectedIngredientIds((current) =>
      current.includes(option.id)
        ? current.filter((item) => item !== option.id)
        : [...current, option.id],
    );
  }

  const recipes = searchQuery.data?.recipes ?? [];

  return (
    <main
      className={
        compact
          ? "mx-auto w-full max-w-3xl space-y-4 py-2"
          : "mx-auto w-full max-w-3xl space-y-4 px-4 py-6"
      }
    >
      {!compact ? (
        <Button asChild variant="ghost" className="gap-2">
          <Link href="/family/recipes">
            <ArrowLeft className="size-4" aria-hidden />
            Family recipes
          </Link>
        </Button>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Recipe search</CardTitle>
              <CardDescription className="mt-1.5">
                Search shared household recipes by name, ingredients, and food style.
              </CardDescription>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Language</span>
              <LocaleSwitcher compact />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-[1fr_1.3fr_16rem_auto]" onSubmit={submitSearch}>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="recipe-name">
                Name
              </label>
              <Input
                id="recipe-name"
                value={nameQuery}
                onChange={(event) => setNameQuery(event.target.value)}
                placeholder="Pad thai, soup, chicken..."
              />
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground" id="ingredient-source">
                Ingredients
              </span>
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => {
                    if (
                      ingredientPickerStyleId === ALL_STYLES &&
                      styleId !== ALL_STYLES
                    ) {
                      setIngredientPickerStyleId(styleId);
                    }
                    setIngredientPickerOpen(true);
                  }}
                  disabled={ingredientSourcesQuery.isLoading}
                  aria-labelledby="ingredient-source"
                >
                  <SlidersHorizontal className="size-4" aria-hidden />
                  {selectedIngredients.length === 0
                    ? "Choose ingredients"
                    : `${selectedIngredients.length} selected`}
                </Button>
                {selectedIngredients.length > 0 ? (
                  <ul className="flex flex-wrap gap-1.5">
                    {selectedIngredients.map((ingredient) => (
                      <li key={ingredient.id}>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-auto max-w-full gap-1.5 whitespace-normal text-left"
                          onClick={() => removeIngredient(ingredient.id)}
                        >
                          {ingredientDisplayLabel(ingredient, locale)}
                          <X className="size-3" aria-hidden />
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground" id="recipe-style">
                Food style
              </span>
              <Select value={styleId} onValueChange={setStyleId}>
                <SelectTrigger aria-labelledby="recipe-style">
                  <SelectValue placeholder="All styles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_STYLES}>All styles</SelectItem>
                  {(foodTypesQuery.data?.options ?? []).map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="gap-2 self-end" disabled={searchQuery.isFetching}>
              <Search className="size-4" aria-hidden />
              {searchQuery.isFetching ? "Searching..." : "Search"}
            </Button>
          </form>
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </CardContent>
      </Card>

      <Dialog open={ingredientPickerOpen} onOpenChange={setIngredientPickerOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select ingredients</DialogTitle>
            <DialogDescription>
              Pick one or more ICA ingredient sources to filter recipe search.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground" id="ingredient-picker-style">
                Food style
              </span>
              <Select
                value={ingredientPickerStyleId}
                onValueChange={(value) => {
                  setIngredientPickerStyleId(value);
                  setIngredientAutocomplete("");
                }}
              >
                <SelectTrigger aria-labelledby="ingredient-picker-style">
                  <SelectValue placeholder="All food styles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_STYLES}>All food styles</SelectItem>
                  {(foodTypesQuery.data?.options ?? []).map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {foodStyleSuggestionsQuery.isLoading ? (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  Loading food-style mappings...
                </p>
              ) : ingredientPickerStyleId !== ALL_STYLES &&
              mappings.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No mapped ingredients for this food style yet.
                </p>
              ) : null}
            </div>

            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={ingredientAutocomplete}
                onChange={(event) => setIngredientAutocomplete(event.target.value)}
                placeholder="Search ICA ingredient source..."
                className="pl-9"
                disabled={ingredientSourcesQuery.isLoading}
                autoFocus
              />
            </div>

            {selectedIngredients.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-muted-foreground">Selected</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedIngredientIds([])}
                  >
                    Clear
                  </Button>
                </div>
                <ul className="flex flex-wrap gap-1.5">
                  {selectedIngredients.map((ingredient) => (
                    <li key={ingredient.id}>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-auto max-w-full gap-1.5 whitespace-normal text-left"
                        onClick={() => removeIngredient(ingredient.id)}
                      >
                        {ingredientDisplayLabel(ingredient, locale)}
                        <X className="size-3" aria-hidden />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="max-h-[min(24rem,50vh)] overflow-y-auto rounded-md border bg-background p-1">
              {ingredientSourcesQuery.isLoading || foodStyleSuggestionsQuery.isLoading ? (
                <p className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Loading ingredients...
                </p>
              ) : ingredientSuggestions.length === 0 ? (
                <p className="px-2 py-3 text-sm text-muted-foreground">
                  No source ingredients match.
                </p>
              ) : (
                <ul className="space-y-1">
                  {ingredientSuggestions.map((ingredient) => {
                    const selected = selectedIngredientSet.has(ingredient.id);
                    return (
                      <li key={ingredient.id}>
                        <button
                          type="button"
                          className="flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                          onClick={() => toggleIngredient(ingredient)}
                          aria-pressed={selected}
                        >
                          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border">
                            {selected ? <Check className="size-3.5" aria-hidden /> : null}
                          </span>
                          <span className="min-w-0">
                            <span className="block font-medium">
                              {ingredientDisplayLabel(ingredient, locale)}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {INGREDIENT_LANGUAGE_LABEL[locale]} · {ingredient.departmentName}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setIngredientPickerOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={detailRecipe !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailRecipe(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {detailRecipe && detailRecipeDisplay ? (
            <>
              <DialogHeader>
                <DialogTitle className="pr-8 text-left">{detailRecipeDisplay.title}</DialogTitle>
                <DialogDescription className="text-left">
                  {detailRecipeDisplay.summary || "Recipe details"}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-sm">
                {detailRecipeDisplay.showingSourceFallback && locale !== "sv" ? (
                  <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                    Showing Swedish recipe body until this recipe is translated.
                  </p>
                ) : null}

                <dl className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground">Food style</dt>
                    <dd>
                      {labelByFoodTypeId.get(detailRecipe.food_type_id) ??
                        detailRecipe.food_type_id}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground">Meal kind</dt>
                    <dd className="capitalize">{detailRecipe.meal_kind}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground">Cook time</dt>
                    <dd>{detailRecipe.estimated_cook_time.trim() || "Time unknown"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground">Difficulty</dt>
                    <dd>{formatRecipeDifficulty(detailRecipe.difficulty)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground">Vegetarian</dt>
                    <dd>{detailRecipe.vegetarian ? "Yes" : "No"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground">Status</dt>
                    <dd>{detailRecipe.tested ? "Verified" : "Not verified"}</dd>
                  </div>
                </dl>

                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Ingredients</p>
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full min-w-[20rem] border-collapse text-sm">
                      <caption className="sr-only">Ingredients</caption>
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-3 py-2 text-left font-medium">Ingredient</th>
                          <th className="px-3 py-2 text-left font-medium">Amount</th>
                          <th className="px-3 py-2 text-left font-medium">Text</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailRecipeDisplay.ingredients.map((row, index) => (
                          <tr key={`${detailRecipe.id}-detail-ingredient-${index}`} className="border-b last:border-0">
                            <td className="px-3 py-2 align-top">{row.ingredient_label}</td>
                            <td className="px-3 py-2 align-top">{row.amount}</td>
                            <td className="px-3 py-2 align-top">{row.text}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Steps</p>
                  <RecipeStepsDisplay
                    className="list-decimal space-y-1 pl-5"
                    steps={detailRecipeDisplay.steps}
                  />
                </div>

                <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
                  <Button type="button" variant="outline" onClick={() => setDetailRecipe(null)}>
                    Close
                  </Button>
                  <Button asChild variant="outline">
                    <Link
                      href={`/recipes/${encodeURIComponent(detailRecipe.id)}/cook`}
                      onClick={() => setDetailRecipe(null)}
                    >
                      <ChefHat className="size-4" aria-hidden />
                      Cook
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    disabled={addToPlanMutation.isPending && addingRecipeId === detailRecipe.id}
                    onClick={() => addToPlanMutation.mutate(detailRecipe.id)}
                  >
                    {addToPlanMutation.isPending && addingRecipeId === detailRecipe.id
                      ? "Adding..."
                      : "Add to plan"}
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {searchQuery.isLoading
            ? "Loading recipes..."
            : `${recipes.length} ${recipes.length === 1 ? "recipe" : "recipes"}`}
        </p>
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link href="/plan-to-cook">
            <ShoppingCart className="size-4" aria-hidden />
            Plan to cook
          </Link>
        </Button>
      </div>

      {!searchQuery.isLoading && recipes.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-muted-foreground">No recipes match this search.</p>
          </CardContent>
        </Card>
      ) : null}

      {recipes.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {recipes.map((recipe) => {
            const display = getRecipeDisplayFields(recipe as SavedRecipeWithI18n, locale);
            return (
              <Card key={recipe.id}>
                <CardHeader className="space-y-2">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <CardTitle className="text-base leading-snug">{display.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {labelByFoodTypeId.get(recipe.food_type_id) ?? recipe.food_type_id}
                        {recipe.vegetarian ? " · Vegetarian" : ""}
                      </CardDescription>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() => setDetailRecipe(recipe)}
                        aria-label={`View ${display.title}`}
                        title="View recipe"
                      >
                        <Eye className="size-4" aria-hidden />
                      </Button>
                      <Button asChild variant="outline" size="icon-sm" title="Cook recipe">
                        <Link
                          href={`/recipes/${encodeURIComponent(recipe.id)}/cook`}
                          aria-label={`Cook ${display.title}`}
                        >
                          <ChefHat className="size-4" aria-hidden />
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        disabled={addToPlanMutation.isPending && addingRecipeId === recipe.id}
                        onClick={() => addToPlanMutation.mutate(recipe.id)}
                        aria-label={`Add ${display.title} to plan`}
                        title="Add to plan"
                      >
                        {addToPlanMutation.isPending && addingRecipeId === recipe.id
                          ? <Loader2 className="size-4 animate-spin" aria-hidden />
                          : <ShoppingCart className="size-4" aria-hidden />}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {display.summary ? (
                    <p className="line-clamp-3 text-sm text-muted-foreground">{display.summary}</p>
                  ) : null}
                  {display.showingSourceFallback && locale !== "sv" ? (
                    <p className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                      Showing Swedish recipe body until this recipe is translated.
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full border px-2 py-1">
                      {recipe.estimated_cook_time.trim() || "Time unknown"}
                    </span>
                    <span className="rounded-full border px-2 py-1">
                      {formatRecipeDifficulty(recipe.difficulty)}
                    </span>
                    <span className="rounded-full border px-2 py-1">
                      {recipe.tested ? "Verified" : "Not verified"}
                    </span>
                    {recipe.want_to_try ? (
                      <span className="rounded-full border px-2 py-1">Want to cook</span>
                    ) : null}
                  </div>
                  <div className="text-sm">
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Ingredients</p>
                    <p className="line-clamp-2">
                      {display.ingredients
                        .slice(0, 6)
                        .map((row) => row.ingredient_label || row.text)
                        .filter(Boolean)
                        .join(", ") || "No ingredient labels"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}
    </main>
  );
}
