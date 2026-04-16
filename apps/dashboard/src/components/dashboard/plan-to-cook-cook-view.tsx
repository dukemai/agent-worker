"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { RecipeGeneratorMeal } from "@agent/shared";
import { ChefHat } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRecipeLocale } from "@/components/dashboard/recipe-locale-provider";
import { RecipeLanguageToolbar } from "@/components/dashboard/recipe-language-toolbar";
import { RecipeStepsDisplay } from "@/components/dashboard/recipe-steps-display";
import {
  getRecipeDisplayFields,
  getRecipeDisplayTitle,
  type RecipeI18nColumn,
  type SavedRecipeWithI18n,
} from "@/lib/recipe-locale";

type CookPlanItem = {
  id: string;
  sort_order: number;
  recipe_id: string;
  recipe: {
    id: string;
    title: string;
    title_en: string;
    title_vi: string;
    summary: string;
    meal_kind: string;
    food_type_id: string;
    vegetarian: boolean;
    estimated_cook_time: string;
    i18n?: RecipeI18nColumn | null;
  } | null;
};

type CookPlan = {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
};

async function fetchCookPlan(): Promise<{ plan: CookPlan; items: CookPlanItem[] }> {
  const res = await fetch("/api/cook-plan", { cache: "no-store" });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error ?? "Failed to load cook plan");
  }
  return res.json() as Promise<{ plan: CookPlan; items: CookPlanItem[] }>;
}

type RecipeDetail = SavedRecipeWithI18n;

async function fetchRecipe(id: string): Promise<{ recipe: RecipeDetail }> {
  const res = await fetch(`/api/recipes/${encodeURIComponent(id)}`, { cache: "no-store" });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error ?? "Failed to load recipe");
  }
  return res.json() as Promise<{ recipe: RecipeDetail }>;
}

