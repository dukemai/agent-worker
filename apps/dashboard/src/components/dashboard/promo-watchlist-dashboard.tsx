"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PROMO_WATCHLIST_KEY,
  fetchPromoWatchlist,
  serializePromoWatchlist,
} from "@/lib/promo-watchlist";
import { parsePromoPickerCatalogJson } from "@/lib/promo-picker-catalog-validate";
import type { PromoPickerCatalog } from "@/types/promo-picker-catalog";
import { PromoWatchlistAddItems } from "@/components/dashboard/promo-watchlist-add-items";
import { PromoWatchlistCurrentList } from "@/components/dashboard/promo-watchlist-current-list";
import { PromoWeeklyMatchesSection } from "@/components/dashboard/promo-weekly-matches-section";

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

async function throwApiError(response: Response, fallback: string): Promise<never> {
  const json = (await response.json().catch(() => ({}))) as { error?: string };
  throw new Error(json.error ?? fallback);
}

export function PromoWatchlistDashboard() {
  const [localError, setLocalError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const catalogQuery = useQuery({
    queryKey: ["promo-picker-catalog"],
    queryFn: fetchPickerCatalog,
  });

  const watchlistQuery = useQuery({
    queryKey: ["context", PROMO_WATCHLIST_KEY],
    queryFn: fetchPromoWatchlist,
  });

  const saveMutation = useMutation({
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

  const clearMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `/api/context/${encodeURIComponent(PROMO_WATCHLIST_KEY)}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        await throwApiError(response, "Failed to clear watchlist");
      }
      return response.json();
    },
    onSuccess: async () => {
      setLocalError(null);
      await queryClient.invalidateQueries({ queryKey: ["context", PROMO_WATCHLIST_KEY] });
      await queryClient.invalidateQueries({ queryKey: ["context"] });
    },
  });

  const items = watchlistQuery.data ?? [];
  const busy =
    saveMutation.isPending ||
    clearMutation.isPending ||
    watchlistQuery.isFetching;

  async function persist(next: string[]) {
    setLocalError(null);
    try {
      await saveMutation.mutateAsync(next);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function removeAt(index: number) {
    const next = items.filter((_, i) => i !== index);
    await persist(next);
  }

  async function clearAll() {
    if (
      !window.confirm(
        "Remove every item from your promo grocery watchlist? This cannot be undone from here.",
      )
    ) {
      return;
    }
    setLocalError(null);
    try {
      await clearMutation.mutateAsync();
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Clear failed");
    }
  }

  const mutationError =
    saveMutation.error instanceof Error ? saveMutation.error.message : null;
  const clearError =
    clearMutation.error instanceof Error ? clearMutation.error.message : null;
  const catalogError =
    catalogQuery.error instanceof Error ? catalogQuery.error.message : null;
  const listError =
    watchlistQuery.error instanceof Error ? watchlistQuery.error.message : null;
  const error = localError ?? mutationError ?? clearError ?? catalogError ?? listError;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6">
      <Tabs defaultValue="watchlist" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 items-stretch gap-1 group-data-[orientation=horizontal]/tabs:!h-auto group-data-[orientation=horizontal]/tabs:min-h-11 sm:w-full">
          <TabsTrigger
            value="watchlist"
            className="!h-auto min-h-11 justify-center py-2.5 whitespace-normal shadow-none data-[state=active]:shadow-none"
          >
            Watchlist
          </TabsTrigger>
          <TabsTrigger
            value="matches"
            className="!h-auto min-h-11 justify-center py-2.5 whitespace-normal shadow-none data-[state=active]:shadow-none"
          >
            Matched offers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="watchlist" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Promo grocery watchlist</CardTitle>
              <CardDescription>
                Items you want to watch for on weekly offers. Stored as{" "}
                <code className="rounded bg-muted px-1 text-xs">{PROMO_WATCHLIST_KEY}</code> in
                family context. Example store (ICA Maxi):{" "}
                <a
                  className="text-primary underline underline-offset-4"
                  href="https://www.ica.se/erbjudanden/maxi-ica-stormarknad-barkarbystaden-1003408/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Barkarbystaden erbjudanden
                </a>
                . Scraper sync:{" "}
                <code className="rounded bg-muted px-1 text-xs">pnpm promo:download-watchlist</code>.
              </CardDescription>
            </CardHeader>
          </Card>

          <PromoWatchlistAddItems
            catalog={catalogQuery.data}
            catalogLoading={catalogQuery.isLoading}
            watchlistItems={items}
            busy={busy}
            onPersist={persist}
            onError={setLocalError}
            errorMessage={error}
          />

          <PromoWatchlistCurrentList
            items={items}
            isLoading={watchlistQuery.isLoading}
            busy={busy}
            onRemoveAt={removeAt}
            onClearAll={clearAll}
            catalog={catalogQuery.data}
            catalogLoading={catalogQuery.isLoading}
          />
        </TabsContent>

        <TabsContent value="matches" className="space-y-6">
          <PromoWeeklyMatchesSection />
        </TabsContent>
      </Tabs>
    </main>
  );
}
