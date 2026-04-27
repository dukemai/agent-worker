import type { PromotionImportRunRow } from "@/app/api/promotions/current-week/route";
import type { WeeklyPromotionRow } from "@/app/api/promotions/current-week/items/route";
import type { WeeklyPromotionMatchRow } from "@/app/api/promotions/current-week/matches/route";

async function throwApiError(response: Response, fallback: string): Promise<never> {
  const json = (await response.json().catch(() => ({}))) as { error?: string };
  throw new Error(json.error ?? fallback);
}

export type WeeklyPromotionsItemsResponse = {
  run: PromotionImportRunRow | null;
  items: WeeklyPromotionRow[];
};

export type WeeklyPromotionsMatchesResponse = {
  runId: string | null;
  matches: WeeklyPromotionMatchRow[];
};

export type WeeklyPromotionsImportResponse = {
  runId: string;
  storeKey: string;
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

export async function fetchWeeklyPromotions(): Promise<WeeklyPromotionsItemsResponse> {
  const response = await fetch("/api/promotions/current-week/items", { cache: "no-store" });
  if (!response.ok) {
    await throwApiError(response, "Failed to load weekly promotions");
  }
  return response.json() as Promise<WeeklyPromotionsItemsResponse>;
}

export async function fetchWeeklyPromotionMatches(): Promise<WeeklyPromotionsMatchesResponse> {
  const response = await fetch("/api/promotions/current-week/matches", { cache: "no-store" });
  if (!response.ok) {
    await throwApiError(response, "Failed to load matched promotions");
  }
  return response.json() as Promise<WeeklyPromotionsMatchesResponse>;
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
