"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChefHat } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecipeStepsDisplay } from "@/components/dashboard/recipe-steps-display";
import {
  getRecipeDisplayFields,
  getRecipeDisplayTitle,
  type SavedRecipeWithI18n,
} from "@/lib/recipe-locale";
import { formatRecipeDifficulty } from "@/lib/recipe-difficulty";
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

type PublicCookbookCookProps = {
  recipeId: string;
};

export function PublicCookbookCook({ recipeId }: PublicCookbookCookProps) {
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

  if (query.error || !recipe || !display) {
    const msg = query.error instanceof Error ? query.error.message : "Error";
    return (
      <div className="space-y-4">
        <p className="text-destructive">{msg === "Recipe not found" ? "Recipe not found." : msg}</p>
        <Button asChild variant="outline">
          <Link href="/cookbook">Back to cookbook</Link>
        </Button>
      </div>
    );
  }

  const title = getRecipeDisplayTitle(recipe as SavedRecipeWithI18n, "sv");

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <ChefHat className="mt-0.5 size-10 text-emerald-700 dark:text-emerald-400" aria-hidden />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Cooking
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {recipe.estimated_cook_time.trim()
                ? `Est. ${recipe.estimated_cook_time} · ${formatRecipeDifficulty(recipe.difficulty)}`
                : formatRecipeDifficulty(recipe.difficulty)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/cookbook/${recipeId}`}>
              <ArrowLeft className="mr-1 size-4" aria-hidden />
              Recipe detail
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/cookbook">All recipes</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ingredients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[18rem] border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium">Label</th>
                  <th className="px-3 py-2 text-left font-medium">Amount</th>
                  <th className="px-3 py-2 text-left font-medium">Text</th>
                </tr>
              </thead>
              <tbody>
                {display.ingredients.map((row, i) => (
                  <tr key={`c-${i}`} className="border-b last:border-0">
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
          <RecipeStepsDisplay className="list-decimal space-y-3 pl-5 text-base" steps={display.steps} />
        </CardContent>
      </Card>
    </div>
  );
}
