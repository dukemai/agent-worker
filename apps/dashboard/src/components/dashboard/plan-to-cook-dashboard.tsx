"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
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
import type { RecipeI18nColumn } from "@/lib/recipe-locale";

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

type SharedListBrief = {
  id: string;
  public_slug: string;
  title: string;
  source_cook_plan_id: string | null;
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

async function fetchSharedLists(): Promise<{ lists: SharedListBrief[] }> {
  const res = await fetch("/api/shared-shopping-lists", { cache: "no-store" });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error ?? "Failed to load shopping lists");
  }
  return res.json() as Promise<{ lists: SharedListBrief[] }>;
}

type SavedRecipeForLibrary = {
  id: string;
  title: string;
  title_en: string;
  title_vi: string;
  summary: string;
  meal_kind: string;
  food_type_id: string;
  vegetarian: boolean;
  estimated_cook_time: string;
};

async function fetchSavedRecipesForLibrary(): Promise<SavedRecipeForLibrary[]> {
  const res = await fetch("/api/recipes", { cache: "no-store" });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error ?? "Failed to load recipes");
  }
  const json = (await res.json()) as { recipes: SavedRecipeForLibrary[] };
  return json.recipes ?? [];
}

const SEARCH_LOCALE = "sv-SE";

/** Same meal kinds as recipe save / library. */
const MEAL_KIND_OPTIONS = ["lunch", "dinner", "either", "snack", "other"] as const;

const ALL_MEALS = "__all__";
const ALL_STYLES = "__all__";

type FoodTypesJson = {
  options: { id: string; label: string }[];
};

async function fetchFoodTypes(): Promise<FoodTypesJson> {
  const response = await fetch("/data/recipe-food-types.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load food types");
  }
  return response.json() as Promise<FoodTypesJson>;
}

function normalizeSearch(s: string): string {
  return s.trim().toLocaleLowerCase(SEARCH_LOCALE);
}

/** All tokens must appear somewhere in the combined searchable text (titles, summary, meal kind, food type id, optional Swedish style label). */
function recipeMatchesLibrarySearch(
  recipe: SavedRecipeForLibrary,
  rawQuery: string,
  foodTypeLabelSv?: string,
): boolean {
  const q = normalizeSearch(rawQuery);
  if (!q) {
    return true;
  }
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return true;
  }
  const haystack = normalizeSearch(
    [
      recipe.title,
      recipe.title_en,
      recipe.title_vi,
      recipe.summary,
      recipe.meal_kind,
      recipe.food_type_id,
      foodTypeLabelSv ?? "",
    ].join(" "),
  );
  return tokens.every((t) => haystack.includes(t));
}

