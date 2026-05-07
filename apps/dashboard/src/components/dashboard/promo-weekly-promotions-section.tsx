"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRecipeDifficulty } from "@/lib/recipe-difficulty";
import {
  addRecipeToCookPlan,
  fetchWeeklyPromotionMatches,
  fetchWeeklyPromotionStores,
  fetchWeeklyPromotions,
  fetchRecipeRecommendationsForPromotionMatches,
  filterWeeklyPromotionRuns,
  importWeeklyPromotions,
} from "./promo-weekly-promotions-api";

type ViewMode = "matches" | "all";

const CURRENT_WEEK_FILTER = "__current_week__";

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

function matchKey(matchIds: string[]): string {
  return [...matchIds].sort((a, b) => a.localeCompare(b)).join("|");
}

function formatImportedAt(value: string): string {
  return new Date(value).toLocaleString("sv-SE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function OfferImage({ src }: { src: string | null }) {
  if (!src) {
    return <span className="text-muted-foreground">-</span>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote retailer assets
    <img
      src={src}
      alt=""
      width={56}
      height={56}
      className="size-14 rounded object-cover"
      loading="lazy"
    />
  );
}

export function PromoWeeklyPromotionsSection() {
  const [viewMode, setViewMode] = useState<ViewMode>("matches");
  const [selectedStoreKey, setSelectedStoreKey] = useState<string>(CURRENT_WEEK_FILTER);
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);
  const [requestedMatchKey, setRequestedMatchKey] = useState("");
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);
  const [addedRecipeIds, setAddedRecipeIds] = useState<Set<string>>(() => new Set());
  const queryClient = useQueryClient();

  const storesQuery = useQuery({
    queryKey: ["weekly-promotion-stores"],
    queryFn: fetchWeeklyPromotionStores,
  });

  const foodTypesQuery = useQuery({
    queryKey: ["recipe-food-types"],
    queryFn: fetchFoodTypes,
  });

  const promotionScope = "current-week";
  const selectedStoreQueryKey = selectedStoreKey === CURRENT_WEEK_FILTER ? "" : selectedStoreKey;

  const promotionsQuery = useQuery({
    queryKey: ["weekly-promotions-current", selectedStoreKey],
    queryFn: () => fetchWeeklyPromotions(selectedStoreQueryKey || null, promotionScope),
  });

  const matchesQuery = useQuery({
    queryKey: ["weekly-promotions-matches", selectedStoreKey],
    queryFn: () => fetchWeeklyPromotionMatches(selectedStoreQueryKey || null, promotionScope),
  });

  const importMutation = useMutation({
    mutationFn: importWeeklyPromotions,
    onSuccess: async (data) => {
      setSelectedStoreKey(data.storeKey === "mixed" ? CURRENT_WEEK_FILTER : data.storeKey);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["weekly-promotion-stores"] }),
        queryClient.invalidateQueries({ queryKey: ["weekly-promotions-current"] }),
        queryClient.invalidateQueries({ queryKey: ["weekly-promotions-matches"] }),
      ]);
      setViewMode("all");
    },
  });

  const filterMutation = useMutation({
    mutationFn: filterWeeklyPromotionRuns,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["weekly-promotions-matches"] });
      setViewMode("matches");
    },
  });

  const addRecommendationsMutation = useMutation({
    mutationFn: async (recipeIds: string[]) => {
      for (const recipeId of recipeIds) {
        try {
          await addRecipeToCookPlan(recipeId);
        } catch (e) {
          if (!(e instanceof Error) || !e.message.toLowerCase().includes("already")) {
            throw e;
          }
        }
      }
      return recipeIds;
    },
    onSuccess: async (recipeIds) => {
      setAddedRecipeIds((previous) => {
        const next = new Set(previous);
        for (const recipeId of recipeIds) {
          next.add(recipeId);
        }
        return next;
      });
      setSelectedRecipeIds([]);
      await queryClient.invalidateQueries({ queryKey: ["cook-plan"] });
    },
  });

  const recommendationsMutation = useMutation({
    mutationFn: fetchRecipeRecommendationsForPromotionMatches,
    onMutate: (matchIds) => {
      addRecommendationsMutation.reset();
      setRequestedMatchKey(matchKey(matchIds));
      setSelectedRecipeIds([]);
      setAddedRecipeIds(new Set());
    },
  });

  const run = promotionsQuery.data?.run ?? null;
  const currentWeekRuns = useMemo(
    () => promotionsQuery.data?.runs ?? [],
    [promotionsQuery.data?.runs],
  );
  const hasWeeklyPromotionData = Boolean(run) || currentWeekRuns.length > 0;
  const latestCurrentWeekRun = currentWeekRuns[0] ?? null;
  const filterRunIds = useMemo(
    () => (run ? [run.id] : currentWeekRuns.map((currentRun) => currentRun.id)),
    [currentWeekRuns, run],
  );
  const stores = storesQuery.data?.stores ?? [];
  const promotions = useMemo(
    () => promotionsQuery.data?.items ?? [],
    [promotionsQuery.data?.items],
  );
  const rawMatches = matchesQuery.data?.matches;
  const matches = useMemo(() => rawMatches ?? [], [rawMatches]);
  const allVisibleMatchIds = useMemo(() => matches.map((match) => match.id), [matches]);
  const visibleSelectedMatchIds = useMemo(() => {
    const visible = new Set(allVisibleMatchIds);
    return selectedMatchIds.filter((matchId) => visible.has(matchId));
  }, [allVisibleMatchIds, selectedMatchIds]);
  const selectedMatches = useMemo(
    () => matches.filter((match) => visibleSelectedMatchIds.includes(match.id)),
    [matches, visibleSelectedMatchIds],
  );
  const selectedMatchKey = useMemo(
    () => matchKey(visibleSelectedMatchIds),
    [visibleSelectedMatchIds],
  );
  const recommendationData =
    requestedMatchKey && requestedMatchKey === selectedMatchKey
      ? recommendationsMutation.data
      : null;
  const plannedPromotionMatchIds = useMemo(() => {
    const ids = new Set<string>();
    for (const recommendation of recommendationData?.recommendations ?? []) {
      const isOnPlan = recommendation.onPlan || addedRecipeIds.has(recommendation.recipe.id);
      if (!isOnPlan) {
        continue;
      }
      for (const match of recommendation.matchedPromotions) {
        ids.add(match.matchId);
      }
    }
    return ids;
  }, [addedRecipeIds, recommendationData?.recommendations]);
  const selectedRecommendationCount = selectedRecipeIds.length;
  const allMatchesSelected =
    allVisibleMatchIds.length > 0 &&
    allVisibleMatchIds.every((matchId) => visibleSelectedMatchIds.includes(matchId));
  const foodTypeLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const option of foodTypesQuery.data?.options ?? []) {
      map.set(option.id, option.label);
    }
    return map;
  }, [foodTypesQuery.data?.options]);
  const categories = useMemo(
    () =>
      [
        ...new Set(
          promotions
            .map((promotion) => promotion.category_name ?? promotion.category_key)
            .filter((value): value is string => typeof value === "string" && value.length > 0),
        ),
      ].sort((a, b) => a.localeCompare(b, "sv")),
    [promotions],
  );

  const importError =
    importMutation.error instanceof Error ? importMutation.error.message : null;
  const filterError =
    filterMutation.error instanceof Error ? filterMutation.error.message : null;
  const loadError =
    promotionsQuery.error instanceof Error
      ? promotionsQuery.error.message
      : matchesQuery.error instanceof Error
        ? matchesQuery.error.message
        : storesQuery.error instanceof Error
          ? storesQuery.error.message
          : null;
  const recommendationError =
    recommendationsMutation.error instanceof Error ? recommendationsMutation.error.message : null;
  const addRecommendationError =
    addRecommendationsMutation.error instanceof Error
      ? addRecommendationsMutation.error.message
      : null;

  function toggleMatch(matchId: string, checked: boolean) {
    setSelectedMatchIds((previous) =>
      checked
        ? [...new Set([...previous, matchId])]
        : previous.filter((item) => item !== matchId),
    );
  }

  function toggleRecipe(recipeId: string, checked: boolean) {
    setSelectedRecipeIds((previous) =>
      checked
        ? [...new Set([...previous, recipeId])]
        : previous.filter((item) => item !== recipeId),
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <CardTitle>This week&apos;s promotions</CardTitle>
          {run ? (
            <Badge variant="secondary" className="text-sm font-semibold">
              ISO week {run.week_number}
            </Badge>
          ) : latestCurrentWeekRun ? (
            <Badge variant="secondary" className="text-sm font-semibold">
              ISO week {latestCurrentWeekRun.week_number}
            </Badge>
          ) : null}
        </div>
        <CardDescription>
          Upload the full weekly promotions export, then run filtering against your watchlist. The
          matched list is now computed in the dashboard, and the full offer set stays available for
          browsing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {stores.length > 0 ? (
          <fieldset className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">Store</span>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <label className="flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm transition-colors hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <input
                  type="radio"
                  name="weekly-promotion-store"
                  value={CURRENT_WEEK_FILTER}
                  checked={selectedStoreKey === CURRENT_WEEK_FILTER}
                  onChange={() => {
                    setSelectedStoreKey(CURRENT_WEEK_FILTER);
                    setViewMode("matches");
                  }}
                  className="size-4 accent-primary"
                />
                <span>All matched this week</span>
              </label>
              {stores.map((store) => (
                <label
                  key={store.store_key}
                  className="flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm transition-colors hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <input
                    type="radio"
                    name="weekly-promotion-store"
                    value={store.store_key}
                    checked={selectedStoreKey === store.store_key}
                    onChange={() => setSelectedStoreKey(store.store_key)}
                    className="size-4 accent-primary"
                  />
                  <span>
                    {store.store_key} · week {store.latest_week_number}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <input
            type="file"
            accept="application/json,.json"
            className="text-sm file:me-3 file:rounded-md file:border file:bg-muted file:px-3 file:py-2"
            disabled={importMutation.isPending}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) {
                importMutation.mutate(file);
              }
            }}
          />
          {filterRunIds.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={filterMutation.isPending || importMutation.isPending}
              onClick={() => filterMutation.mutate(filterRunIds)}
            >
              {filterMutation.isPending
                ? "Filtering..."
                : filterRunIds.length === 1
                  ? "Run filtering"
                  : `Run filtering (${filterRunIds.length} imports)`}
            </Button>
          ) : null}
        </div>

        {importMutation.isPending ? (
          <p className="text-sm text-muted-foreground">Importing weekly promotions...</p>
        ) : null}
        {importMutation.isSuccess ? (
          <p className="text-sm text-green-700">
            Imported {importMutation.data.itemCount} offers for{" "}
            {importMutation.data.storeName
              ? `${importMutation.data.storeName} (${importMutation.data.storeKey})`
              : importMutation.data.storeKey}{" "}
            · ISO week {importMutation.data.weekNumber}.
          </p>
        ) : null}
        {filterMutation.isSuccess ? (
          <p className="text-sm text-green-700">
            Matched {filterMutation.data.matchCount} offers from{" "}
            {filterMutation.data.promotionCount} promotions against{" "}
            {filterMutation.data.watchlistCount} watchlist items.
          </p>
        ) : null}
        {importError || filterError || loadError ? (
          <p className="text-sm text-red-600">{importError ?? filterError ?? loadError}</p>
        ) : null}

        {promotionsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading weekly promotions...</p>
        ) : null}
        {!promotionsQuery.isLoading && !hasWeeklyPromotionData ? (
          <p className="text-sm text-muted-foreground">
            No weekly import yet. Upload{" "}
            <code className="rounded bg-muted px-1 text-xs">
              {"<store-key>-scraped-promotions.json"}
            </code>{" "}
            from the promo run output.
          </p>
        ) : null}

        {run ? (
          <div className="rounded-lg bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            Latest import:{" "}
            <span className="font-medium text-foreground">{formatImportedAt(run.created_at)}</span>{" "}
            · {run.store_key} · {run.imported_count} offer
            {run.imported_count === 1 ? "" : "s"}
            {categories.length > 0 ? ` · ${categories.length} categories` : ""}
          </div>
        ) : currentWeekRuns.length > 0 ? (
          <div className="rounded-lg bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            Current week:{" "}
            <span className="font-medium text-foreground">
              {currentWeekRuns.length} import{currentWeekRuns.length === 1 ? "" : "s"}
            </span>{" "}
            · {promotions.length} offer{promotions.length === 1 ? "" : "s"} · {matches.length}{" "}
            matched
            {categories.length > 0 ? ` · ${categories.length} categories` : ""}
          </div>
        ) : null}

        {hasWeeklyPromotionData ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex rounded-md border bg-background p-1">
              <Button
                type="button"
                size="sm"
                variant={viewMode === "matches" ? "secondary" : "ghost"}
                onClick={() => setViewMode("matches")}
              >
                Matched offers ({matches.length})
              </Button>
              <Button
                type="button"
                size="sm"
                variant={viewMode === "all" ? "secondary" : "ghost"}
                onClick={() => setViewMode("all")}
              >
                All promotions ({promotions.length})
              </Button>
            </div>
          </div>
        ) : null}

        {hasWeeklyPromotionData && viewMode === "matches" ? (
          matches.length > 0 ? (
            <div className="space-y-3">
              <div className="flex flex-col gap-2 rounded-md border bg-muted/20 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-muted-foreground">
                  {visibleSelectedMatchIds.length} selected for recipe recommendations
                </span>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={
                      visibleSelectedMatchIds.length === 0 || recommendationsMutation.isPending
                    }
                    onClick={() => recommendationsMutation.mutate(visibleSelectedMatchIds)}
                  >
                    {recommendationsMutation.isPending
                      ? "Finding recipes..."
                      : "Find recipes from selected offers"}
                  </Button>
                  {visibleSelectedMatchIds.length > 0 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedMatchIds([])}
                    >
                      Clear
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[54rem] border-collapse text-sm">
                  <caption className="sr-only">Matched weekly promotions</caption>
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th scope="col" className="px-2 py-2 text-left font-medium">
                        <input
                          type="checkbox"
                          aria-label="Select all matched offers"
                          checked={allMatchesSelected}
                          onChange={(event) =>
                            setSelectedMatchIds(event.target.checked ? allVisibleMatchIds : [])
                          }
                          className="size-4 accent-primary"
                        />
                      </th>
                      <th scope="col" className="px-2 py-2 text-left font-medium">
                        Photo
                      </th>
                      <th scope="col" className="px-2 py-2 text-left font-medium">
                        Offer
                      </th>
                      <th scope="col" className="px-2 py-2 text-left font-medium">
                        Interest
                      </th>
                      <th scope="col" className="px-2 py-2 text-left font-medium">
                        Store
                      </th>
                      <th scope="col" className="px-2 py-2 text-right font-medium">
                        Score
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((match) => {
                      const promotion = match.promotion;
                      const isAlreadyPlanned = plannedPromotionMatchIds.has(match.id);
                      return (
                        <tr
                          key={match.id}
                          className={
                            isAlreadyPlanned
                              ? "border-b bg-green-50/80 last:border-0"
                              : "border-b last:border-0"
                          }
                        >
                          <td className="px-2 py-2 align-top">
                            <input
                              type="checkbox"
                              aria-label={`Select ${promotion?.title ?? match.interest}`}
                              checked={selectedMatchIds.includes(match.id)}
                              onChange={(event) => toggleMatch(match.id, event.target.checked)}
                              className="size-4 accent-primary"
                            />
                          </td>
                          <td className="px-2 py-2 align-top">
                            <OfferImage src={promotion?.image_url ?? null} />
                          </td>
                          <td className="px-2 py-2 align-top">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-medium leading-snug">{promotion?.title}</span>
                              {isAlreadyPlanned ? (
                                <Badge variant="secondary" className="text-[0.68rem]">
                                  Already on plan
                                </Badge>
                              ) : null}
                            </div>
                            {promotion?.card_text && promotion.card_text !== promotion.title ? (
                              <div className="mt-1 max-w-prose text-xs leading-snug text-muted-foreground">
                                {promotion.card_text}
                              </div>
                            ) : null}
                            {promotion?.price_hint ? (
                              <div className="text-muted-foreground">{promotion.price_hint}</div>
                            ) : null}
                            {promotion?.source_url ? (
                              <a
                                className="text-xs text-primary underline underline-offset-2"
                                href={promotion.source_url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Offers page
                              </a>
                            ) : null}
                          </td>
                          <td className="px-2 py-2 align-top">{match.interest}</td>
                          <td className="px-2 py-2 align-top text-muted-foreground">
                            {promotion?.store_key ?? "-"}
                          </td>
                          <td className="px-2 py-2 align-top text-right tabular-nums">
                            {match.score}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No matched offers yet. Run filtering after importing this week&apos;s promotions.
            </p>
          )
        ) : null}

        {hasWeeklyPromotionData && viewMode === "matches" && recommendationData ? (
          <div className="space-y-3 rounded-lg border bg-background p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold">Recipe recommendations</h3>
                <p className="text-xs text-muted-foreground">
                  Based on selected matched promotions and saved recipe ingredients.
                </p>
              </div>
              {recommendationData.recommendations.length > 0 ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={
                    selectedRecommendationCount === 0 || addRecommendationsMutation.isPending
                  }
                  onClick={() => addRecommendationsMutation.mutate(selectedRecipeIds)}
                >
                  {addRecommendationsMutation.isPending
                    ? "Adding..."
                    : `Add selected to plan (${selectedRecommendationCount})`}
                </Button>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {recommendationData.selectedPromotions.map((promotion) => (
                <span
                  key={promotion.matchId}
                  className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"
                >
                  {promotion.interest} · {promotion.storeKey}
                </span>
              ))}
            </div>

            {addRecommendationsMutation.isSuccess ? (
              <p className="text-sm text-green-700">
                Added recipes to plan.{" "}
                <Link
                  href="/plan-to-cook"
                  className="font-medium underline underline-offset-2"
                >
                  Open Plan to cook
                </Link>
              </p>
            ) : null}
            {recommendationError || addRecommendationError ? (
              <p className="text-sm text-red-600">
                {recommendationError ?? addRecommendationError}
              </p>
            ) : null}

            {recommendationData.recommendations.length === 0 ? (
              <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                No saved recipes matched those promotions yet.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {recommendationData.recommendations.map((recommendation) => {
                  const recipe = recommendation.recipe;
                  const isAlreadyOnPlan = recommendation.onPlan || addedRecipeIds.has(recipe.id);
                  const matchedPromotionCount = recommendation.matchedPromotions.length;
                  return (
                    <label
                      key={recipe.id}
                      className={
                        isAlreadyOnPlan
                          ? "flex cursor-pointer gap-3 rounded-md border border-green-200 bg-green-50/80 p-3 text-sm transition-colors hover:bg-green-50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                          : "flex cursor-pointer gap-3 rounded-md border bg-muted/10 p-3 text-sm transition-colors hover:bg-muted/40 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                      }
                    >
                      <input
                        type="checkbox"
                        checked={selectedRecipeIds.includes(recipe.id)}
                        disabled={isAlreadyOnPlan || addRecommendationsMutation.isPending}
                        onChange={(event) => toggleRecipe(recipe.id, event.target.checked)}
                        className="mt-1 size-4 accent-primary"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="font-medium">{recipe.title}</span>
                          {isAlreadyOnPlan ? (
                            <Badge variant="secondary" className="text-[0.68rem]">
                              Already on plan
                            </Badge>
                          ) : null}
                          <Badge variant="outline" className="text-[0.68rem]">
                            {matchedPromotionCount} promo match
                            {matchedPromotionCount === 1 ? "" : "es"}
                          </Badge>
                          {recipe.tested ? (
                            <Badge variant="outline" className="text-[0.68rem]">
                              Tested
                            </Badge>
                          ) : null}
                          {recipe.want_to_try ? (
                            <Badge variant="outline" className="text-[0.68rem]">
                              Want to try
                            </Badge>
                          ) : null}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {foodTypeLabelById.get(recipe.food_type_id) ?? recipe.food_type_id} ·{" "}
                          {recipe.estimated_cook_time || "No time"} ·{" "}
                          {formatRecipeDifficulty(recipe.difficulty)} · score{" "}
                          {recommendation.score}
                        </span>
                        {recipe.summary ? (
                          <span className="mt-2 line-clamp-2 block text-xs leading-snug text-muted-foreground">
                            {recipe.summary}
                          </span>
                        ) : null}
                        <span className="mt-2 flex flex-col gap-1">
                          {recommendation.matchedPromotions.slice(0, 3).map((match) => (
                            <span
                              key={`${recipe.id}-${match.matchId}`}
                              className="rounded bg-background px-2 py-1 text-xs text-muted-foreground"
                            >
                              {match.reason} · {match.promotionTitle}
                            </span>
                          ))}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        ) : recommendationsMutation.isError && requestedMatchKey === selectedMatchKey ? (
          <p className="text-sm text-red-600">{recommendationError}</p>
        ) : selectedMatches.length > 0 && requestedMatchKey && requestedMatchKey !== selectedMatchKey ? (
          <p className="text-sm text-muted-foreground">
            Selection changed. Find recipes again to refresh recommendations.
          </p>
        ) : null}

        {hasWeeklyPromotionData && viewMode === "all" ? (
          promotions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[50rem] border-collapse text-sm">
                <caption className="sr-only">All weekly promotions</caption>
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th scope="col" className="px-2 py-2 text-left font-medium">
                      Photo
                    </th>
                    <th scope="col" className="px-2 py-2 text-left font-medium">
                      Offer
                    </th>
                    <th scope="col" className="px-2 py-2 text-left font-medium">
                      Category
                    </th>
                    <th scope="col" className="px-2 py-2 text-left font-medium">
                      Store
                    </th>
                    <th scope="col" className="px-2 py-2 text-right font-medium">
                      #
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {promotions.map((promotion) => (
                    <tr key={promotion.id} className="border-b last:border-0">
                      <td className="px-2 py-2 align-top">
                        <OfferImage src={promotion.image_url} />
                      </td>
                      <td className="px-2 py-2 align-top">
                        <div className="font-medium leading-snug">{promotion.title}</div>
                        {promotion.card_text && promotion.card_text !== promotion.title ? (
                          <div className="mt-1 max-w-prose text-xs leading-snug text-muted-foreground">
                            {promotion.card_text}
                          </div>
                        ) : null}
                        {promotion.price_hint ? (
                          <div className="text-muted-foreground">{promotion.price_hint}</div>
                        ) : null}
                        <a
                          className="text-xs text-primary underline underline-offset-2"
                          href={promotion.source_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Offers page
                        </a>
                      </td>
                      <td className="px-2 py-2 align-top text-muted-foreground">
                        {promotion.category_name ?? promotion.category_key ?? "-"}
                      </td>
                      <td className="px-2 py-2 align-top text-muted-foreground">
                        {promotion.store_key}
                      </td>
                      <td className="px-2 py-2 align-top text-right tabular-nums">
                        {promotion.sort_order + 1}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              This import did not contain any promotion rows.
            </p>
          )
        ) : null}
      </CardContent>
    </Card>
  );
}
