import type { PromotionImportRunRow } from "@/app/api/promotions/current-week/route";
import type { WeeklyPromotionRow } from "@/app/api/promotions/current-week/items/route";
import type { WeeklyPromotionMatchRow } from "@/app/api/promotions/current-week/matches/route";
import type { PromoRecipeRecommendationsResponse } from "@/app/api/promotions/recipe-recommendations/route";
import type { PromotionStoreOption } from "@/app/api/promotions/stores/route";

async function throwApiError(response: Response, fallback: string): Promise<never> {
  const json = (await response.json().catch(() => ({}))) as { error?: string };
  throw new Error(json.error ?? fallback);
}

export type WeeklyPromotionsItemsResponse = {
  run: PromotionImportRunRow | null;
  runs?: PromotionImportRunRow[];
  items: WeeklyPromotionRow[];
};

export type WeeklyPromotionsMatchesResponse = {
  runId: string | null;
  runIds?: string[];
  matches: WeeklyPromotionMatchRow[];
};

export type WeeklyPromotionsImportResponse = {
  runId: string;
  storeKey: string;
  storeName: string | null;
  weekNumber: number;
  isoYear: number;
  itemCount: number;
};

export type WeeklyPromotionsFilterResponse = {
  runId: string;
  matchCount: number;
  watchlistCount: number;
  promotionCount: number;
};

export type WeeklyPromotionsClearResponse = {
  deleted: true;
  deletedRunCount: number;
  storeKey: string | null;
};

export type WeeklyPromotionStoresResponse = {
  stores: PromotionStoreOption[];
};

export type WeeklyPromotionScope = "latest" | "current-week";

function promotionQuery(storeKey?: string | null, scope: WeeklyPromotionScope = "latest"): string {
  const params = new URLSearchParams();
  if (scope === "current-week") {
    params.set("scope", "current-week");
  }
  if (storeKey) {
    params.set("storeKey", storeKey);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function fetchWeeklyPromotionStores(): Promise<WeeklyPromotionStoresResponse> {
  const response = await fetch("/api/promotions/stores", { cache: "no-store" });
  if (!response.ok) {
    await throwApiError(response, "Failed to load promotion stores");
  }
  return response.json() as Promise<WeeklyPromotionStoresResponse>;
}

export async function fetchWeeklyPromotions(
  storeKey?: string | null,
  scope: WeeklyPromotionScope = "latest",
): Promise<WeeklyPromotionsItemsResponse> {
  const response = await fetch(`/api/promotions/current-week/items${promotionQuery(storeKey, scope)}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    await throwApiError(response, "Failed to load weekly promotions");
  }
  return response.json() as Promise<WeeklyPromotionsItemsResponse>;
}

export async function fetchWeeklyPromotionMatches(
  storeKey?: string | null,
  scope: WeeklyPromotionScope = "latest",
): Promise<WeeklyPromotionsMatchesResponse> {
  const response = await fetch(
    `/api/promotions/current-week/matches${promotionQuery(storeKey, scope)}`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    await throwApiError(response, "Failed to load matched promotions");
  }
  return response.json() as Promise<WeeklyPromotionsMatchesResponse>;
}

export async function clearCurrentWeeklyPromotions(
  storeKey?: string | null,
): Promise<WeeklyPromotionsClearResponse> {
  const response = await fetch(
    `/api/promotions/current-week${promotionQuery(storeKey, "latest")}`,
    {
      method: "DELETE",
    },
  );
  if (!response.ok) {
    await throwApiError(response, "Failed to clear weekly promotions");
  }
  return response.json() as Promise<WeeklyPromotionsClearResponse>;
}

export async function importWeeklyPromotions(
  file: File,
): Promise<WeeklyPromotionsImportResponse> {
  const form = new FormData();
  form.set("file", file);
  const response = await fetch("/api/promotions/import-weekly", {
    method: "POST",
    body: form,
  });
  if (!response.ok) {
    await throwApiError(response, "Promotion import failed");
  }
  return response.json() as Promise<WeeklyPromotionsImportResponse>;
}

export async function filterWeeklyPromotions(
  runId: string,
): Promise<WeeklyPromotionsFilterResponse> {
  const response = await fetch("/api/promotions/filter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ runId }),
  });
  if (!response.ok) {
    await throwApiError(response, "Promotion filtering failed");
  }
  return response.json() as Promise<WeeklyPromotionsFilterResponse>;
}

export async function filterWeeklyPromotionRuns(
  runIds: string[],
): Promise<WeeklyPromotionsFilterResponse & { runIds: string[] }> {
  const uniqueRunIds = [...new Set(runIds.map((runId) => runId.trim()).filter(Boolean))];
  if (uniqueRunIds.length === 0) {
    throw new Error("No weekly promotion imports selected for filtering");
  }

  const results = await Promise.all(uniqueRunIds.map((runId) => filterWeeklyPromotions(runId)));
  return {
    runId: results[0]?.runId ?? uniqueRunIds[0],
    runIds: uniqueRunIds,
    matchCount: results.reduce((sum, result) => sum + result.matchCount, 0),
    watchlistCount: results[0]?.watchlistCount ?? 0,
    promotionCount: results.reduce((sum, result) => sum + result.promotionCount, 0),
  };
}

export async function fetchRecipeRecommendationsForPromotionMatches(
  matchIds: string[],
): Promise<PromoRecipeRecommendationsResponse> {
  const response = await fetch("/api/promotions/recipe-recommendations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ matchIds }),
  });
  if (!response.ok) {
    await throwApiError(response, "Failed to recommend recipes");
  }
  return response.json() as Promise<PromoRecipeRecommendationsResponse>;
}

export async function addRecipeToCookPlan(recipeId: string): Promise<void> {
  const response = await fetch("/api/cook-plan/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipeId }),
  });
  if (!response.ok) {
    await throwApiError(response, "Could not add recipe to plan");
  }
}