/** When true, omit the page hero (for embedding under Recipe generator tabs). */
export function PlanToCookDashboard({ embedded = false }: { embedded?: boolean }) {
  const queryClient = useQueryClient();
  const planQuery = useQuery({ queryKey: ["cook-plan"], queryFn: fetchCookPlan });
  const listsQuery = useQuery({ queryKey: ["shared-shopping-lists"], queryFn: fetchSharedLists });
  const savedQuery = useQuery({ queryKey: ["saved-recipes"], queryFn: fetchSavedRecipesForLibrary });
  const foodTypesQuery = useQuery({ queryKey: ["recipe-food-types"], queryFn: fetchFoodTypes });
  const [librarySearch, setLibrarySearch] = useState("");
  const [mealFilter, setMealFilter] = useState<string>(ALL_MEALS);
  const [styleFilter, setStyleFilter] = useState<string>(ALL_STYLES);
  const [addingRecipeId, setAddingRecipeId] = useState<string | null>(null);

  const labelByFoodTypeId = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of foodTypesQuery.data?.options ?? []) {
      m.set(o.id, o.label);
    }
    return m;
  }, [foodTypesQuery.data?.options]);

  const removeMutation = useMutation({
    mutationFn: async (recipeId: string) => {
      const res = await fetch(
        `/api/cook-plan/items?recipeId=${encodeURIComponent(recipeId)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Remove failed");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cook-plan"] });
    },
  });

  const titleMutation = useMutation({
    mutationFn: async (title: string) => {
      const res = await fetch("/api/cook-plan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Could not save title");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cook-plan"] });
    },
  });

  const addToPlanMutation = useMutation({
    mutationFn: async (recipeId: string) => {
      const res = await fetch("/api/cook-plan/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Could not add recipe");
      }
    },
    onMutate: (recipeId: string) => {
      setAddingRecipeId(recipeId);
    },
    onSettled: () => {
      setAddingRecipeId(null);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cook-plan"] });
    },
  });

  const items = planQuery.data?.items ?? [];
  const recipeIds = items.map((i) => i.recipe_id);

  const recipesAvailableToAdd = useMemo(() => {
    const onPlan = new Set(recipeIds);
    return (savedQuery.data ?? []).filter((r) => !onPlan.has(r.id));
  }, [savedQuery.data, recipeIds]);

  const recipesAfterMealAndStyle = useMemo(() => {
    return recipesAvailableToAdd.filter((r) => {
      if (mealFilter !== ALL_MEALS && r.meal_kind !== mealFilter) {
        return false;
      }
      if (styleFilter !== ALL_STYLES && r.food_type_id !== styleFilter) {
        return false;
      }
      return true;
    });
  }, [recipesAvailableToAdd, mealFilter, styleFilter]);

  const librarySearchResults = useMemo(
    () =>
      recipesAfterMealAndStyle.filter((r) =>
        recipeMatchesLibrarySearch(r, librarySearch, labelByFoodTypeId.get(r.food_type_id)),
      ),
    [recipesAfterMealAndStyle, librarySearch, labelByFoodTypeId],
  );

  const filtersActive = mealFilter !== ALL_MEALS || styleFilter !== ALL_STYLES;

  return (
    <div
      className={
        embedded
          ? "mx-auto max-w-3xl space-y-6 py-2"
          : "mx-auto max-w-3xl space-y-8 px-4 py-8"
      }
    >
      {!embedded ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Plan to cook</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Queue recipes from your library, then prepare ingredients and share a shopping list link.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href="/plan-to-cook/cook">Cooking view</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Plan to cook</span> — same queue as{" "}
          <Link href="/plan-to-cook" className="text-primary underline-offset-4 hover:underline">
            /plan-to-cook
          </Link>
          .{" "}
          <Link href="/plan-to-cook/cook" className="text-primary underline-offset-4 hover:underline">
            Cooking view
          </Link>{" "}
          to start cooking.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your queue</CardTitle>
          <CardDescription>
            Pick saved recipes to add, then open Prepare when you are ready.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {planQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : planQuery.error ? (
            <p className="text-sm text-destructive">
              {planQuery.error instanceof Error ? planQuery.error.message : "Error"}
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">Plan title (optional)</span>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    key={planQuery.data?.plan.id}
                    defaultValue={planQuery.data?.plan.title ?? ""}
                    placeholder="e.g. Week 12"
                    maxLength={200}
                    disabled={titleMutation.isPending}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      const cur = planQuery.data?.plan.title ?? "";
                      if (v === cur) {
                        return;
                      }
                      void titleMutation.mutateAsync(v);
                    }}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Add from library</span>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Filter by meal type and food style, then search titles and text (SV/EN/VI), summary, and
                    meal kind. Results exclude recipes already on your plan.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                  <div className="space-y-1.5 sm:min-w-[10rem]">
                    <span className="text-xs font-medium text-muted-foreground" id="plan-lib-meal">
                      Meal type
                    </span>
                    <Select
                      value={mealFilter}
                      onValueChange={setMealFilter}
                      disabled={savedQuery.isLoading || recipesAvailableToAdd.length === 0}
                    >
                      <SelectTrigger id="plan-lib-meal-trigger" aria-labelledby="plan-lib-meal">
                        <SelectValue placeholder="All meals" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_MEALS}>All meal types</SelectItem>
                        {MEAL_KIND_OPTIONS.map((k) => (
                          <SelectItem key={k} value={k}>
                            {k}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5 sm:min-w-[14rem]">
                    <span className="text-xs font-medium text-muted-foreground" id="plan-lib-style">
                      Style
                    </span>
                    <Select
                      value={styleFilter}
                      onValueChange={setStyleFilter}
                      disabled={
                        savedQuery.isLoading ||
                        recipesAvailableToAdd.length === 0 ||
                        foodTypesQuery.isLoading
                      }
                    >
                      <SelectTrigger
                        id="plan-lib-style-trigger"
                        className="w-full"
                        aria-labelledby="plan-lib-style"
                      >
                        <SelectValue placeholder={foodTypesQuery.isLoading ? "Loading…" : "All styles"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_STYLES}>All styles</SelectItem>
                        {(foodTypesQuery.data?.options ?? []).map((o) => (
                          <SelectItem key={o.id} value={o.id}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {foodTypesQuery.error ? (
                      <p className="text-xs text-destructive">
                        Could not load style list. Meal filter still works.
                      </p>
                    ) : null}
                  </div>
                  {filtersActive ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0 self-end sm:mb-0.5"
                      onClick={() => {
                        setMealFilter(ALL_MEALS);
                        setStyleFilter(ALL_STYLES);
                      }}
                    >
                      Clear filters
                    </Button>
                  ) : null}
                </div>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    className="pl-9"
                    value={librarySearch}
                    onChange={(e) => setLibrarySearch(e.target.value)}
                    placeholder="Search saved recipes…"
                    disabled={savedQuery.isLoading || recipesAvailableToAdd.length === 0}
                    aria-label="Search saved recipes to add to the plan"
                  />
                </div>
                {savedQuery.error ? (
                  <p className="text-xs text-destructive">
                    {savedQuery.error instanceof Error ? savedQuery.error.message : "Could not load recipes"}
                  </p>
                ) : null}
                {!savedQuery.isLoading &&
                (savedQuery.data?.length ?? 0) === 0 &&
                !savedQuery.error ? (
                  <p className="text-xs text-muted-foreground">
                    No saved recipes yet. Use the <strong>Library</strong> tab to save one first.
                  </p>
                ) : null}
                {!savedQuery.isLoading &&
                (savedQuery.data?.length ?? 0) > 0 &&
                recipesAvailableToAdd.length === 0 &&
                items.length > 0 ? (
                  <p className="text-xs text-muted-foreground">All saved recipes are already on this plan.</p>
                ) : null}
                {!savedQuery.isLoading && recipesAvailableToAdd.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border border-emerald-200/80 bg-emerald-50/50 dark:border-emerald-900/45 dark:bg-emerald-950/25">
                    <div className="max-h-[min(22rem,50vh)] overflow-y-auto">
                      <table className="w-full min-w-[28rem] border-collapse text-sm">
                        <caption className="sr-only">
                          Saved recipes matching filters and search; add to plan
                        </caption>
                        <thead className="sticky top-0 z-10 border-b border-emerald-200/60 bg-emerald-100/90 backdrop-blur-sm dark:border-emerald-900/50 dark:bg-emerald-950/90">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium">Title</th>
                            <th className="px-3 py-2 text-left font-medium">Est. time</th>
                            <th className="px-3 py-2 text-right font-medium">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {librarySearchResults.length === 0 ? (
                            <tr>
                              <td
                                colSpan={3}
                                className="px-3 py-6 text-center text-muted-foreground"
                              >
                                {recipesAfterMealAndStyle.length === 0 && recipesAvailableToAdd.length > 0
                                  ? "No recipes match meal type and style filters."
                                  : normalizeSearch(librarySearch) && recipesAfterMealAndStyle.length > 0
                                    ? "No recipes match your search."
                                    : "No recipes to show."}
                              </td>
                            </tr>
                          ) : (
                            librarySearchResults.map((r) => (
                              <tr
                                key={r.id}
                                className="border-b border-emerald-200/40 last:border-0 dark:border-emerald-900/35"
                              >
                                <td className="px-3 py-2 align-top">
                                  <div className="font-medium leading-snug">{r.title}</div>
                                  {r.title_en || r.title_vi ? (
                                    <div className="mt-1 text-xs text-muted-foreground">
                                      {r.title_en ? <span>EN: {r.title_en}</span> : null}
                                      {r.title_en && r.title_vi ? " · " : null}
                                      {r.title_vi ? <span>VI: {r.title_vi}</span> : null}
                                    </div>
                                  ) : null}
                                </td>
                                <td className="px-3 py-2 align-top text-muted-foreground">
                                  {r.estimated_cook_time?.trim() ? r.estimated_cook_time : "—"}
                                </td>
                                <td className="px-3 py-2 text-right align-top">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    disabled={
                                      addToPlanMutation.isPending && addingRecipeId === r.id
                                    }
                                    onClick={() => void addToPlanMutation.mutateAsync(r.id)}
                                  >
                                    {addToPlanMutation.isPending && addingRecipeId === r.id
                                      ? "Adding…"
                                      : "Add"}
                                  </Button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
                {!savedQuery.isLoading && recipesAvailableToAdd.length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium tabular-nums text-foreground">
                      {librarySearchResults.length}
                    </span>{" "}
                    {librarySearchResults.length === 1 ? "recipe" : "recipes"}
                    {normalizeSearch(librarySearch)
                      ? " match search"
                      : filtersActive
                        ? " after filters"
                        : " not on plan"}
                  </p>
                ) : null}
              </div>

              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No recipes in the queue yet. Add one from the search results above.
                </p>
              ) : (
                <ul className="divide-y rounded-lg border">
                  {items.map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-medium leading-snug">
                          {row.recipe?.title ?? "Recipe removed"}
                        </p>
                        {row.recipe?.estimated_cook_time?.trim() ? (
                          <p className="text-xs text-muted-foreground">
                            Est. {row.recipe.estimated_cook_time}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={removeMutation.isPending}
                          onClick={() => void removeMutation.mutateAsync(row.recipe_id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex flex-wrap gap-2">
                <Button asChild disabled={items.length === 0}>
                  <Link href="/plan-to-cook/prepare">Prepare & shopping list</Link>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShoppingCart className="size-5" aria-hidden />
            Shared shopping lists
          </CardTitle>
          <CardDescription>
            Lists you created from Prepare. Edit anytime; the public link stays the same.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {listsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : listsQuery.error ? (
            <p className="text-sm text-destructive">
              {listsQuery.error instanceof Error ? listsQuery.error.message : "Error"}
            </p>
          ) : (listsQuery.data?.lists ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No shared lists yet.</p>
          ) : (
            <ul className="space-y-2">
              {(listsQuery.data?.lists ?? []).map((list) => (
                <li
                  key={list.id}
                  className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{list.title || "Shopping list"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      /shop/{list.public_slug}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/plan-to-cook/lists/${list.id}`}>Edit</Link>
                    </Button>
                    <CopyPublicLinkButton slug={list.public_slug} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CopyPublicLinkButton({ slug }: { slug: string }) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={() => {
        const url = `${typeof window !== "undefined" ? window.location.origin : ""}/shop/${slug}`;
        void navigator.clipboard.writeText(url);
      }}
    >
      Copy link
    </Button>
  );
}
