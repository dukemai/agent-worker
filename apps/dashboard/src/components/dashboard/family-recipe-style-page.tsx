"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronLeft, ChevronRight, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { RecipeLanguageToolbar } from "@/components/dashboard/recipe-language-toolbar";
import { useRecipeLocale } from "@/components/dashboard/recipe-locale-provider";
import { RecipeStepsDisplay } from "@/components/dashboard/recipe-steps-display";
import {
  type FoodTypesJson,
  fetchFoodTypes,
  throwApiError,
} from "@/components/dashboard/recipe-generator-api";
import { addRecipeToPlan } from "@/components/dashboard/family-recipes-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SavedRecipeRow } from "@/lib/saved-recipe-row";
import {
  getRecipeDisplayFields,
  type SavedRecipeWithI18n,
} from "@/lib/recipe-locale";
import { formatRecipeDifficulty } from "@/lib/recipe-difficulty";
import { cn } from "@/lib/utils";

type FilterValue = "all" | "yes" | "no";

type StyleRecipesResponse = {
  recipes: SavedRecipeRow[];
  totalInStyle: number;
};

async function fetchStyleRecipes(input: {
  styleId: string;
  testedFilter: FilterValue;
  wantToTryFilter: FilterValue;
}): Promise<StyleRecipesResponse> {
  const params = new URLSearchParams({ styleId: input.styleId });
  if (input.testedFilter !== "all") {
    params.set("tested", input.testedFilter);
  }
  if (input.wantToTryFilter !== "all") {
    params.set("wantToTry", input.wantToTryFilter);
  }
  const response = await fetch(`/api/recipe-collaboration/style-recipes?${params.toString()}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    await throwApiError(response, "Failed to load style recipes");
  }
  return response.json() as Promise<StyleRecipesResponse>;
}

async function updateRecipeFeedback(input: {
  recipeId: string;
  tested?: boolean;
  want_to_try?: boolean;
  easy_to_follow?: boolean | null;
}): Promise<{ recipe: SavedRecipeRow }> {
  const { recipeId, ...body } = input;
  const response = await fetch(
    `/api/recipe-collaboration/recipes/${encodeURIComponent(recipeId)}/feedback`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!response.ok) {
    await throwApiError(response, "Failed to save feedback");
  }
  return response.json() as Promise<{ recipe: SavedRecipeRow }>;
}

export function FamilyRecipeStylePage({ styleId }: { styleId: string }) {
  const queryClient = useQueryClient();
  const { locale } = useRecipeLocale();
  const [testedFilter, setTestedFilter] = useState<FilterValue>("all");
  const [wantToTryFilter, setWantToTryFilter] = useState<FilterValue>("all");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [addedRecipeId, setAddedRecipeId] = useState<string | null>(null);

  const foodTypesQuery = useQuery<FoodTypesJson>({
    queryKey: ["recipe-food-types"],
    queryFn: fetchFoodTypes,
  });
  const recipesQuery = useQuery({
    queryKey: ["recipe-collaboration-style-recipes", styleId, testedFilter, wantToTryFilter],
    queryFn: () => fetchStyleRecipes({ styleId, testedFilter, wantToTryFilter }),
  });

  const feedbackMutation = useMutation({
    mutationFn: updateRecipeFeedback,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["recipe-collaboration-style-recipes", styleId],
      });
      await queryClient.invalidateQueries({ queryKey: ["recipe-collaboration-style-counts"] });
    },
  });

  const addToPlanMutation = useMutation({
    mutationFn: addRecipeToPlan,
    onSuccess: async (_data, recipeId) => {
      setAddedRecipeId(recipeId);
      await queryClient.invalidateQueries({ queryKey: ["cook-plan"] });
    },
  });

  const styleLabel = useMemo(
    () => foodTypesQuery.data?.options.find((style) => style.id === styleId)?.label ?? styleId,
    [foodTypesQuery.data?.options, styleId],
  );

  const recipes = recipesQuery.data?.recipes ?? [];
  const totalInStyle = recipesQuery.data?.totalInStyle ?? recipes.length;
  const safeIndex = recipes.length > 0 ? Math.min(currentIndex, recipes.length - 1) : 0;
  const recipe = recipes[safeIndex] ?? null;
  const display = useMemo(
    () => (recipe ? getRecipeDisplayFields(recipe as SavedRecipeWithI18n, locale) : null),
    [recipe, locale],
  );
  const error =
    foodTypesQuery.error instanceof Error
      ? foodTypesQuery.error.message
      : recipesQuery.error instanceof Error
        ? recipesQuery.error.message
        : feedbackMutation.error instanceof Error
          ? feedbackMutation.error.message
          : addToPlanMutation.error instanceof Error
            ? addToPlanMutation.error.message
            : null;

  function updateTestedFilter(value: FilterValue) {
    setTestedFilter(value);
    setCurrentIndex(0);
  }

  function updateWantToTryFilter(value: FilterValue) {
    setWantToTryFilter(value);
    setCurrentIndex(0);
  }

  function saveFeedback(patch: {
    tested?: boolean;
    want_to_try?: boolean;
    easy_to_follow?: boolean | null;
  }) {
    if (!recipe) {
      return;
    }
    feedbackMutation.mutate({ recipeId: recipe.id, ...patch });
  }

  function replaceRecipeInCache(nextRecipe: SavedRecipeWithI18n) {
    queryClient.setQueryData<StyleRecipesResponse | undefined>(
      ["recipe-collaboration-style-recipes", styleId, testedFilter, wantToTryFilter],
      (current) =>
        current
          ? {
              ...current,
              recipes: current.recipes.map((row) =>
                row.id === nextRecipe.id ? (nextRecipe as SavedRecipeRow) : row,
              ),
            }
          : current,
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 px-4 pb-24 pt-6">
      <Button asChild variant="ghost" className="gap-2">
        <Link href="/family/recipes">
          <ArrowLeft className="size-4" aria-hidden />
          Family recipes
        </Link>
      </Button>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{styleLabel}</h1>
          <p className="text-sm text-muted-foreground">
            {totalInStyle} {totalInStyle === 1 ? "recipe" : "recipes"} in this food style
            {recipes.length !== totalInStyle ? ` · ${recipes.length} after filters` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">Filters</span>
          <Select
            value={testedFilter}
            onValueChange={(value) => updateTestedFilter(value as FilterValue)}
          >
            <SelectTrigger className="h-7 w-30 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All verified</SelectItem>
              <SelectItem value="yes">Verified</SelectItem>
              <SelectItem value="no">Not verified</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={wantToTryFilter}
            onValueChange={(value) => updateWantToTryFilter(value as FilterValue)}
          >
            <SelectTrigger className="h-7 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All cooking</SelectItem>
              <SelectItem value="yes">Want to cook</SelectItem>
              <SelectItem value="no">Not marked</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {recipesQuery.isLoading || foodTypesQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading recipes...</p>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!recipesQuery.isLoading && recipes.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-muted-foreground">No recipes match these filters.</p>
          </CardContent>
        </Card>
      ) : null}

      {recipe ? (
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <CardTitle>{display?.title ?? recipe.title}</CardTitle>
                {locale === "sv" && (recipe.title_en || recipe.title_vi) ? (
                  <CardDescription className="mt-1">
                    {recipe.title_en ? `EN: ${recipe.title_en}` : ""}
                    {recipe.title_en && recipe.title_vi ? " · " : ""}
                    {recipe.title_vi ? `VI: ${recipe.title_vi}` : ""}
                  </CardDescription>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                <span className="rounded-full border bg-muted px-2.5 py-1 text-xs font-medium tabular-nums">
                  {safeIndex + 1} / {recipes.length}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={safeIndex === 0}
                  onClick={() => setCurrentIndex((idx) => Math.max(0, idx - 1))}
                >
                  <ChevronLeft className="size-4" aria-hidden />
                  Prev
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={safeIndex >= recipes.length - 1}
                  onClick={() => setCurrentIndex((idx) => Math.min(recipes.length - 1, idx + 1))}
                >
                  Next
                  <ChevronRight className="size-4" aria-hidden />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <RecipeLanguageToolbar
              className="rounded-md border bg-muted/25 p-3"
              recipeId={recipe.id}
              recipe={recipe as SavedRecipeWithI18n}
              translateEndpointForRecipe={(id) =>
                `/api/recipe-collaboration/recipes/${encodeURIComponent(id)}/translate`
              }
              onTranslated={replaceRecipeInCache}
            />
            {display?.showingSourceFallback && locale !== "sv" ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                Showing Swedish text for ingredients and steps. Translate with AI to save{" "}
                {locale.toUpperCase()} for next time.
              </p>
            ) : null}
            {display?.summary ? (
              <p className="text-sm text-muted-foreground">{display.summary}</p>
            ) : null}

            <div className="grid gap-3 rounded-md border bg-muted/30 p-3 text-sm sm:grid-cols-4">
              <div>
                <div className="text-xs font-medium text-muted-foreground">Cook time</div>
                <div>{recipe.estimated_cook_time.trim() || "-"}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground">Difficulty</div>
                <div>{formatRecipeDifficulty(recipe.difficulty)}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground">Vegetarian</div>
                <div>{recipe.vegetarian ? "Yes" : "No"}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground">Status</div>
                <div>
                  {recipe.tested ? "Verified" : "Not verified"}
                  {recipe.want_to_try ? " · Want to cook" : ""}
                </div>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Ingredients</p>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full min-w-[22rem] border-collapse text-sm">
                  <caption className="sr-only">Ingredients</caption>
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium">Label</th>
                      <th className="px-3 py-2 text-left font-medium">Amount</th>
                      <th className="px-3 py-2 text-left font-medium">Text</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(display?.ingredients ?? recipe.ingredients).map((row, index) => (
                      <tr key={`${recipe.id}-ingredient-${index}`} className="border-b last:border-0">
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
                className="list-decimal space-y-1 pl-5 text-sm"
                steps={display?.steps ?? recipe.steps}
              />
            </div>

            {recipe.similar_recipe_url.trim() ? (
              <a
                href={recipe.similar_recipe_url}
                target="_blank"
                rel="noreferrer"
                className="block break-all text-sm text-primary underline underline-offset-4"
              >
                {recipe.similar_recipe_url}
              </a>
            ) : null}

            <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 py-3 shadow-[0_-10px_24px_-18px_rgba(0,0,0,0.65)] backdrop-blur supports-[backdrop-filter]:bg-background/80">
              <div className="mx-auto flex w-full max-w-5xl flex-nowrap items-center gap-2 overflow-x-auto pb-1">
                <Button
                  type="button"
                  size="sm"
                  variant={recipe.easy_to_follow === true ? "secondary" : "outline"}
                  className={cn(
                    "shrink-0",
                    recipe.easy_to_follow === true
                      ? "border-violet-300 bg-violet-100 text-violet-950 hover:bg-violet-100 dark:border-violet-900 dark:bg-violet-950/45 dark:text-violet-100"
                      : "border-violet-300/70 text-violet-800 hover:bg-violet-50 dark:border-violet-900/70 dark:text-violet-200 dark:hover:bg-violet-950/30",
                  )}
                  disabled={feedbackMutation.isPending}
                  onClick={() => saveFeedback({ easy_to_follow: true })}
                >
                  Looks good
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="shrink-0 gap-1"
                  disabled={addToPlanMutation.isPending}
                  onClick={() => addToPlanMutation.mutate(recipe.id)}
                >
                  <ShoppingCart className="size-4" aria-hidden />
                  {addToPlanMutation.isPending
                    ? "Adding..."
                    : addedRecipeId === recipe.id
                      ? "Added"
                      : "Add to plan"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={recipe.easy_to_follow === false ? "secondary" : "outline"}
                  className={cn(
                    "shrink-0",
                    recipe.easy_to_follow === false
                      ? "border-amber-300 bg-amber-100 text-amber-950 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
                      : "border-amber-300/70 text-amber-800 hover:bg-amber-50 dark:border-amber-900/70 dark:text-amber-200 dark:hover:bg-amber-950/30",
                  )}
                  disabled={feedbackMutation.isPending}
                  onClick={() => saveFeedback({ easy_to_follow: false })}
                >
                  Needs changes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
