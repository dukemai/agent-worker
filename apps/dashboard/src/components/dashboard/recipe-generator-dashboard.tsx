"use client";

import {
  RECIPE_GENERATOR_SOURCE_LABEL,
  type RecipeGenerateResult,
  type RecipeGeneratorMeal,
} from "@agent/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { parsePromoPickerCatalogJson } from "@/lib/promo-picker-catalog-validate";
import { foodDepartmentIdsFromCatalog } from "@/lib/recipe-picker-food-departments";
import {
  MAX_INGREDIENT_PICKS,
  normalizeExcludeMealTitles,
} from "@/lib/recipe-request";
import {
  MAX_PROMO_WATCHLIST_ITEMS,
  PROMO_WATCHLIST_KEY,
  fetchPromoWatchlist,
  serializePromoWatchlist,
} from "@/lib/promo-watchlist";
import {
  countRecipesByFoodTypeId,
  recipeStyleProgressBand,
  recipeStyleTargetRangeLabel,
  RECIPE_STYLE_TARGET_MAX,
  RECIPE_STYLE_TARGET_MIN,
} from "@/lib/recipe-collection-targets";
import { formatSavedRecipeSourceLabel } from "@/lib/recipe-source";
import type { PromoPickerCatalog, PromoPickerItem } from "@/types/promo-picker-catalog";

const ALL_DEPARTMENTS = "__all__";
const ALL_LIBRARY_TYPES = "__all__";

const MEAL_KIND_OPTIONS = ["lunch", "dinner", "either", "snack", "other"] as const;

function formatSavedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("sv-SE", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

type FoodTypesJson = {
  options: { id: string; label: string }[];
};

type GenerateResponse = {
  result: RecipeGenerateResult;
  meta: {
    food_type_id: string;
    food_type_label_sv: string;
    vegetarian: boolean;
    ingredient_count: number;
    exclude_count: number;
    recipe_model: string;
    recipe_source_label: string;
  };
};

type SavedRecipeRow = {
  id: string;
  title: string;
  title_en: string;
  title_vi: string;
  summary: string;
  meal_kind: string;
  ingredients: RecipeGeneratorMeal["ingredients"];
  steps: string[];
  food_type_id: string;
  vegetarian: boolean;
  ingredient_picks: string[];
  tested: boolean;
  want_to_try: boolean;
  estimated_cook_time: string;
  source: string;
  similar_recipe_url: string;
  created_at: string;
};

type RecipeEditDraft = {
  title: string;
  title_en: string;
  title_vi: string;
  summary: string;
  meal_kind: string;
  ingredients: RecipeGeneratorMeal["ingredients"];
};

function savedRowToEditDraft(r: SavedRecipeRow): RecipeEditDraft {
  return {
    title: r.title,
    title_en: r.title_en ?? "",
    title_vi: r.title_vi ?? "",
    summary: r.summary,
    meal_kind: r.meal_kind,
    ingredients: r.ingredients.map((x) => ({ ...x })),
  };
}

async function fetchPickerCatalog(): Promise<PromoPickerCatalog> {
  const response = await fetch("/data/ica-maxi-promo-picker-catalog.json", {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Failed to load picker catalog");
  }
  const raw: unknown = await response.json();
  return parsePromoPickerCatalogJson(raw);
}

async function fetchFoodTypes(): Promise<FoodTypesJson> {
  const response = await fetch("/data/recipe-food-types.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load food types");
  }
  return response.json() as Promise<FoodTypesJson>;
}

async function fetchSavedRecipes(): Promise<SavedRecipeRow[]> {
  const response = await fetch("/api/recipes", { cache: "no-store" });
  if (!response.ok) {
    const json = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(json.error ?? "Failed to load recipes");
  }
  const json = (await response.json()) as { recipes: SavedRecipeRow[] };
  return json.recipes ?? [];
}

async function throwApiError(response: Response, fallback: string): Promise<never> {
  const json = (await response.json().catch(() => ({}))) as { error?: string };
  throw new Error(json.error ?? fallback);
}

export function RecipeGeneratorDashboard() {
  const [departmentId, setDepartmentId] = useState<string>(ALL_DEPARTMENTS);
  const [search, setSearch] = useState("");
  const [picks, setPicks] = useState<string[]>([]);
  const [foodTypeId, setFoodTypeId] = useState<string>("");
  const [vegetarian, setVegetarian] = useState(false);
  const [excludeText, setExcludeText] = useState("");
  const [lastMeals, setLastMeals] = useState<RecipeGeneratorMeal[]>([]);
  const [lastMeta, setLastMeta] = useState<GenerateResponse["meta"] | null>(null);
  const [generateResult, setGenerateResult] = useState<RecipeGenerateResult | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [libraryTypeFilter, setLibraryTypeFilter] = useState<string>(ALL_LIBRARY_TYPES);
  const [ingredientsFavoritesOnly, setIngredientsFavoritesOnly] = useState(false);
  const [detailRecipe, setDetailRecipe] = useState<SavedRecipeRow | null>(null);
  const [cookTimeDraft, setCookTimeDraft] = useState("");
  const [similarUrlDraft, setSimilarUrlDraft] = useState("");
  const [recipeEditMode, setRecipeEditMode] = useState(false);
  const [editDraft, setEditDraft] = useState<RecipeEditDraft | null>(null);
  const [editStepsText, setEditStepsText] = useState("");

  const queryClient = useQueryClient();

  useEffect(() => {
    if (detailRecipe) {
      setCookTimeDraft(detailRecipe.estimated_cook_time);
      setSimilarUrlDraft(detailRecipe.similar_recipe_url);
    } else {
      setCookTimeDraft("");
      setSimilarUrlDraft("");
    }
  }, [detailRecipe?.id, detailRecipe?.estimated_cook_time, detailRecipe?.similar_recipe_url]);

  const catalogQuery = useQuery({
    queryKey: ["promo-picker-catalog"],
    queryFn: fetchPickerCatalog,
  });

  const foodTypesQuery = useQuery({
    queryKey: ["recipe-food-types"],
    queryFn: fetchFoodTypes,
  });

  const savedQuery = useQuery({
    queryKey: ["saved-recipes"],
    queryFn: fetchSavedRecipes,
  });

  const watchlistQuery = useQuery({
    queryKey: ["context", PROMO_WATCHLIST_KEY],
    queryFn: fetchPromoWatchlist,
  });

  const watchlistMutation = useMutation({
    mutationFn: async (items: string[]) => {
      const response = await fetch(
        `/api/context/${encodeURIComponent(PROMO_WATCHLIST_KEY)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: serializePromoWatchlist(items) }),
        },
      );
      if (!response.ok) {
        await throwApiError(response, "Failed to save watchlist");
      }
      return response.json();
    },
    onSuccess: async () => {
      setLocalError(null);
      await queryClient.invalidateQueries({ queryKey: ["context", PROMO_WATCHLIST_KEY] });
      await queryClient.invalidateQueries({ queryKey: ["context"] });
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const excludeMealTitles = normalizeExcludeMealTitles(
        excludeText
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
      );
      const response = await fetch("/api/recipes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredientTexts: picks,
          foodTypeId,
          vegetarian,
          excludeMealTitles,
        }),
      });
      if (!response.ok) {
        await throwApiError(response, "Generation failed");
      }
      return response.json() as Promise<GenerateResponse>;
    },
    onSuccess: (data) => {
      setLocalError(null);
      setGenerateResult(data.result);
      setLastMeals(data.result.meals);
      setLastMeta(data.meta);
    },
    onError: (e) => {
      setLocalError(e instanceof Error ? e.message : "Generation failed");
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (meal: RecipeGeneratorMeal) => {
      if (!lastMeta) {
        throw new Error("Missing generation context");
      }
      const response = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: meal.title,
          title_en: meal.title_en,
          title_vi: meal.title_vi,
          summary: meal.summary,
          meal_kind: meal.meal_kind,
          ingredients: meal.ingredients,
          steps: meal.steps,
          food_type_id: lastMeta.food_type_id,
          vegetarian: lastMeta.vegetarian,
          ingredient_picks: picks,
          estimated_cook_time: meal.estimated_cook_time,
        }),
      });
      if (!response.ok) {
        await throwApiError(response, "Save failed");
      }
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["saved-recipes"] });
    },
  });

  const savedRecipePatchMutation = useMutation({
    mutationFn: async (payload: {
      id: string;
      tested?: boolean;
      want_to_try?: boolean;
      estimated_cook_time?: string;
      similar_recipe_url?: string;
      title?: string;
      title_en?: string;
      title_vi?: string;
      summary?: string;
      meal_kind?: string;
      ingredients?: RecipeGeneratorMeal["ingredients"];
      steps?: string[];
    }) => {
      const { id, ...rest } = payload;
      const body: Record<string, unknown> = {};
      if (typeof rest.tested === "boolean") {
        body.tested = rest.tested;
      }
      if (typeof rest.want_to_try === "boolean") {
        body.want_to_try = rest.want_to_try;
      }
      if (typeof rest.estimated_cook_time === "string") {
        body.estimated_cook_time = rest.estimated_cook_time.trim().slice(0, 120);
      }
      if (typeof rest.similar_recipe_url === "string") {
        body.similar_recipe_url = rest.similar_recipe_url.trim();
      }
      if (typeof rest.title === "string") {
        body.title = rest.title;
      }
      if (typeof rest.title_en === "string") {
        body.title_en = rest.title_en;
      }
      if (typeof rest.title_vi === "string") {
        body.title_vi = rest.title_vi;
      }
      if (typeof rest.summary === "string") {
        body.summary = rest.summary;
      }
      if (typeof rest.meal_kind === "string") {
        body.meal_kind = rest.meal_kind;
      }
      if (rest.ingredients !== undefined) {
        body.ingredients = rest.ingredients;
      }
      if (rest.steps !== undefined) {
        body.steps = rest.steps;
      }
      const response = await fetch(`/api/recipes/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        await throwApiError(response, "Update failed");
      }
      return response.json() as Promise<{ recipe: SavedRecipeRow }>;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["saved-recipes"] });
      if (data.recipe) {
        setDetailRecipe((prev) =>
          prev?.id === data.recipe.id ? data.recipe : prev,
        );
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/recipes/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        await throwApiError(response, "Delete failed");
      }
      return response.json();
    },
    onSuccess: async (_, deletedId) => {
      setDetailRecipe((prev) => (prev?.id === deletedId ? null : prev));
      await queryClient.invalidateQueries({ queryKey: ["saved-recipes"] });
    },
  });

  const foodDeptIds = useMemo(
    () =>
      catalogQuery.data ? foodDepartmentIdsFromCatalog(catalogQuery.data) : new Set<string>(),
    [catalogQuery.data],
  );

  const departments = useMemo(() => {
    const cats = catalogQuery.data?.categories ?? [];
    return cats
      .filter((c) => c.parentId === null && foodDeptIds.has(c.departmentId))
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, "sv"));
  }, [catalogQuery.data?.categories, foodDeptIds]);

  useEffect(() => {
    if (departmentId === ALL_DEPARTMENTS) {
      return;
    }
    if (!foodDeptIds.has(departmentId)) {
      setDepartmentId(ALL_DEPARTMENTS);
    }
  }, [departmentId, foodDeptIds]);

  const promoWatchlistSet = useMemo(
    () => new Set(watchlistQuery.data ?? []),
    [watchlistQuery.data],
  );

  const filteredPickerItems = useMemo(() => {
    const items = catalogQuery.data?.items ?? [];
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (!foodDeptIds.has(it.departmentId)) {
        return false;
      }
      if (departmentId !== ALL_DEPARTMENTS && it.departmentId !== departmentId) {
        return false;
      }
      if (ingredientsFavoritesOnly) {
        if (watchlistQuery.isLoading) {
          return false;
        }
        if (!promoWatchlistSet.has(it.watchlistText.trim())) {
          return false;
        }
      }
      if (!q) {
        return true;
      }
      return (
        it.name.toLowerCase().includes(q) || it.watchlistText.toLowerCase().includes(q)
      );
    });
  }, [
    catalogQuery.data?.items,
    departmentId,
    search,
    foodDeptIds,
    ingredientsFavoritesOnly,
    watchlistQuery.isLoading,
    promoWatchlistSet,
  ]);

  async function togglePromoWatchlistItem(entry: PromoPickerItem) {
    const text = entry.watchlistText.trim();
    if (!text) {
      return;
    }
    setLocalError(null);
    const current = watchlistQuery.data ?? [];
    try {
      if (current.includes(text)) {
        await watchlistMutation.mutateAsync(current.filter((t) => t !== text));
      } else {
        if (current.length >= MAX_PROMO_WATCHLIST_ITEMS) {
          setLocalError(`Watchlist is full (max ${MAX_PROMO_WATCHLIST_ITEMS} items).`);
          return;
        }
        await watchlistMutation.mutateAsync([...current, text]);
      }
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Watchlist update failed");
    }
  }

  const labelByFoodTypeId = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of foodTypesQuery.data?.options ?? []) {
      m.set(o.id, o.label);
    }
    return m;
  }, [foodTypesQuery.data?.options]);

  const filteredSavedRecipes = useMemo(() => {
    const list = savedQuery.data ?? [];
    if (libraryTypeFilter === ALL_LIBRARY_TYPES) {
      return list;
    }
    return list.filter((r) => r.food_type_id === libraryTypeFilter);
  }, [savedQuery.data, libraryTypeFilter]);

  const savedCountByFoodTypeId = useMemo(
    () => countRecipesByFoodTypeId(savedQuery.data ?? []),
    [savedQuery.data],
  );

  const selectedStyleSavedCount = foodTypeId
    ? (savedCountByFoodTypeId.get(foodTypeId) ?? 0)
    : null;

  const totalSavedCount = savedQuery.data?.length ?? 0;

  const busy =
    catalogQuery.isLoading ||
    foodTypesQuery.isLoading ||
    generateMutation.isPending ||
    saveMutation.isPending;

  function addPick(entry: PromoPickerItem) {
    const text = entry.watchlistText.trim();
    if (!text || picks.includes(text)) {
      return;
    }
    if (picks.length >= MAX_INGREDIENT_PICKS) {
      setLocalError(`Max ${MAX_INGREDIENT_PICKS} ingredients.`);
      return;
    }
    setLocalError(null);
    setPicks((prev) => [...prev, text]);
  }

  function removePick(index: number) {
    setPicks((prev) => prev.filter((_, i) => i !== index));
  }

  function fillExcludeFromLast() {
    if (lastMeals.length === 0) {
      return;
    }
    const lines = lastMeals.map((m) => m.title.trim()).filter(Boolean);
    setExcludeText(lines.join("\n"));
  }

  async function onGenerate(event: FormEvent) {
    event.preventDefault();
    setLocalError(null);
    if (picks.length === 0) {
      setLocalError("Add at least one ingredient from the catalog.");
      return;
    }
    if (!foodTypeId) {
      setLocalError("Choose a type of food.");
      return;
    }
    await generateMutation.mutateAsync();
  }

  const error =
    localError ??
    (catalogQuery.error instanceof Error ? catalogQuery.error.message : null) ??
    (foodTypesQuery.error instanceof Error ? foodTypesQuery.error.message : null) ??
    (savedQuery.error instanceof Error ? savedQuery.error.message : null) ??
    (watchlistQuery.error instanceof Error ? watchlistQuery.error.message : null) ??
    (watchlistMutation.error instanceof Error ? watchlistMutation.error.message : null) ??
    (generateMutation.error instanceof Error ? generateMutation.error.message : null) ??
    (saveMutation.error instanceof Error ? saveMutation.error.message : null) ??
    (savedRecipePatchMutation.error instanceof Error
      ? savedRecipePatchMutation.error.message
      : null);

  return (
    <main className="mx-auto w-full max-w-7xl space-y-4 px-4 py-6">
      <Tabs defaultValue="generate" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 items-stretch gap-1 rounded-lg bg-muted p-1 group-data-[orientation=horizontal]/tabs:!h-auto group-data-[orientation=horizontal]/tabs:min-h-11 sm:w-full">
          <TabsTrigger
            value="generate"
            className="!h-auto min-h-11 justify-center py-2.5 whitespace-normal shadow-none data-[state=active]:shadow-none"
          >
            Generate
          </TabsTrigger>
          <TabsTrigger
            value="library"
            className="!h-auto min-h-11 justify-center py-2.5 whitespace-normal shadow-none data-[state=active]:shadow-none"
          >
            Library
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recipe generator</CardTitle>
              <CardDescription>
                Pick ICA Maxi ingredients, choose a food style, optionally exclude previous titles,
                then generate Swedish recipe ideas.
              </CardDescription>
            </CardHeader>
          </Card>

          <form className="space-y-6" onSubmit={onGenerate}>
            <Card>
              <CardHeader>
                <CardTitle>Ingredients (ICA catalog)</CardTitle>
                <CardDescription>
                  Food departments only (same ICA catalog as the promo watchlist, filtered).
                  Stars add or remove items on your{" "}
                  <Link
                    href="/promo-grocery-watchlist"
                    className="font-semibold text-foreground underline-offset-4 hover:underline"
                  >
                    promo grocery watchlist
                  </Link>{" "}
                  (same list). Max {MAX_INGREDIENT_PICKS} picks.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {catalogQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading catalog…</p>
                ) : null}
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start">
                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground" id="dept-r">
                      Food department
                    </span>
                    <Select
                      value={departmentId}
                      onValueChange={setDepartmentId}
                      disabled={!catalogQuery.data}
                    >
                      <SelectTrigger
                        className="h-9 w-full min-w-[12rem] sm:w-64"
                        aria-labelledby="dept-r"
                      >
                        <SelectValue placeholder="All food departments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_DEPARTMENTS}>All food departments</SelectItem>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground" id="search-r">
                      Search catalog
                    </span>
                    <Input
                      aria-labelledby="search-r"
                      placeholder="Filter…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      disabled={!catalogQuery.data}
                    />
                  </div>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 shrink-0"
                    checked={ingredientsFavoritesOnly}
                    onChange={(e) => setIngredientsFavoritesOnly(e.target.checked)}
                    disabled={!catalogQuery.data || watchlistQuery.isLoading}
                  />
                  <span>Watchlist only (promo grocery watchlist)</span>
                </label>
                <div className="max-h-56 overflow-y-auto rounded-md border p-2">
                  {filteredPickerItems.length === 0 ? (
                    <p className="px-2 py-4 text-center text-sm italic text-muted-foreground">
                      {watchlistQuery.isLoading
                        ? "Loading watchlist…"
                        : ingredientsFavoritesOnly && (watchlistQuery.data?.length ?? 0) === 0
                          ? "Your promo watchlist is empty. Star catalog items to add them (or manage them on Promo grocery watchlist)."
                          : ingredientsFavoritesOnly && (watchlistQuery.data?.length ?? 0) > 0
                            ? "No watchlist items match this department or search."
                            : "No matches."}
                    </p>
                  ) : (
                    <ul className="flex flex-wrap gap-2" role="list">
                      {filteredPickerItems.map((it) => {
                        const isOnWatchlist = promoWatchlistSet.has(it.watchlistText.trim());
                        return (
                          <li
                            key={it.id}
                            className="flex max-w-full items-center gap-1 rounded-md border border-transparent p-0.5"
                          >
                            <button
                              type="button"
                              className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                              aria-label={
                                isOnWatchlist
                                  ? `Remove “${it.watchlistText}” from promo watchlist`
                                  : `Add “${it.watchlistText}” to promo watchlist`
                              }
                              aria-pressed={isOnWatchlist}
                              disabled={watchlistMutation.isPending}
                              onClick={() => void togglePromoWatchlistItem(it)}
                            >
                              <Star
                                className={
                                  isOnWatchlist
                                    ? "size-4 fill-amber-400 text-amber-600 dark:fill-amber-500/90 dark:text-amber-300"
                                    : "size-4"
                                }
                              />
                            </button>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="h-auto min-w-0 max-w-full flex-1 whitespace-normal text-left"
                              disabled={busy || picks.includes(it.watchlistText.trim())}
                              onClick={() => addPick(it)}
                            >
                              {it.watchlistText}
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                {picks.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Selected</p>
                    <ul className="flex flex-wrap gap-2">
                      {picks.map((p, i) => (
                        <li key={`${p}-${i}`}>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-auto max-w-full whitespace-normal text-left"
                            disabled={busy}
                            onClick={() => removePick(i)}
                          >
                            {p} ✕
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm italic text-muted-foreground">No ingredients selected yet.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Style & filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground" id="ft-r">
                    Type of food
                  </span>
                  <Select
                    value={foodTypeId || undefined}
                    onValueChange={setFoodTypeId}
                    disabled={!foodTypesQuery.data}
                  >
                    <SelectTrigger className="w-full sm:max-w-md" aria-labelledby="ft-r">
                      <SelectValue placeholder="Choose…" />
                    </SelectTrigger>
                    <SelectContent>
                      {(foodTypesQuery.data?.options ?? []).map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {foodTypeId ? (
                    <p className="text-sm text-muted-foreground">
                      {savedQuery.isLoading ? (
                        "Loading saved counts…"
                      ) : (
                        <>
                          You have{" "}
                          <span className="font-medium tabular-nums text-foreground">
                            {selectedStyleSavedCount ?? 0}
                          </span>{" "}
                          saved in this style (target {recipeStyleTargetRangeLabel()}).
                        </>
                      )}
                    </p>
                  ) : null}
                </div>
                <label className="flex cursor-pointer items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 shrink-0"
                    checked={vegetarian}
                    onChange={(e) => setVegetarian(e.target.checked)}
                    disabled={busy}
                  />
                  <span>Vegetarian (no meat, fish, or shellfish)</span>
                </label>
                <div className="space-y-1.5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-xs font-medium text-muted-foreground" id="ex-r">
                      Exclude meal titles (one per line)
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy || lastMeals.length === 0}
                      onClick={() => fillExcludeFromLast()}
                    >
                      Use titles from last result
                    </Button>
                  </div>
                  <Textarea
                    id="ex-r"
                    value={excludeText}
                    onChange={(e) => setExcludeText(e.target.value)}
                    placeholder="e.g. Kyckling parmigiana"
                    rows={4}
                    disabled={busy}
                  />
                </div>
                <Button type="submit" disabled={busy} className="min-h-11">
                  {generateMutation.isPending ? "Generating…" : "Generate"}
                </Button>
              </CardContent>
            </Card>
          </form>

          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          ) : null}

          {generateResult ? (
            <div className="space-y-4">
              {generateResult.intro ? (
                <p className="text-sm text-muted-foreground">{generateResult.intro}</p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Source:{" "}
                {lastMeta?.recipe_source_label ?? RECIPE_GENERATOR_SOURCE_LABEL}
                {lastMeta?.recipe_model ? (
                  <span className="text-muted-foreground/80"> ({lastMeta.recipe_model})</span>
                ) : null}
              </p>
              {generateResult.meals.map((meal, mi) => (
                <Card key={`${meal.title}-${mi}`}>
                  <CardHeader>
                    <CardTitle className="text-lg">{meal.title}</CardTitle>
                    {meal.title_en || meal.title_vi ? (
                      <div className="space-y-0.5 pt-1 text-sm text-muted-foreground">
                        {meal.title_en ? <p>EN · {meal.title_en}</p> : null}
                        {meal.title_vi ? <p>VI · {meal.title_vi}</p> : null}
                      </div>
                    ) : null}
                    <CardDescription>{meal.summary}</CardDescription>
                    {meal.estimated_cook_time ? (
                      <p className="pt-1 text-sm text-muted-foreground">
                        Est. cook time: {meal.estimated_cook_time}
                      </p>
                    ) : null}
                  </CardHeader>
                  <CardContent className="space-y-4">
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
                          {meal.ingredients.map((row, i) => (
                            <tr key={`${meal.title}-ing-${i}`} className="border-b last:border-0">
                              <td className="px-3 py-2 align-top">{row.ingredient_label}</td>
                              <td className="px-3 py-2 align-top">{row.amount}</td>
                              <td className="px-3 py-2 align-top">{row.text}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-medium text-muted-foreground">Steps</p>
                      <ol className="list-decimal space-y-1 pl-5 text-sm">
                        {meal.steps.map((s, i) => (
                          <li key={`${meal.title}-st-${i}`}>{s}</li>
                        ))}
                      </ol>
                    </div>
                    <Button
                      type="button"
                      disabled={busy || saveMutation.isPending || !lastMeta}
                      onClick={() => void saveMutation.mutateAsync(meal)}
                    >
                      Add to library
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="library" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Saved recipes</CardTitle>
              <CardDescription>
                Filter by type, open <strong>View</strong> for full recipe details. Mark{" "}
                <strong>Want to try</strong> for your backlog and <strong>Tested</strong> when you
                have cooked it at home. Aim for about{" "}
                <strong>
                  {RECIPE_STYLE_TARGET_MIN}–{RECIPE_STYLE_TARGET_MAX}
                </strong>{" "}
                saved recipes per style for a solid rotation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {savedQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : null}
              {!savedQuery.isLoading && foodTypesQuery.data ? (
                <div className="rounded-md border bg-muted/40 p-3">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    Progress per style (target {recipeStyleTargetRangeLabel()} each)
                  </p>
                  <p className="mb-2 text-[11px] leading-snug text-muted-foreground/90">
                    Row tint: 0 · &lt;10 · &lt;20 · &lt;30 · 30–39 · 40+
                  </p>
                  <div className="max-h-52 overflow-y-auto rounded-sm border border-border/60 bg-background">
                    <table className="w-full min-w-[16rem] border-collapse text-sm">
                      <caption className="sr-only">Saved recipe counts by food style</caption>
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-3 py-1.5 text-left font-medium">Style</th>
                          <th className="px-3 py-1.5 text-right font-medium">Saved</th>
                          <th className="px-3 py-1.5 text-right font-medium text-muted-foreground">
                            Target
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(foodTypesQuery.data.options ?? []).map((o) => {
                          const c = savedCountByFoodTypeId.get(o.id) ?? 0;
                          const band = recipeStyleProgressBand(c);
                          const activeRow =
                            libraryTypeFilter !== ALL_LIBRARY_TYPES && libraryTypeFilter === o.id;
                          const bandRow =
                            band === "zero"
                              ? "border-b border-slate-200/80 bg-slate-100/90 dark:border-slate-800 dark:bg-slate-900/55"
                              : band === "lt10"
                                ? "border-b border-rose-200/80 bg-rose-50/95 dark:border-rose-900/50 dark:bg-rose-950/40"
                                : band === "lt20"
                                  ? "border-b border-orange-200/80 bg-orange-50/95 dark:border-orange-900/45 dark:bg-orange-950/35"
                                  : band === "lt30"
                                    ? "border-b border-amber-200/80 bg-amber-50/95 dark:border-amber-900/45 dark:bg-amber-950/35"
                                    : band === "lt40"
                                      ? "border-b border-lime-200/80 bg-lime-50/90 dark:border-lime-900/45 dark:bg-lime-950/35"
                                      : "border-b border-emerald-200/80 bg-emerald-100/90 dark:border-emerald-900/50 dark:bg-emerald-950/40";
                          return (
                            <tr
                              key={o.id}
                              className={
                                activeRow
                                  ? `${bandRow} ring-2 ring-inset ring-emerald-600/45 dark:ring-emerald-400/40`
                                  : `${bandRow} last:border-0`
                              }
                            >
                              <td className="px-3 py-1.5">{o.label}</td>
                              <td
                                className={
                                  band === "ge40" || band === "lt40"
                                    ? "px-3 py-1.5 text-right tabular-nums font-medium text-emerald-900 dark:text-emerald-200"
                                    : "px-3 py-1.5 text-right tabular-nums text-foreground"
                                }
                              >
                                {c}
                              </td>
                              <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                                {RECIPE_STYLE_TARGET_MIN}–{RECIPE_STYLE_TARGET_MAX}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
              {!savedQuery.isLoading && totalSavedCount === 0 ? (
                <p className="text-sm italic text-muted-foreground">No saved recipes yet.</p>
              ) : null}
              {!savedQuery.isLoading && totalSavedCount > 0 ? (
                <>
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground tabular-nums">
                        {totalSavedCount}
                      </span>{" "}
                      saved {totalSavedCount === 1 ? "recipe" : "recipes"} total
                      {libraryTypeFilter !== ALL_LIBRARY_TYPES ? (
                        <>
                          {" "}
                          · Showing{" "}
                          <span className="font-medium text-foreground tabular-nums">
                            {filteredSavedRecipes.length}
                          </span>{" "}
                          {filteredSavedRecipes.length === 1 ? "match" : "matches"} (target{" "}
                          {recipeStyleTargetRangeLabel()} for this style)
                        </>
                      ) : null}
                    </p>
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                      <div className="space-y-1.5">
                        <span className="text-xs font-medium text-muted-foreground" id="lib-ft">
                          Type filter
                        </span>
                        <Select
                          value={libraryTypeFilter}
                          onValueChange={setLibraryTypeFilter}
                          disabled={!foodTypesQuery.data}
                        >
                          <SelectTrigger
                            className="w-full min-w-[12rem] sm:w-64"
                            aria-labelledby="lib-ft"
                          >
                            <SelectValue placeholder="All types" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={ALL_LIBRARY_TYPES}>All types</SelectItem>
                            {(foodTypesQuery.data?.options ?? []).map((o) => (
                              <SelectItem key={o.id} value={o.id}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  {!savedQuery.isLoading &&
                  totalSavedCount > 0 &&
                  filteredSavedRecipes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No recipes match this type. Choose <strong>All types</strong> or another
                      option.
                    </p>
                  ) : null}
                  {filteredSavedRecipes.length > 0 ? (
                    <div className="overflow-x-auto rounded-lg border border-emerald-200/80 bg-emerald-50/70 shadow-sm dark:border-emerald-900/45 dark:bg-emerald-950/30">
                      <table className="w-full min-w-[58rem] border-collapse text-sm">
                        <caption className="sr-only">Saved recipes</caption>
                        <thead>
                          <tr className="border-b border-emerald-200/60 bg-emerald-100/50 dark:border-emerald-900/50 dark:bg-emerald-950/40">
                            <th className="px-3 py-2 text-left font-medium">#</th>
                            <th className="px-3 py-2 text-left font-medium">Title</th>
                            <th className="px-3 py-2 text-left font-medium">Type</th>
                            <th className="px-3 py-2 text-left font-medium">Source</th>
                            <th className="px-3 py-2 text-left font-medium">Est. cook time</th>
                            <th className="px-3 py-2 text-left font-medium">Vegetarian</th>
                            <th className="px-3 py-2 text-center font-medium">Want to try</th>
                            <th className="px-3 py-2 text-center font-medium">Tested</th>
                            <th className="px-3 py-2 text-right font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSavedRecipes.map((r, idx) => (
                            <tr key={r.id} className="border-b border-emerald-200/40 last:border-0 dark:border-emerald-900/35">
                              <td className="px-3 py-2 tabular-nums text-muted-foreground">
                                {idx + 1}
                              </td>
                              <td className="px-3 py-2">
                                <div className="font-medium leading-snug">{r.title}</div>
                                {r.title_en || r.title_vi ? (
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    {r.title_en ? <span>EN: {r.title_en}</span> : null}
                                    {r.title_en && r.title_vi ? " · " : null}
                                    {r.title_vi ? <span>VI: {r.title_vi}</span> : null}
                                  </div>
                                ) : null}
                              </td>
                              <td className="px-3 py-2">
                                {labelByFoodTypeId.get(r.food_type_id) ?? r.food_type_id}
                              </td>
                              <td
                                className="max-w-[9rem] truncate text-muted-foreground"
                                title={formatSavedRecipeSourceLabel(r.source)}
                              >
                                {formatSavedRecipeSourceLabel(r.source)}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">
                                {r.estimated_cook_time.trim() ? r.estimated_cook_time : "—"}
                              </td>
                              <td className="px-3 py-2">{r.vegetarian ? "Yes" : "No"}</td>
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="checkbox"
                                  className="size-4"
                                  checked={r.want_to_try}
                                  disabled={savedRecipePatchMutation.isPending}
                                  onChange={(e) =>
                                    void savedRecipePatchMutation.mutateAsync({
                                      id: r.id,
                                      want_to_try: e.target.checked,
                                    })
                                  }
                                  aria-label={`Want to try ${r.title}`}
                                />
                              </td>
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="checkbox"
                                  className="size-4"
                                  checked={r.tested}
                                  disabled={savedRecipePatchMutation.isPending}
                                  onChange={(e) =>
                                    void savedRecipePatchMutation.mutateAsync({
                                      id: r.id,
                                      tested: e.target.checked,
                                    })
                                  }
                                  aria-label={`Tested ${r.title}`}
                                />
                              </td>
                              <td className="px-3 py-2 text-right">
                                <div className="flex flex-wrap justify-end gap-1">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setRecipeEditMode(false);
                                      setEditDraft(null);
                                      setEditStepsText("");
                                      setDetailRecipe(r);
                                    }}
                                  >
                                    View
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={deleteMutation.isPending}
                                    onClick={() => {
                                      if (window.confirm(`Remove “${r.title}” from the library?`)) {
                                        void deleteMutation.mutateAsync(r.id);
                                      }
                                    }}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </>
              ) : null}
            </CardContent>
          </Card>

          <Dialog
            open={detailRecipe !== null}
            onOpenChange={(open) => {
              if (!open) {
                setDetailRecipe(null);
                setRecipeEditMode(false);
                setEditDraft(null);
                setEditStepsText("");
              }
            }}
          >
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              {detailRecipe ? (
                <>
                  <DialogHeader>
                    <DialogTitle className="pr-8 text-left">
                      {recipeEditMode ? "Edit recipe" : detailRecipe.title}
                    </DialogTitle>
                    {!recipeEditMode && (detailRecipe.title_en || detailRecipe.title_vi) ? (
                      <div className="text-left text-sm text-muted-foreground">
                        {detailRecipe.title_en ? <p>EN · {detailRecipe.title_en}</p> : null}
                        {detailRecipe.title_vi ? <p>VI · {detailRecipe.title_vi}</p> : null}
                      </div>
                    ) : null}
                    {!recipeEditMode ? (
                      <DialogDescription className="text-left">
                        {detailRecipe.summary}
                      </DialogDescription>
                    ) : null}
                  </DialogHeader>
                  {recipeEditMode && editDraft ? (
                    <div className="space-y-4 text-sm">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRecipeEditMode(false);
                            setEditDraft(null);
                            setEditStepsText("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-xs font-medium text-muted-foreground">
                          Title (Swedish)
                        </span>
                        <Input
                          value={editDraft.title}
                          onChange={(e) =>
                            setEditDraft((d) => (d ? { ...d, title: e.target.value } : d))
                          }
                          maxLength={200}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-xs font-medium text-muted-foreground">
                          Title (English)
                        </span>
                        <Input
                          value={editDraft.title_en}
                          onChange={(e) =>
                            setEditDraft((d) => (d ? { ...d, title_en: e.target.value } : d))
                          }
                          maxLength={200}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-xs font-medium text-muted-foreground">
                          Title (Vietnamese)
                        </span>
                        <Input
                          value={editDraft.title_vi}
                          onChange={(e) =>
                            setEditDraft((d) => (d ? { ...d, title_vi: e.target.value } : d))
                          }
                          maxLength={200}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-xs font-medium text-muted-foreground">Summary</span>
                        <Textarea
                          value={editDraft.summary}
                          onChange={(e) =>
                            setEditDraft((d) => (d ? { ...d, summary: e.target.value } : d))
                          }
                          rows={4}
                          maxLength={2000}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-xs font-medium text-muted-foreground">Meal kind</span>
                        <Select
                          value={editDraft.meal_kind}
                          onValueChange={(v) =>
                            setEditDraft((d) => (d ? { ...d, meal_kind: v } : d))
                          }
                        >
                          <SelectTrigger className="h-9 w-full max-w-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MEAL_KIND_OPTIONS.map((k) => (
                              <SelectItem key={k} value={k}>
                                {k}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-medium text-muted-foreground">Ingredients</p>
                        <div className="space-y-2">
                          {editDraft.ingredients.map((row, i) => (
                            <div
                              key={`ed-ing-${i}`}
                              className="grid gap-2 sm:grid-cols-[1fr_1fr_2fr_auto]"
                            >
                              <Input
                                placeholder="Label"
                                value={row.ingredient_label}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setEditDraft((d) => {
                                    if (!d) {
                                      return d;
                                    }
                                    const next = [...d.ingredients];
                                    next[i] = { ...next[i], ingredient_label: v };
                                    return { ...d, ingredients: next };
                                  });
                                }}
                              />
                              <Input
                                placeholder="Amount"
                                value={row.amount}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setEditDraft((d) => {
                                    if (!d) {
                                      return d;
                                    }
                                    const next = [...d.ingredients];
                                    next[i] = { ...next[i], amount: v };
                                    return { ...d, ingredients: next };
                                  });
                                }}
                              />
                              <Input
                                placeholder="Text"
                                value={row.text}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setEditDraft((d) => {
                                    if (!d) {
                                      return d;
                                    }
                                    const next = [...d.ingredients];
                                    next[i] = { ...next[i], text: v };
                                    return { ...d, ingredients: next };
                                  });
                                }}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="shrink-0"
                                onClick={() =>
                                  setEditDraft((d) => {
                                    if (!d) {
                                      return d;
                                    }
                                    return {
                                      ...d,
                                      ingredients: d.ingredients.filter((_, j) => j !== i),
                                    };
                                  })
                                }
                              >
                                Remove
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setEditDraft((d) =>
                                d
                                  ? {
                                      ...d,
                                      ingredients: [
                                        ...d.ingredients,
                                        {
                                          ingredient_label: "",
                                          amount: "",
                                          text: "",
                                        },
                                      ],
                                    }
                                  : d,
                              )
                            }
                          >
                            Add row
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-xs font-medium text-muted-foreground">Steps</span>
                        <p className="text-xs text-muted-foreground">One step per line.</p>
                        <Textarea
                          value={editStepsText}
                          onChange={(e) => setEditStepsText(e.target.value)}
                          rows={10}
                          className="font-mono text-sm"
                        />
                      </div>
                      <Button
                        type="button"
                        disabled={savedRecipePatchMutation.isPending}
                        onClick={() => {
                          if (!detailRecipe || !editDraft) {
                            return;
                          }
                          const steps = editStepsText
                            .split("\n")
                            .map((s) => s.trim())
                            .filter(Boolean);
                          const ingredients = editDraft.ingredients.filter(
                            (row) =>
                              row.ingredient_label.trim() &&
                              row.amount.trim() &&
                              row.text.trim(),
                          );
                          if (!editDraft.title.trim()) {
                            setLocalError("Swedish title is required.");
                            return;
                          }
                          if (ingredients.length === 0) {
                            setLocalError("Add at least one complete ingredient row.");
                            return;
                          }
                          if (steps.length === 0) {
                            setLocalError("Add at least one step (one per line).");
                            return;
                          }
                          setLocalError(null);
                          void savedRecipePatchMutation
                            .mutateAsync({
                              id: detailRecipe.id,
                              title: editDraft.title.trim(),
                              title_en: editDraft.title_en.trim(),
                              title_vi: editDraft.title_vi.trim(),
                              summary: editDraft.summary.trim(),
                              meal_kind: editDraft.meal_kind,
                              ingredients,
                              steps,
                            })
                            .then(() => {
                              setRecipeEditMode(false);
                              setEditDraft(null);
                              setEditStepsText("");
                            });
                        }}
                      >
                        {savedRecipePatchMutation.isPending ? "Saving…" : "Save changes"}
                      </Button>
                    </div>
                  ) : (
                  <div className="space-y-4 text-sm">
                    <dl className="grid gap-2 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <dt className="text-xs font-medium text-muted-foreground">Source</dt>
                        <dd>{formatSavedRecipeSourceLabel(detailRecipe.source)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-muted-foreground">Type of food</dt>
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
                        <dt className="text-xs font-medium text-muted-foreground">Vegetarian</dt>
                        <dd>{detailRecipe.vegetarian ? "Yes" : "No"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-muted-foreground">Saved</dt>
                        <dd>{formatSavedAt(detailRecipe.created_at)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-muted-foreground">Want to try</dt>
                        <dd>{detailRecipe.want_to_try ? "Yes" : "No"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-muted-foreground">Tested</dt>
                        <dd>{detailRecipe.tested ? "Yes" : "No"}</dd>
                      </div>
                    </dl>
                    <div className="space-y-1.5">
                      <span className="text-xs font-medium text-muted-foreground" id="dlg-cook">
                        Est. cook time
                      </span>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Input
                          id="dlg-cook"
                          value={cookTimeDraft}
                          onChange={(e) => setCookTimeDraft(e.target.value)}
                          placeholder="e.g. ca 35 min"
                          disabled={savedRecipePatchMutation.isPending}
                          maxLength={120}
                          className="sm:max-w-xs"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={
                            savedRecipePatchMutation.isPending ||
                            cookTimeDraft.trim() === detailRecipe.estimated_cook_time.trim()
                          }
                          onClick={() =>
                            void savedRecipePatchMutation.mutateAsync({
                              id: detailRecipe.id,
                              estimated_cook_time: cookTimeDraft,
                            })
                          }
                        >
                          Save time
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-xs font-medium text-muted-foreground" id="dlg-sim">
                        Similar recipe (optional)
                      </span>
                      <p className="text-xs text-muted-foreground">
                        If this is probably similar to a published recipe, paste its page URL.
                      </p>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Input
                          id="dlg-sim"
                          type="url"
                          inputMode="url"
                          value={similarUrlDraft}
                          onChange={(e) => setSimilarUrlDraft(e.target.value)}
                          placeholder="https://…"
                          disabled={savedRecipePatchMutation.isPending}
                          maxLength={2000}
                          className="min-w-0 sm:min-w-[18rem] sm:flex-1"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={
                            savedRecipePatchMutation.isPending ||
                            similarUrlDraft.trim() === detailRecipe.similar_recipe_url.trim()
                          }
                          onClick={() =>
                            void savedRecipePatchMutation.mutateAsync({
                              id: detailRecipe.id,
                              similar_recipe_url: similarUrlDraft,
                            })
                          }
                        >
                          Save link
                        </Button>
                      </div>
                      {detailRecipe.similar_recipe_url.trim() ? (
                        <p className="text-xs">
                          <a
                            className="text-primary underline underline-offset-4"
                            href={detailRecipe.similar_recipe_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Open saved link
                          </a>
                        </p>
                      ) : null}
                    </div>
                    {detailRecipe.ingredient_picks.length > 0 ? (
                      <div>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">
                          Ingredient picks (ICA)
                        </p>
                        <ul className="list-inside list-disc text-muted-foreground">
                          {detailRecipe.ingredient_picks.map((p) => (
                            <li key={p}>{p}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
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
                            {detailRecipe.ingredients.map((row, i) => (
                              <tr
                                key={`${detailRecipe.id}-ing-${i}`}
                                className="border-b last:border-0"
                              >
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
                      <ol className="list-decimal space-y-1 pl-5">
                        {detailRecipe.steps.map((s, i) => (
                          <li key={`${detailRecipe.id}-st-${i}`}>{s}</li>
                        ))}
                      </ol>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full sm:w-auto"
                      onClick={() => {
                        setEditDraft(savedRowToEditDraft(detailRecipe));
                        setEditStepsText(detailRecipe.steps.join("\n"));
                        setRecipeEditMode(true);
                      }}
                    >
                      Edit recipe
                    </Button>
                  </div>
                  )}
                </>
              ) : null}
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </main>
  );
}
