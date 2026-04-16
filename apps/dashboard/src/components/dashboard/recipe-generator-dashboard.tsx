"use client";

import {
  RECIPE_GENERATOR_SOURCE_LABEL,
  type RecipeGenerateResult,
  type RecipeGeneratorMeal,
} from "@agent/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, FileInput, Pencil, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRecipeLocale } from "@/components/dashboard/recipe-locale-provider";
import { ImportRecipeFromSourcePage } from "@/components/dashboard/import-recipe-from-source-page";
import { RecipeLanguageToolbar } from "@/components/dashboard/recipe-language-toolbar";
import { RecipeStepsDisplay } from "@/components/dashboard/recipe-steps-display";
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
import { PlanToCookDashboard } from "@/components/dashboard/plan-to-cook-dashboard";
import {
  getRecipeDisplayFields,
  getRecipeDisplayTitle,
  type SavedRecipeWithI18n,
} from "@/lib/recipe-locale";
import type { SavedRecipeRow } from "@/lib/saved-recipe-row";
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
import { parseMarkdownRecipeMarkdown } from "@/lib/markdown-recipe-parse";
import { formatSavedRecipeSourceLabel } from "@/lib/recipe-source";
import { cn } from "@/lib/utils";
import type { PromoPickerCatalog, PromoPickerItem } from "@/types/promo-picker-catalog";

const ALL_DEPARTMENTS = "__all__";
const ALL_LIBRARY_TYPES = "__all__";
/** Library filter: all rows vs tested=true only */
const ALL_LIBRARY_TESTED = "__all__";
const LIBRARY_TESTED_ONLY = "tested_only";

/** Import tab: filter by whether `source_markdown` is stored (default: rows still needing a source paste). */
const ALL_IMPORT_SOURCE = "__all__";
const IMPORT_SOURCE_WITHOUT_MARKDOWN = "without_source";
const IMPORT_SOURCE_WITH_MARKDOWN_ONLY = "with_source";