export function PlanToCookCookView() {
  const queryClient = useQueryClient();
  const { locale } = useRecipeLocale();
  const planQuery = useQuery({ queryKey: ["cook-plan"], queryFn: fetchCookPlan });
  const [openRecipeId, setOpenRecipeId] = useState<string | null>(null);

  const recipeQuery = useQuery({
    queryKey: ["recipe", openRecipeId],
    queryFn: () => fetchRecipe(openRecipeId!),
    enabled: openRecipeId !== null,
  });

  const items = planQuery.data?.items ?? [];
  const planTitle = planQuery.data?.plan.title?.trim();

  const dialogRecipe = recipeQuery.data?.recipe;
  const display = useMemo(
    () => (dialogRecipe ? getRecipeDisplayFields(dialogRecipe, locale) : null),
    [dialogRecipe, locale],
  );

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ChefHat className="size-7 text-muted-foreground" aria-hidden />
            <h1 className="text-2xl font-semibold tracking-tight">Cooking</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Meals on your plan — open a recipe when you are ready to cook.
          </p>
          {planTitle ? (
            <p className="mt-2 text-sm font-medium text-foreground">Plan: {planTitle}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/plan-to-cook">Edit plan</Link>
          </Button>
          {items.length === 0 ? (
            <Button type="button" variant="secondary" size="sm" disabled>
              Prepare & shop
            </Button>
          ) : (
            <Button asChild variant="secondary" size="sm">
              <Link href="/plan-to-cook/prepare">Prepare & shop</Link>
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your meals</CardTitle>
          <CardDescription>
            {items.length === 0
              ? "Add recipes on the plan page first."
              : `${items.length} ${items.length === 1 ? "meal" : "meals"} queued.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {planQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : planQuery.error ? (
            <p className="text-sm text-destructive">
              {planQuery.error instanceof Error ? planQuery.error.message : "Error"}
            </p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing to cook yet.{" "}
              <Link href="/plan-to-cook" className="text-primary underline-offset-4 hover:underline">
                Go to Plan to cook
              </Link>{" "}
              to queue recipes.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {items.map((row) => {
                const r = row.recipe;
                const listTitle = r
                  ? getRecipeDisplayTitle(
                      {
                        title: r.title,
                        title_en: r.title_en,
                        title_vi: r.title_vi,
                        i18n: r.i18n,
                      },
                      locale,
                    )
                  : "";
                return (
                  <li
                    key={row.id}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-medium leading-snug">{r ? listTitle : "Recipe removed"}</p>
                      {r?.summary ? (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.summary}</p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {r?.meal_kind ? (
                          <span className="capitalize">Meal: {r.meal_kind}</span>
                        ) : null}
                        {r?.estimated_cook_time?.trim() ? (
                          <span>Est. {r.estimated_cook_time}</span>
                        ) : null}
                        {r?.vegetarian ? <span>Vegetarian</span> : null}
                      </div>
                    </div>
                    <div className="shrink-0">
                      <Button
                        type="button"
                        disabled={!r}
                        onClick={() => r && setOpenRecipeId(r.id)}
                      >
                        Start cooking
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={openRecipeId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setOpenRecipeId(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {recipeQuery.isLoading && openRecipeId ? (
            <>
              <DialogHeader>
                <DialogTitle>Loading recipe…</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">Fetching ingredients and steps.</p>
            </>
          ) : recipeQuery.error ? (
            <>
              <DialogHeader>
                <DialogTitle>Could not load recipe</DialogTitle>
                <DialogDescription>
                  {recipeQuery.error instanceof Error ? recipeQuery.error.message : "Unknown error"}
                </DialogDescription>
              </DialogHeader>
              <Button type="button" variant="outline" onClick={() => setOpenRecipeId(null)}>
                Close
              </Button>
            </>
          ) : dialogRecipe && display ? (
            <>
              <RecipeLanguageToolbar
                className="mb-4 border-b pb-4"
                recipeId={dialogRecipe.id}
                recipe={dialogRecipe}
                onTranslated={(r) => {
                  queryClient.setQueryData(["recipe", openRecipeId], { recipe: r });
                  void queryClient.invalidateQueries({ queryKey: ["cook-plan"] });
                }}
              />
              <DialogHeader>
                <DialogTitle className="pr-8 text-left">{display.title}</DialogTitle>
                {locale === "sv" && (dialogRecipe.title_en || dialogRecipe.title_vi) ? (
                  <div className="text-left text-sm text-muted-foreground">
                    {dialogRecipe.title_en ? <p>EN · {dialogRecipe.title_en}</p> : null}
                    {dialogRecipe.title_vi ? <p>VI · {dialogRecipe.title_vi}</p> : null}
                  </div>
                ) : null}
                <DialogDescription className="text-left">{display.summary}</DialogDescription>
              </DialogHeader>
              {display.showingSourceFallback && locale !== "sv" ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                  Showing Swedish text for ingredients and steps — use &quot;Translate with AI&quot;
                  above for {locale.toUpperCase()}.
                </p>
              ) : null}
              <div className="space-y-4 text-sm">
                <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
                  {dialogRecipe.estimated_cook_time?.trim() ? (
                    <div>
                      <dt className="font-medium text-muted-foreground">Est. time</dt>
                      <dd>{dialogRecipe.estimated_cook_time}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="font-medium text-muted-foreground">Meal</dt>
                    <dd className="capitalize">{dialogRecipe.meal_kind}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-muted-foreground">Vegetarian</dt>
                    <dd>{dialogRecipe.vegetarian ? "Yes" : "No"}</dd>
                  </div>
                </dl>
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Ingredients</p>
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full min-w-[20rem] border-collapse text-sm">
                      <caption className="sr-only">Ingredients</caption>
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-3 py-2 text-left font-medium">Label</th>
                          <th className="px-3 py-2 text-left font-medium">Amount</th>
                          <th className="px-3 py-2 text-left font-medium">Text</th>
                        </tr>
                      </thead>
                      <tbody>
                        {display.ingredients.map((ing, i) => (
                          <tr key={`ing-${i}`} className="border-b last:border-0">
                            <td className="px-3 py-2 align-top">{ing.ingredient_label}</td>
                            <td className="px-3 py-2 align-top">{ing.amount}</td>
                            <td className="px-3 py-2 align-top">{ing.text}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Steps</p>
                  <RecipeStepsDisplay className="list-decimal space-y-2 pl-5" steps={display.steps} />
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
