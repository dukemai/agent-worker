"use client";

import { useQuery } from "@tanstack/react-query";
import { ChefHat, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { RecipeStepsDisplay } from "@/components/dashboard/recipe-steps-display";
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

function recipeHaystack(recipe: SavedRecipeRow): string {
  return normalize(
    [
      recipe.title,
      recipe.title_en,
      recipe.title_vi,
      recipe.summary,
      recipe.meal_kind,
      recipe.food_type_id,
      ...recipe.ingredients.flatMap((row) => [row.ingredient_label, row.amount, row.text]),
    ].join(" "),
  );
}

function estimatedMinutes(recipe: SavedRecipeRow): number | null {
  const match = recipe.estimated_cook_time.match(/\d+/);
  return match ? Number(match[0]) : null;
}

export function PublicRecipeSharePage({ slug }: { slug: string }) {
  const [search, setSearch] = useState("");
  const [vegetarian, setVegetarian] = useState(false);
  const [difficulty, setDifficulty] = useState(ALL);
  const [timeLimit, setTimeLimit] = useState(ALL);
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
      for (const row of recipe.ingredients) {
        const label = row.ingredient_label.trim() || row.text.trim();
        const key = ingredientKey(label);
        if (key && !byKey.has(key)) {
          byKey.set(key, label);
        }
      }
    }
    return [...byKey.entries()]
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "sv-SE"));
  }, [recipes]);

  const selectedSet = useMemo(() => new Set(selectedIngredients), [selectedIngredients]);

  const filteredRecipes = useMemo(() => {
    const q = normalize(search);
    return recipes.filter((recipe) => {
      if (vegetarian && !recipe.vegetarian) {
        return false;
      }
      if (difficulty !== ALL && recipe.difficulty !== difficulty) {
        return false;
      }
      if (timeLimit !== ALL) {
        const minutes = estimatedMinutes(recipe);
        if (minutes === null || minutes > Number(timeLimit)) {
          return false;
        }
      }
      if (q && !recipeHaystack(recipe).includes(q)) {
        return false;
      }
      if (selectedIngredients.length > 0) {
        const recipeIngredientKeys = recipe.ingredients.map((row) =>
          ingredientKey(row.ingredient_label || row.text),
        );
        if (!selectedIngredients.some((ingredient) => recipeIngredientKeys.includes(ingredient))) {
          return false;
        }
      }
      return true;
    });
  }, [difficulty, recipes, search, selectedIngredients, timeLimit, vegetarian]);

  const openRecipe =
    filteredRecipes.find((recipe) => recipe.id === openRecipeId) ?? filteredRecipes[0] ?? null;
  const singleRecipeMode = shareQuery.data?.share.scope_type === "recipe";
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
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Read-only recipes
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {singleRecipeMode
            ? "A shared recipe from the family knowledge base."
            : `${recipes.length} ${recipes.length === 1 ? "recipe" : "recipes"} in this food style.`}
        </p>
      </div>

      {!singleRecipeMode ? (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="grid gap-3 md:grid-cols-[1fr_12rem_12rem_12rem]">
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
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger aria-label="Difficulty filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Any difficulty</SelectItem>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
              <Select value={timeLimit} onValueChange={setTimeLimit}>
                <SelectTrigger aria-label="Time filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Any time</SelectItem>
                  <SelectItem value="15">15 min or less</SelectItem>
                  <SelectItem value="30">30 min or less</SelectItem>
                  <SelectItem value="45">45 min or less</SelectItem>
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

      <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
        {!singleRecipeMode ? (
          <Card className="h-fit">
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
                <ul className="space-y-2">
                  {filteredRecipes.map((recipe) => {
                    const displayTitle = getRecipeDisplayTitle(recipe as SavedRecipeWithI18n, "sv");
                    return (
                      <li key={recipe.id}>
                        <button
                          type="button"
                          className="w-full rounded-md border p-3 text-left transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() => setOpenRecipeId(recipe.id)}
                          aria-pressed={openRecipe?.id === recipe.id}
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
        ) : null}

        {openRecipe ? (
          <SharedRecipeDetail
            recipe={openRecipe}
            foodTypeLabel={labelByFoodTypeId.get(openRecipe.food_type_id) ?? openRecipe.food_type_id}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No recipe selected</CardTitle>
              <CardDescription>Adjust the filters to find a matching recipe.</CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </main>
  );
}

function SharedRecipeDetail({
  recipe,
  foodTypeLabel,
}: {
  recipe: SavedRecipeRow;
  foodTypeLabel: string;
}) {
  const display = getRecipeDisplayFields(recipe as SavedRecipeWithI18n, "sv");
  const title = getRecipeDisplayTitle(recipe as SavedRecipeWithI18n, "sv");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-2xl">{title}</CardTitle>
              <CardDescription className="mt-2">{display.summary}</CardDescription>
            </div>
            <ChefHat className="hidden size-9 text-muted-foreground sm:block" aria-hidden />
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>{foodTypeLabel}</span>
            <span className="capitalize">{recipe.meal_kind}</span>
            {recipe.estimated_cook_time.trim() ? <span>Est. {recipe.estimated_cook_time}</span> : null}
            <span>{formatRecipeDifficulty(recipe.difficulty)}</span>
            {recipe.vegetarian ? <span>Vegetarian</span> : null}
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ingredients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[20rem] border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium">Ingredient</th>
                  <th className="px-3 py-2 text-left font-medium">Amount</th>
                  <th className="px-3 py-2 text-left font-medium">Line</th>
                </tr>
              </thead>
              <tbody>
                {display.ingredients.map((row, index) => (
                  <tr key={`${row.ingredient_label}-${index}`} className="border-b last:border-0">
                    <td className="px-3 py-2 align-top">{row.ingredient_label}</td>
                    <td className="px-3 py-2 align-top">{row.amount}</td>
                    <td className="px-3 py-2 align-top">{row.text}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <RecipeStepsDisplay className="list-decimal space-y-3 pl-5" steps={display.steps} />
        </CardContent>
      </Card>

      {recipe.similar_recipe_url?.trim() ? (
        <Button asChild variant="outline">
          <Link href={recipe.similar_recipe_url} target="_blank" rel="noopener noreferrer">
            Original link
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
