"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { LocaleSwitcher } from "@/components/dashboard/locale-switcher";
import { useRecipeLocale } from "@/components/dashboard/recipe-locale-provider";
import { PublicRecipeCookingDetail } from "@/components/recipes/public-recipe-cooking-detail";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  type AppLocale,
  getRecipeDisplayFields,
  getRecipeDisplayTitle,
  type SavedRecipeWithI18n,
} from "@/lib/recipe-locale";
import type { PublicRecipeSharePayload } from "@/lib/recipe-shares/types";
import type { SavedRecipeRow } from "@/lib/saved-recipe-row";

const ALL = "__all__";

type FoodTypesJson = { options: { id: string; label: string }[] };

async function fetchRecipeShare(slug: string): Promise<PublicRecipeSharePayload> {
  const response = await fetch(`/api/public/recipe-shares/${encodeURIComponent(slug)}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    const json = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(json.error ?? "Could not load shared recipes");
  }
  return response.json() as Promise<PublicRecipeSharePayload>;
}

async function fetchFoodTypes(): Promise<FoodTypesJson> {
  const response = await fetch("/data/recipe-food-types.json", { cache: "force-cache" });
  if (!response.ok) {
    throw new Error("Could not load food styles");
  }
  return response.json() as Promise<FoodTypesJson>;
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("sv-SE");
}

function ingredientKey(value: string): string {
  return normalize(value).replace(/\s+/g, " ");
}

function recipeIngredientKey(recipe: SavedRecipeRow, index: number): string {
  const row = recipe.ingredients[index];
  return ingredientKey(row?.ingredient_label || row?.text || "");
}

function recipeHaystack(recipe: SavedRecipeRow, locale: AppLocale): string {
  const display = getRecipeDisplayFields(recipe as SavedRecipeWithI18n, locale);
  return normalize(
    [
      display.title,
      display.summary,
      recipe.meal_kind,
      recipe.food_type_id,
      ...display.ingredients.flatMap((row) => [row.ingredient_label, row.amount, row.text]),
    ].join(" "),
  );
}

export function PublicRecipeSharePage({ slug }: { slug: string }) {
  const { locale } = useRecipeLocale();
  const [search, setSearch] = useState("");
  const [vegetarian, setVegetarian] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [openRecipeId, setOpenRecipeId] = useState<string | null>(null);

  const shareQuery = useQuery({
    queryKey: ["public-recipe-share", slug],
    queryFn: () => fetchRecipeShare(slug),
  });
  const foodTypesQuery = useQuery({
    queryKey: ["recipe-food-types"],
    queryFn: fetchFoodTypes,
  });

  const labelByFoodTypeId = useMemo(() => {
    const labels = new Map<string, string>();
    for (const option of foodTypesQuery.data?.options ?? []) {
      labels.set(option.id, option.label);
    }
    return labels;
  }, [foodTypesQuery.data?.options]);

  const recipes = useMemo(() => shareQuery.data?.recipes ?? [], [shareQuery.data?.recipes]);

  const ingredientOptions = useMemo(() => {
    const byKey = new Map<string, string>();
    for (const recipe of recipes) {
      const display = getRecipeDisplayFields(recipe as SavedRecipeWithI18n, locale);
      for (const [index, row] of display.ingredients.entries()) {
        const label = row.ingredient_label.trim() || row.text.trim();
        const key = recipeIngredientKey(recipe, index);
        if (key && !byKey.has(key)) {
          byKey.set(key, label);
        }
      }
    }
    return [...byKey.entries()]
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "sv-SE"));
  }, [locale, recipes]);

  const selectedSet = useMemo(() => new Set(selectedIngredients), [selectedIngredients]);

  const filteredRecipes = useMemo(() => {
    const q = normalize(search);
    return recipes.filter((recipe) => {
      if (vegetarian && !recipe.vegetarian) {
        return false;
      }
      if (q && !recipeHaystack(recipe, locale).includes(q)) {
        return false;
      }
      if (selectedIngredients.length > 0) {
        const recipeIngredientKeys = recipe.ingredients.map((_, index) =>
          recipeIngredientKey(recipe, index),
        );
        if (!selectedIngredients.some((ingredient) => recipeIngredientKeys.includes(ingredient))) {
          return false;
        }
      }
      return true;
    });
  }, [locale, recipes, search, selectedIngredients, vegetarian]);

  const singleRecipeMode = shareQuery.data?.share.scope_type === "recipe";
  const selectedRecipe = singleRecipeMode
    ? recipes[0] ?? null
    : openRecipeId
      ? recipes.find((recipe) => recipe.id === openRecipeId) ?? null
      : null;
  const title =
    shareQuery.data?.share.title ||
    (shareQuery.data?.share.food_type_id
      ? labelByFoodTypeId.get(shareQuery.data.share.food_type_id)
      : null) ||
    "Shared recipes";

  if (shareQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  if (shareQuery.error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Share not available</CardTitle>
          <CardDescription>
            {shareQuery.error instanceof Error ? shareQuery.error.message : "Could not load share"}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Read-only recipes
          </p>
          {!singleRecipeMode ? (
            <>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">{title}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"} in this food style.
              </p>
            </>
          ) : null}
        </div>
        <div className="flex flex-col gap-1.5 sm:items-end">
          <span className="text-xs font-medium text-muted-foreground">Language</span>
          <LocaleSwitcher compact />
        </div>
      </div>

      {!singleRecipeMode && !selectedRecipe ? (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="grid gap-3 md:grid-cols-[1fr_12rem]">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-9"
                  placeholder="Search recipes or ingredients..."
                  aria-label="Search shared recipes"
                />
              </div>
              <Select
                value={vegetarian ? "vegetarian" : ALL}
                onValueChange={(value) => setVegetarian(value === "vegetarian")}
              >
                <SelectTrigger aria-label="Diet filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All recipes</SelectItem>
                  <SelectItem value="vegetarian">Vegetarian</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {ingredientOptions.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Ingredients at home</p>
                <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto rounded-md border p-2">
                  {ingredientOptions.map((ingredient) => {
                    const active = selectedSet.has(ingredient.key);
                    return (
                      <Button
                        key={ingredient.key}
                        type="button"
                        variant={active ? "default" : "outline"}
                        size="sm"
                        className="h-auto max-w-full whitespace-normal text-left"
                        onClick={() =>
                          setSelectedIngredients((current) =>
                            current.includes(ingredient.key)
                              ? current.filter((item) => item !== ingredient.key)
                              : [...current, ingredient.key],
                          )
                        }
                      >
                        {ingredient.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {singleRecipeMode ? (
        selectedRecipe ? (
          <PublicRecipeCookingDetail
            key={`${selectedRecipe.id}-${locale}`}
            recipe={selectedRecipe}
            foodTypeLabel={
              labelByFoodTypeId.get(selectedRecipe.food_type_id) ?? selectedRecipe.food_type_id
            }
            locale={locale}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No recipe selected</CardTitle>
              <CardDescription>This share does not contain a visible recipe.</CardDescription>
            </CardHeader>
          </Card>
        )
      ) : selectedRecipe ? (
        <div className="space-y-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-fit gap-2 px-0"
            onClick={() => setOpenRecipeId(null)}
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back to {title}
          </Button>
          <PublicRecipeCookingDetail
            key={`${selectedRecipe.id}-${locale}`}
            recipe={selectedRecipe}
            foodTypeLabel={
              labelByFoodTypeId.get(selectedRecipe.food_type_id) ?? selectedRecipe.food_type_id
            }
            locale={locale}
          />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recipes</CardTitle>
            <CardDescription>
              Showing {filteredRecipes.length} of {recipes.length}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredRecipes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recipes match the filters.</p>
            ) : (
              <ul className="grid gap-3 md:grid-cols-2">
                {filteredRecipes.map((recipe) => {
                  const displayTitle = getRecipeDisplayTitle(
                    recipe as SavedRecipeWithI18n,
                    locale,
                  );
                  return (
                    <li key={recipe.id}>
                      <button
                        type="button"
                        className="h-full w-full rounded-md border p-3 text-left transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => setOpenRecipeId(recipe.id)}
                      >
                        <span className="block font-medium leading-snug">{displayTitle}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {recipe.estimated_cook_time.trim() || "Time unknown"} ·{" "}
                          {formatRecipeDifficulty(recipe.difficulty)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
