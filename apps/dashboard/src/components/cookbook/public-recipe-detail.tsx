"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChefHat } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RecipeStepsDisplay } from "@/components/dashboard/recipe-steps-display";
import {
  getRecipeDisplayFields,
  getRecipeDisplayTitle,
  type SavedRecipeWithI18n,
} from "@/lib/recipe-locale";
import type { SavedRecipeRow } from "@/lib/saved-recipe-row";

async function fetchPublicRecipe(id: string): Promise<SavedRecipeRow> {
  const res = await fetch(`/api/public/cookbook/recipes/${encodeURIComponent(id)}`, {
    cache: "no-store",
    credentials: "same-origin",
  });
  if (res.status === 503) {
    throw new Error("not_configured");
  }
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error ?? "Failed to load recipe");
  }
  const json = (await res.json()) as { recipe: SavedRecipeRow };
  return json.recipe;
}

type FoodTypesJson = { options: { id: string; label: string }[] };

async function fetchFoodTypes(): Promise<FoodTypesJson> {
  const res = await fetch("/data/recipe-food-types.json", { cache: "force-cache" });
  if (!res.ok) {
    throw new Error("Food types");
  }
  return res.json() as Promise<FoodTypesJson>;
}

type PublicRecipeDetailProps = {
  recipeId: string;
};

export function PublicRecipeDetail({ recipeId }: PublicRecipeDetailProps) {
  const foodTypesQuery = useQuery({
    queryKey: ["recipe-food-types"],
    queryFn: fetchFoodTypes,
  });
  const labelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of foodTypesQuery.data?.options ?? []) {
      m.set(o.id, o.label);
    }
    return m;
  }, [foodTypesQuery.data?.options]);

  const foodTypeLabel = (id: string) => labelById.get(id) ?? id;

  const query = useQuery({
    queryKey: ["public-cookbook-recipe", recipeId],
    queryFn: () => fetchPublicRecipe(recipeId),
  });

  const recipe = query.data;
  const display = useMemo(
    () =>
      recipe
        ? getRecipeDisplayFields(recipe as SavedRecipeWithI18n, "sv")
        : null,
    [recipe],
  );

  if (query.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (query.error) {
    const msg = query.error instanceof Error ? query.error.message : "Error";
    if (msg === "not_configured") {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Not available</CardTitle>
            <CardDescription>
              The shared cookbook is not configured on this deployment.
            </CardDescription>
          </CardHeader>
        </Card>
      );
    }
    return (
      <p className="text-destructive">
        {msg === "Recipe not found" ? "Recipe not found." : msg}
      </p>
    );
  }

  if (!recipe || !display) {
    return null;
  }

  const title = getRecipeDisplayTitle(recipe as SavedRecipeWithI18n, "sv");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 w-fit gap-1 px-2">
          <Link href="/cookbook">
            <ArrowLeft className="size-4" aria-hidden />
            All recipes
          </Link>
        </Button>
        <Button asChild variant="default" size="lg" className="gap-2 sm:shrink-0">
          <Link href={`/cookbook/${recipeId}/cook`}>
            <ChefHat className="size-5" aria-hidden />
            Start cooking
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {recipe.title_en || recipe.title_vi ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {recipe.title_en ? <span>EN: {recipe.title_en}</span> : null}
            {recipe.title_en && recipe.title_vi ? " · " : null}
            {recipe.title_vi ? <span>VI: {recipe.title_vi}</span> : null}
          </p>
        ) : null}
        <p className="mt-3 text-muted-foreground">{display.summary}</p>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="capitalize">Meal: {recipe.meal_kind}</span>
          <span>{foodTypeLabel(recipe.food_type_id)}</span>
          {recipe.estimated_cook_time.trim() ? (
            <span>Est. {recipe.estimated_cook_time}</span>
          ) : null}
          {recipe.vegetarian ? (
            <span className="text-emerald-700 dark:text-emerald-400">Vegetarian</span>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ingredients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[20rem] border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium">Label</th>
                  <th className="px-3 py-2 text-left font-medium">Amount</th>
                  <th className="px-3 py-2 text-left font-medium">Text</th>
                </tr>
              </thead>
              <tbody>
                {display.ingredients.map((row, i) => (
                  <tr key={`ing-${i}`} className="border-b last:border-0">
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
          <RecipeStepsDisplay className="list-decimal space-y-2 pl-5" steps={display.steps} />
        </CardContent>
      </Card>

      {recipe.similar_recipe_url?.trim() ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Original link</CardTitle>
            <CardDescription>Where this recipe was adapted from, if shared.</CardDescription>
          </CardHeader>
          <CardContent>
            <a
              href={recipe.similar_recipe_url}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-sm text-primary underline underline-offset-2"
            >
              {recipe.similar_recipe_url}
            </a>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="secondary" size="lg" className="gap-2">
          <Link href={`/cookbook/${recipeId}/cook`}>
            <ChefHat className="size-5" aria-hidden />
            Start cooking
          </Link>
        </Button>
      </div>
    </div>
  );
}