const IMPORT_RECIPE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Placeholder until the user pastes steps from a trusted source in the editor. */
const SUGGESTION_ONLY_STEPS = [
  "Tillagning saknas än — öppna Redigera recept och klistra in text från en källa du litar på.",
];

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
  const [libraryTestedFilter, setLibraryTestedFilter] = useState<string>(ALL_LIBRARY_TESTED);
  const [importSourceMarkdownFilter, setImportSourceMarkdownFilter] = useState<string>(
    IMPORT_SOURCE_WITHOUT_MARKDOWN,
  );
  const [ingredientsFavoritesOnly, setIngredientsFavoritesOnly] = useState(false);
  const [detailRecipe, setDetailRecipe] = useState<SavedRecipeRow | null>(null);
  const [fulfillMeal, setFulfillMeal] = useState<RecipeGeneratorMeal | null>(null);
  const [fulfillMarkdown, setFulfillMarkdown] = useState("");
  const [fulfillOriginalUrl, setFulfillOriginalUrl] = useState("");

  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useRecipeLocale();
  const appliedPickFromUrl = useRef(false);

  const recipeReadDisplay = useMemo(
    () =>
      detailRecipe
        ? getRecipeDisplayFields(detailRecipe as SavedRecipeWithI18n, locale)
        : null,
    [detailRecipe, locale],
  );

  const activeRecipeTab = useMemo(() => {
    const t = searchParams.get("tab");
    if (t === "library" || t === "plan" || t === "generate" || t === "import") {
      return t;
    }
    return "generate";
  }, [searchParams]);

  const importRecipeParamRaw = searchParams.get("importRecipe")?.trim() ?? "";
  const importRecipeSelectedId = useMemo(
    () => (IMPORT_RECIPE_UUID_RE.test(importRecipeParamRaw) ? importRecipeParamRaw : null),
    [importRecipeParamRaw],
  );

  useEffect(() => {
    if (activeRecipeTab !== "import") {
      return;
    }
    const raw = searchParams.get("importRecipe")?.trim() ?? "";
    if (raw && !IMPORT_RECIPE_UUID_RE.test(raw)) {
      const next = new URLSearchParams(searchParams.toString());
      next.delete("importRecipe");
      const q = next.toString();
      router.replace(q ? `/recipe-generator?${q}` : "/recipe-generator?tab=import", { scroll: false });
    }
  }, [activeRecipeTab, router, searchParams]);

  useEffect(() => {
    if (appliedPickFromUrl.current) {
      return;
    }
    const pick = searchParams.get("pick")?.trim();
    if (!pick) {
      return;
    }
    appliedPickFromUrl.current = true;
    const paramsSnapshot = searchParams.toString();
    queueMicrotask(() => {
      setPicks((prev) => {
        if (prev.includes(pick)) {
          return prev;
        }
        if (prev.length >= MAX_INGREDIENT_PICKS) {
          return prev;
        }
        return [...prev, pick];
      });
      const next = new URLSearchParams(paramsSnapshot);
      next.delete("pick");
      const q = next.toString();
      router.replace(q ? `/recipe-generator?${q}` : "/recipe-generator", { scroll: false });
    });
  }, [router, searchParams]);

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
    mutationFn: async (input: {
      meal: RecipeGeneratorMeal;
      markdown?: string;
      originalRecipeUrl?: string;
    }) => {
      if (!lastMeta) {
        throw new Error("Missing generation context");
      }
      const { meal, markdown, originalRecipeUrl } = input;
      const trimmed = markdown?.trim() ?? "";
      let summary = meal.summary;
      let steps: string[];
      let source_markdown: string | null = null;

      if (trimmed) {
        const parsed = parseMarkdownRecipeMarkdown(trimmed);
        if (parsed.steps.length === 0) {
          throw new Error(
            "Could not extract steps from the pasted text. Use numbered lines (1. … 2. …) or a ## Tillagning / ## Instructions section.",
          );
        }
        summary = parsed.summary || meal.summary;
        steps = parsed.steps;
        source_markdown = trimmed;
      } else {
        steps = meal.steps.length > 0 ? meal.steps : SUGGESTION_ONLY_STEPS;
      }

      const response = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: meal.title,
          title_en: meal.title_en,
          title_vi: meal.title_vi,
          summary,
          meal_kind: meal.meal_kind,
          ingredients: meal.ingredients,
          steps,
          food_type_id: lastMeta.food_type_id,
          vegetarian: lastMeta.vegetarian,
          ingredient_picks: picks,
          estimated_cook_time: meal.estimated_cook_time,
          source_markdown,
          similar_recipe_url: (originalRecipeUrl ?? "").trim(),
        }),
      });
      if (!response.ok) {
        await throwApiError(response, "Save failed");
      }
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["saved-recipes"] });
      setFulfillMeal(null);
      setFulfillMarkdown("");
      setFulfillOriginalUrl("");
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
      easy_to_follow?: boolean | null;
      enjoy_rating?: number | null;
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
      if (rest.easy_to_follow !== undefined) {
        body.easy_to_follow = rest.easy_to_follow;
      }
      if (rest.enjoy_rating !== undefined) {
        body.enjoy_rating = rest.enjoy_rating;
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

  const forkRecipeMutation = useMutation({
    mutationFn: async (recipeId: string) => {
      const response = await fetch(`/api/recipes/${encodeURIComponent(recipeId)}/fork`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        await throwApiError(response, "Could not duplicate recipe");
      }
      return response.json() as Promise<{ recipe: SavedRecipeRow }>;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["saved-recipes"] });
      setDetailRecipe(null);
      router.push(`/recipe-generator/${data.recipe.id}/edit`);
    },
  });

  const openParentRecipeMutation = useMutation({
    mutationFn: async (parentId: string) => {
      const response = await fetch(`/api/recipes/${encodeURIComponent(parentId)}`);
      if (!response.ok) {
        await throwApiError(response, "Could not open original");
      }
      return response.json() as Promise<{ recipe: SavedRecipeRow }>;
    },
    onSuccess: (data) => {
      setDetailRecipe(data.recipe);
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
    let list = savedQuery.data ?? [];
    if (libraryTypeFilter !== ALL_LIBRARY_TYPES) {
      list = list.filter((r) => r.food_type_id === libraryTypeFilter);
    }
    if (libraryTestedFilter === LIBRARY_TESTED_ONLY) {
      list = list.filter((r) => r.tested);
    }
    return list;
  }, [savedQuery.data, libraryTypeFilter, libraryTestedFilter]);

  const recipesForImportTab = useMemo(() => {
    let list = filteredSavedRecipes;
    if (importSourceMarkdownFilter === IMPORT_SOURCE_WITHOUT_MARKDOWN) {
      list = list.filter((r) => !r.source_markdown?.trim());
    } else if (importSourceMarkdownFilter === IMPORT_SOURCE_WITH_MARKDOWN_ONLY) {
      list = list.filter((r) => Boolean(r.source_markdown?.trim()));
    }
    return list;
  }, [filteredSavedRecipes, importSourceMarkdownFilter]);

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
      <Tabs
        value={activeRecipeTab}
        onValueChange={(v) => {
          const next = new URLSearchParams(searchParams.toString());
          next.set("tab", v);
          const q = next.toString();
          router.replace(q ? `/recipe-generator?${q}` : "/recipe-generator", { scroll: false });
        }}
        className="min-w-0 space-y-4"
      >
        <TabsList className="grid w-full grid-cols-2 items-stretch gap-1 rounded-lg bg-muted p-1 group-data-[orientation=horizontal]/tabs:!h-auto group-data-[orientation=horizontal]/tabs:min-h-11 sm:grid-cols-4 sm:w-full">
          <TabsTrigger
            value="generate"
            className="!h-auto min-h-11 justify-center py-2.5 whitespace-normal shadow-none data-[state=active]:shadow-none"
          >
            Generate
          </TabsTrigger>
          <TabsTrigger
            value="import"
            className="!h-auto min-h-11 justify-center py-2.5 whitespace-normal shadow-none data-[state=active]:shadow-none"
          >
            Import
          </TabsTrigger>
          <TabsTrigger
            value="library"
            className="!h-auto min-h-11 justify-center py-2.5 whitespace-normal shadow-none data-[state=active]:shadow-none"
          >
            Library
          </TabsTrigger>
          <TabsTrigger
            value="plan"
            className="!h-auto min-h-11 justify-center py-2.5 whitespace-normal shadow-none data-[state=active]:shadow-none"
          >
            Plan to cook
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recipe generator</CardTitle>
              <CardDescription>
                Pick ICA Maxi ingredients and a food style. AI suggests <strong>dish names</strong>{" "}
                and a structured <strong>ingredient list</strong> only — not full cooking
                instructions. When you pick a dish, paste markdown from a recipe you trust (blog,
                cookbook, …) to fill in steps, or save the suggestion and edit later.
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
                  {generateMutation.isPending ? "Generating…" : "Generate suggestions"}
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
                    {meal.summary ? (
                      <CardDescription>{meal.summary}</CardDescription>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No short AI blurb — ingredients below are for shopping; add cooking steps
                        from a trusted source when you save.
                      </p>
                    )}
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
                    {meal.steps.length > 0 ? (
                      <div>
                        <p className="mb-2 text-xs font-medium text-muted-foreground">Steps</p>
                        <RecipeStepsDisplay
                          className="list-decimal space-y-1 pl-5 text-sm"
                          steps={meal.steps}
                        />
                      </div>
                    ) : (
                      <p className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                        No cooking steps from AI. Use <strong>Fulfill from source</strong> to paste
                        markdown from a recipe you trust (we extract numbered steps when possible).
                      </p>
                    )}
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <Button
                        type="button"
                        disabled={busy || saveMutation.isPending || !lastMeta}
                        onClick={() => {
                          setFulfillMeal(meal);
                          setFulfillMarkdown("");
                          setFulfillOriginalUrl("");
                        }}
                      >
                        Fulfill from source…
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busy || saveMutation.isPending || !lastMeta}
                        onClick={() => void saveMutation.mutateAsync({ meal })}
                      >
                        Save suggestion only
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}

          <Dialog
            open={fulfillMeal !== null}
            onOpenChange={(open) => {
              if (!open) {
                setFulfillMeal(null);
                setFulfillMarkdown("");
                setFulfillOriginalUrl("");
              }
            }}
          >
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Fulfill from source</DialogTitle>
                <DialogDescription>
                  Paste markdown from a recipe you trust. We extract numbered steps (1. 2. …) or a
                  section such as Tillagning / Instructions when possible. The full paste is stored
                  with the recipe. Optionally add the page URL so you can open the original later.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground" id="fulfill-url">
                  Original recipe URL (optional)
                </span>
                <Input
                  id="fulfill-url"
                  type="url"
                  inputMode="url"
                  value={fulfillOriginalUrl}
                  onChange={(e) => setFulfillOriginalUrl(e.target.value)}
                  placeholder="https://…"
                  maxLength={2000}
                  disabled={saveMutation.isPending}
                  className="min-w-0"
                />
              </div>
              <Textarea
                value={fulfillMarkdown}
                onChange={(e) => setFulfillMarkdown(e.target.value)}
                placeholder={
                  "## Tillagning\n1. …\n2. …\n\n(or paste the site’s full markdown export)"
                }
                rows={18}
                className="font-mono text-sm"
                disabled={saveMutation.isPending}
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={saveMutation.isPending}
                  onClick={() => {
                    setFulfillMeal(null);
                    setFulfillMarkdown("");
                    setFulfillOriginalUrl("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={saveMutation.isPending || !fulfillMeal || !lastMeta}
                  onClick={() => {
                    if (!fulfillMeal) {
                      return;
                    }
                    void saveMutation.mutateAsync({
                      meal: fulfillMeal,
                      markdown: fulfillMarkdown,
                      originalRecipeUrl: fulfillOriginalUrl,
                    });
                  }}
                >
                  {saveMutation.isPending ? "Saving…" : "Add to library"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="import" className="min-w-0 space-y-4">
          {importRecipeSelectedId ? (
            <ImportRecipeFromSourcePage
              key={importRecipeSelectedId}
              recipeId={importRecipeSelectedId}
              embedInRecipeGenerator
            />
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle>New dish from a source</CardTitle>
                    <CardDescription className="mt-1.5">
                      No saved row yet? Paste markdown from a blog or site and let AI propose{" "}
                      <strong>titles</strong>, <strong>meal type</strong>, <strong>food style</strong>
                      , ingredients, steps, and time — then review and save a brand-new library recipe.
                    </CardDescription>
                  </div>
                  <Button asChild variant="secondary" className="w-full shrink-0 sm:w-auto">
                    <Link href="/recipe-generator/import-new">Open new-dish import</Link>
                  </Button>
                </CardHeader>
              </Card>

              <Card className="min-w-0 overflow-hidden">
              <CardHeader>
                <CardTitle>Import into a saved recipe</CardTitle>
                <CardDescription>
                  Pick a <strong>saved recipe</strong>, then paste markdown from a page you trust.
                  AI fills summary, ingredients, steps, and timings — same flow as{" "}
                  <strong>Import from another source</strong> on the edit screen. Use the filters to
                  find the row you want to update.                 The <strong>Source</strong> column shows whether
                  that row already has pasted markdown stored (from a previous import). By default
                  this list shows recipes <strong>without</strong> pasted source text so you can
                  finish them first.
                </CardDescription>
              </CardHeader>
              <CardContent className="min-w-0 space-y-4">
                {savedQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading recipes…</p>
                ) : null}
                {!savedQuery.isLoading && totalSavedCount === 0 ? (
                  <p className="text-sm italic text-muted-foreground">
                    No saved recipes yet. Generate and save a dish on the <strong>Generate</strong>{" "}
                    tab, then return here to import cooking instructions from an external source.
                  </p>
                ) : null}
                {!savedQuery.isLoading && totalSavedCount > 0 ? (
                  <>
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground tabular-nums">
                          {totalSavedCount}
                        </span>{" "}
                        saved {totalSavedCount === 1 ? "recipe" : "recipes"}
                        {" "}
                        · Showing{" "}
                        <span className="font-medium text-foreground tabular-nums">
                          {recipesForImportTab.length}
                        </span>{" "}
                        {recipesForImportTab.length === 1 ? "match" : "matches"}
                        {importSourceMarkdownFilter === IMPORT_SOURCE_WITHOUT_MARKDOWN ? (
                          <span className="text-muted-foreground"> (no pasted source yet)</span>
                        ) : importSourceMarkdownFilter === IMPORT_SOURCE_WITH_MARKDOWN_ONLY ? (
                          <span className="text-muted-foreground"> (with pasted source)</span>
                        ) : null}
                      </p>
                      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                        <div className="space-y-1.5">
                          <span className="text-xs font-medium text-muted-foreground" id="imp-ft">
                            Type filter
                          </span>
                          <Select
                            value={libraryTypeFilter}
                            onValueChange={setLibraryTypeFilter}
                            disabled={!foodTypesQuery.data}
                          >
                            <SelectTrigger
                              className="w-full min-w-[12rem] sm:w-64"
                              aria-labelledby="imp-ft"
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
                        <div className="space-y-1.5">
                          <span className="text-xs font-medium text-muted-foreground" id="imp-tested">
                            Tested filter
                          </span>
                          <Select
                            value={libraryTestedFilter}
                            onValueChange={setLibraryTestedFilter}
                          >
                            <SelectTrigger
                              className="w-full min-w-[12rem] sm:w-64"
                              aria-labelledby="imp-tested"
                            >
                              <SelectValue placeholder="All recipes" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={ALL_LIBRARY_TESTED}>All recipes</SelectItem>
                              <SelectItem value={LIBRARY_TESTED_ONLY}>Tested only</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <span className="text-xs font-medium text-muted-foreground" id="imp-src">
                            Pasted source
                          </span>
                          <Select
                            value={importSourceMarkdownFilter}
                            onValueChange={setImportSourceMarkdownFilter}
                          >
                            <SelectTrigger
                              className="w-full min-w-[12rem] sm:w-64"
                              aria-labelledby="imp-src"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={IMPORT_SOURCE_WITHOUT_MARKDOWN}>
                                No pasted source yet
                              </SelectItem>
                              <SelectItem value={IMPORT_SOURCE_WITH_MARKDOWN_ONLY}>
                                Has pasted source
                              </SelectItem>
                              <SelectItem value={ALL_IMPORT_SOURCE}>All recipes</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    {filteredSavedRecipes.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No recipes match the current filters. Try <strong>All types</strong> or{" "}
                        <strong>All recipes</strong>.
                      </p>
                    ) : recipesForImportTab.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No recipes match the current &quot;Pasted source&quot; filter. Choose{" "}
                        <strong>All recipes</strong> or <strong>Has pasted source</strong> to see
                        other rows.
                      </p>
                    ) : (
                      <div className="min-w-0 w-full">
                        <p className="mb-2 text-xs text-muted-foreground lg:hidden">
                          Scroll sideways to see all columns.
                        </p>
                        <div
                          className="max-w-full overflow-x-auto overflow-y-visible scroll-smooth rounded-lg border border-emerald-200/80 bg-emerald-50/70 shadow-sm [-webkit-overflow-scrolling:touch] touch-pan-x dark:border-emerald-900/45 dark:bg-emerald-950/30"
                          role="region"
                          aria-label="Choose a recipe to import into — scroll horizontally when needed"
                        >
                          <table className="w-full min-w-[50rem] border-collapse text-sm">
                            <caption className="sr-only">Recipes available for source import</caption>
                            <thead>
                              <tr className="border-b border-emerald-200/60 bg-emerald-100/50 dark:border-emerald-900/50 dark:bg-emerald-950/40">
                                <th className="sticky left-0 z-20 border-r border-emerald-200/70 bg-emerald-100/95 px-3 py-2 text-left text-sm font-medium shadow-[4px_0_12px_-4px_rgba(0,0,0,0.12)] backdrop-blur-sm dark:border-emerald-800/60 dark:bg-emerald-950/95">
                                  #
                                </th>
                                <th className="px-3 py-2 text-left font-medium">Title</th>
                                <th className="px-3 py-2 text-left font-medium">Type</th>
                                <th className="px-3 py-2 text-left font-medium">Est. cook time</th>
                                <th className="px-3 py-2 text-center font-medium" title="Pasted source markdown saved on this recipe">
                                  Source
                                </th>
                                <th className="px-3 py-2 text-right font-medium">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {recipesForImportTab.map((r, idx) => (
                                <tr
                                  key={`imp-${r.id}`}
                                  className="border-b border-emerald-200/40 last:border-0 dark:border-emerald-900/35"
                                >
                                  <td className="sticky left-0 z-10 border-r border-emerald-200/60 bg-emerald-50/98 px-3 py-2 tabular-nums text-muted-foreground shadow-[4px_0_12px_-4px_rgba(0,0,0,0.08)] backdrop-blur-[2px] dark:border-emerald-800/50 dark:bg-emerald-950/90">
                                    {idx + 1}
                                  </td>
                                  <td className="px-3 py-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="font-medium leading-snug">{r.title}</span>
                                      {r.forked_from_id ? (
                                        <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                                          My version
                                        </span>
                                      ) : null}
                                    </div>
                                  </td>
                                  <td className="px-3 py-2">
                                    {labelByFoodTypeId.get(r.food_type_id) ?? r.food_type_id}
                                  </td>
                                  <td className="px-3 py-2 text-muted-foreground">
                                    {r.estimated_cook_time.trim() ? r.estimated_cook_time : "—"}
                                  </td>
                                  <td className="px-3 py-2 text-center align-middle">
                                    {r.source_markdown?.trim() ? (
                                      <span
                                        className="inline-flex items-center justify-center rounded-full border border-emerald-300/80 bg-emerald-100/90 px-2 py-0.5 text-xs font-medium text-emerald-900 dark:border-emerald-800/80 dark:bg-emerald-950/60 dark:text-emerald-100"
                                        title="This recipe has pasted source markdown on file"
                                      >
                                        Saved
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </td>
                                  <td className="min-w-[10rem] whitespace-nowrap px-3 py-2 text-right align-middle">
                                    <div className="inline-flex flex-nowrap items-center justify-end gap-1">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon-sm"
                                        className="shrink-0"
                                        onClick={() => setDetailRecipe(r)}
                                        aria-label={`View ${r.title}`}
                                        title="View recipe"
                                      >
                                        <Eye className="size-4" aria-hidden />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon-sm"
                                        className="shrink-0"
                                        asChild
                                        aria-label={`Edit ${r.title}`}
                                        title="Edit recipe"
                                      >
                                        <Link href={`/recipe-generator/${r.id}/edit`}>
                                          <Pencil className="size-4" aria-hidden />
                                        </Link>
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        className="shrink-0 gap-1"
                                        asChild
                                      >
                                        <Link
                                          href={`/recipe-generator?tab=import&importRecipe=${encodeURIComponent(r.id)}`}
                                          title="Import from external source"
                                        >
                                          <FileInput className="size-4" aria-hidden />
                                          Import
                                        </Link>
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                ) : null}
              </CardContent>
            </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="library" className="min-w-0 space-y-4">
          <Card className="min-w-0 overflow-hidden">
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
            <CardContent className="min-w-0 space-y-4">
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
                      {libraryTypeFilter !== ALL_LIBRARY_TYPES ||
                      libraryTestedFilter !== ALL_LIBRARY_TESTED ? (
                        <>
                          {" "}
                          · Showing{" "}
                          <span className="font-medium text-foreground tabular-nums">
                            {filteredSavedRecipes.length}
                          </span>{" "}
                          {filteredSavedRecipes.length === 1 ? "match" : "matches"}
                          {libraryTestedFilter === LIBRARY_TESTED_ONLY ? (
                            <span className="text-muted-foreground"> (tested only)</span>
                          ) : null}
                          {libraryTypeFilter !== ALL_LIBRARY_TYPES ? (
                            <> (target {recipeStyleTargetRangeLabel()} for this style)</>
                          ) : null}
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
                      <div className="space-y-1.5">
                        <span className="text-xs font-medium text-muted-foreground" id="lib-tested">
                          Tested filter
                        </span>
                        <Select
                          value={libraryTestedFilter}
                          onValueChange={setLibraryTestedFilter}
                        >
                          <SelectTrigger
                            className="w-full min-w-[12rem] sm:w-64"
                            aria-labelledby="lib-tested"
                          >
                            <SelectValue placeholder="All recipes" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={ALL_LIBRARY_TESTED}>All recipes</SelectItem>
                            <SelectItem value={LIBRARY_TESTED_ONLY}>Tested only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  {!savedQuery.isLoading &&
                  totalSavedCount > 0 &&
                  filteredSavedRecipes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No recipes match the current filters. Try{" "}
                      <strong>All types</strong>, <strong>All recipes</strong> under Tested filter,
                      or adjust your choices.
                    </p>
                  ) : null}
                  {filteredSavedRecipes.length > 0 ? (
                    <div className="min-w-0 w-full">
                      <p className="mb-2 text-xs text-muted-foreground lg:hidden">
                        Scroll sideways to see all columns.
                      </p>
                      <div
                        className="max-w-full overflow-x-auto overflow-y-visible scroll-smooth rounded-lg border border-emerald-200/80 bg-emerald-50/70 shadow-sm [-webkit-overflow-scrolling:touch] touch-pan-x dark:border-emerald-900/45 dark:bg-emerald-950/30"
                        role="region"
                        aria-label="Saved recipes table — scroll horizontally when needed"
                      >
                        <table className="w-full min-w-[52rem] border-collapse text-sm">
                          <caption className="sr-only">Saved recipes</caption>
                          <thead>
                            <tr className="border-b border-emerald-200/60 bg-emerald-100/50 dark:border-emerald-900/50 dark:bg-emerald-950/40">
                              <th className="sticky left-0 z-20 border-r border-emerald-200/70 bg-emerald-100/95 px-3 py-2 text-left text-sm font-medium shadow-[4px_0_12px_-4px_rgba(0,0,0,0.12)] backdrop-blur-sm dark:border-emerald-800/60 dark:bg-emerald-950/95">
                                #
                              </th>
                              <th className="px-3 py-2 text-left font-medium">Title</th>
                            <th className="px-3 py-2 text-left font-medium">Type</th>
                            <th className="px-3 py-2 text-left font-medium">Est. cook time</th>
                            <th className="px-3 py-2 text-center font-medium">Want to try</th>
                            <th className="px-3 py-2 text-center font-medium">Tested</th>
                            <th className="px-3 py-2 text-right font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSavedRecipes.map((r, idx) => (
                            <tr key={r.id} className="border-b border-emerald-200/40 last:border-0 dark:border-emerald-900/35">
                              <td className="sticky left-0 z-10 border-r border-emerald-200/60 bg-emerald-50/98 px-3 py-2 tabular-nums text-muted-foreground shadow-[4px_0_12px_-4px_rgba(0,0,0,0.08)] backdrop-blur-[2px] dark:border-emerald-800/50 dark:bg-emerald-950/90">
                                {idx + 1}
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-medium leading-snug">{r.title}</span>
                                  {r.forked_from_id ? (
                                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                                      My version
                                    </span>
                                  ) : null}
                                </div>
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
                              <td className="px-3 py-2 text-muted-foreground">
                                {r.estimated_cook_time.trim() ? r.estimated_cook_time : "—"}
                              </td>
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
                              <td className="min-w-[7.5rem] whitespace-nowrap px-3 py-2 text-right align-middle">
                                <div className="inline-flex flex-nowrap items-center justify-end gap-1">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon-sm"
                                    className="shrink-0"
                                    onClick={() => setDetailRecipe(r)}
                                    aria-label={`View ${r.title}`}
                                    title="View recipe"
                                  >
                                    <Eye className="size-4" aria-hidden />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon-sm"
                                    className="shrink-0"
                                    asChild
                                    aria-label={`Edit ${r.title}`}
                                    title="Edit recipe"
                                  >
                                    <Link href={`/recipe-generator/${r.id}/edit`}>
                                      <Pencil className="size-4" aria-hidden />
                                    </Link>
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon-sm"
                                    className="shrink-0 text-muted-foreground hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                                    disabled={deleteMutation.isPending}
                                    onClick={() => {
                                      if (window.confirm(`Remove “${r.title}” from the library?`)) {
                                        void deleteMutation.mutateAsync(r.id);
                                      }
                                    }}
                                    aria-label={`Remove ${r.title} from library`}
                                    title="Remove from library"
                                  >
                                    <Trash2 className="size-4" aria-hidden />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : null}
            </CardContent>
          </Card>

        </TabsContent>

        <TabsContent value="plan" className="space-y-4">
          <PlanToCookDashboard embedded />
        </TabsContent>
      </Tabs>

          <Dialog
            open={detailRecipe !== null}
            onOpenChange={(open) => {
              if (!open) {
                setDetailRecipe(null);
              }
            }}
          >
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              {detailRecipe ? (
                <>
                  <DialogHeader>
                    <DialogTitle className="pr-8 text-left">
                      {getRecipeDisplayTitle(detailRecipe as SavedRecipeWithI18n, locale)}
                    </DialogTitle>
                    <DialogDescription className="text-left">
                      {recipeReadDisplay?.summary ?? detailRecipe.summary}
                    </DialogDescription>
                  </DialogHeader>
                  <RecipeLanguageToolbar
                    className="mb-4 border-b pb-4"
                    recipeId={detailRecipe.id}
                    recipe={detailRecipe as SavedRecipeWithI18n}
                    onTranslated={(r) => {
                      setDetailRecipe(r as SavedRecipeRow);
                      void queryClient.invalidateQueries({ queryKey: ["saved-recipes"] });
                    }}
                  />
                  <div className="space-y-4 text-sm">
                    {recipeReadDisplay?.showingSourceFallback && locale !== "sv" ? (
                      <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                        Showing Swedish text for ingredients and steps — use &quot;Translate with
                        AI&quot; above for {locale.toUpperCase()}.
                      </p>
                    ) : null}
                    <dl className="grid gap-2 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <dt className="text-xs font-medium text-muted-foreground">Source</dt>
                        <dd>{formatSavedRecipeSourceLabel(detailRecipe.source)}</dd>
                      </div>
                      {detailRecipe.source_markdown?.trim() ? (
                        <div className="sm:col-span-2">
                          <dt className="text-xs font-medium text-muted-foreground">
                            Pasted source (markdown)
                          </dt>
                          <dd>
                            <pre className="mt-1 max-h-48 overflow-auto rounded-md border bg-muted/50 p-2 text-xs whitespace-pre-wrap">
                              {detailRecipe.source_markdown}
                            </pre>
                          </dd>
                        </div>
                      ) : null}
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
                    <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Your feedback</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          After cooking, note how clear the steps were and how much you liked the
                          dish.
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className="text-sm">Easy to follow?</span>
                          <Button
                            type="button"
                            variant={
                              detailRecipe.easy_to_follow === true ? "secondary" : "outline"
                            }
                            size="sm"
                            disabled={savedRecipePatchMutation.isPending}
                            onClick={() =>
                              void savedRecipePatchMutation.mutateAsync({
                                id: detailRecipe.id,
                                easy_to_follow: true,
                              })
                            }
                          >
                            Yes
                          </Button>
                          <Button
                            type="button"
                            variant={
                              detailRecipe.easy_to_follow === false ? "secondary" : "outline"
                            }
                            size="sm"
                            disabled={savedRecipePatchMutation.isPending}
                            onClick={() =>
                              void savedRecipePatchMutation.mutateAsync({
                                id: detailRecipe.id,
                                easy_to_follow: false,
                              })
                            }
                          >
                            No
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={savedRecipePatchMutation.isPending}
                            onClick={() =>
                              void savedRecipePatchMutation.mutateAsync({
                                id: detailRecipe.id,
                                easy_to_follow: null,
                              })
                            }
                          >
                            Clear
                          </Button>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <span className="text-sm">How good was it?</span>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <button
                                key={n}
                                type="button"
                                className="rounded p-0.5 transition-colors hover:bg-muted"
                                disabled={savedRecipePatchMutation.isPending}
                                onClick={() =>
                                  void savedRecipePatchMutation.mutateAsync({
                                    id: detailRecipe.id,
                                    enjoy_rating:
                                      detailRecipe.enjoy_rating === n ? null : n,
                                  })
                                }
                                aria-label={`Rate ${n} out of 5`}
                              >
                                <Star
                                  className={cn(
                                    "size-7",
                                    detailRecipe.enjoy_rating != null &&
                                      n <= detailRecipe.enjoy_rating
                                      ? "fill-amber-400 text-amber-500"
                                      : "text-muted-foreground/35",
                                  )}
                                />
                              </button>
                            ))}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={savedRecipePatchMutation.isPending}
                            onClick={() =>
                              void savedRecipePatchMutation.mutateAsync({
                                id: detailRecipe.id,
                                enjoy_rating: null,
                              })
                            }
                          >
                            Clear rating
                          </Button>
                        </div>
                      </div>
                      <div className="border-t pt-4">
                        {detailRecipe.forked_from_id ? (
                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                              This is your editable copy. The original recipe remains in your
                              library.
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={openParentRecipeMutation.isPending}
                              onClick={() =>
                                void openParentRecipeMutation.mutateAsync(
                                  detailRecipe.forked_from_id!,
                                )
                              }
                            >
                              {openParentRecipeMutation.isPending
                                ? "Opening…"
                                : "View original recipe"}
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={
                                forkRecipeMutation.isPending ||
                                savedRecipePatchMutation.isPending
                              }
                              onClick={() => void forkRecipeMutation.mutateAsync(detailRecipe.id)}
                            >
                              {forkRecipeMutation.isPending ? "Duplicating…" : "Make my version"}
                            </Button>
                            <p className="text-xs text-muted-foreground sm:pt-0.5">
                              Creates a duplicate you can edit. Your changes apply only to the copy;
                              you can remove the original from the library if you no longer need
                              it.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-xs font-medium text-muted-foreground" id="dlg-cook">
                        Est. cook time
                      </span>
                      <p className="text-sm text-foreground">
                        {detailRecipe.estimated_cook_time.trim()
                          ? detailRecipe.estimated_cook_time
                          : "—"}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-xs font-medium text-muted-foreground" id="dlg-sim">
                        Original recipe URL
                      </span>
                      <p className="text-xs text-muted-foreground">
                        Link to the page this recipe came from (optional).
                      </p>
                      {detailRecipe.similar_recipe_url.trim() ? (
                        <p className="break-all text-sm">
                          <a
                            className="text-primary underline underline-offset-4"
                            href={detailRecipe.similar_recipe_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {detailRecipe.similar_recipe_url}
                          </a>
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">—</p>
                      )}
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
                            {(recipeReadDisplay?.ingredients ?? detailRecipe.ingredients).map(
                              (row, i) => (
                                <tr
                                  key={`${detailRecipe.id}-ing-${i}`}
                                  className="border-b last:border-0"
                                >
                                  <td className="px-3 py-2 align-top">{row.ingredient_label}</td>
                                  <td className="px-3 py-2 align-top">{row.amount}</td>
                                  <td className="px-3 py-2 align-top">{row.text}</td>
                                </tr>
                              ),
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-medium text-muted-foreground">Steps</p>
                      <RecipeStepsDisplay
                        className="list-decimal space-y-1 pl-5"
                        steps={recipeReadDisplay?.steps ?? detailRecipe.steps}
                      />
                    </div>
                    <Button type="button" variant="secondary" className="w-full sm:w-auto" asChild>
                      <Link
                        href={`/recipe-generator/${detailRecipe.id}/edit`}
                        onClick={() => setDetailRecipe(null)}
                      >
                        Edit recipe
                      </Link>
                    </Button>
                  </div>
                </>
              ) : null}
            </DialogContent>
          </Dialog>
    </main>
  );
}
