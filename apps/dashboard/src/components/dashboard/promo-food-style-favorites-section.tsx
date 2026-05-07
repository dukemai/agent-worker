"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { FoodStyleFavoriteSuggestionRow } from "@/app/api/promo-food-style-suggestions/route";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SuggestionsResponse = {
  suggestions: FoodStyleFavoriteSuggestionRow[];
};

async function throwApiError(response: Response, fallback: string): Promise<never> {
  const json = (await response.json().catch(() => ({}))) as { error?: string };
  throw new Error(json.error ?? fallback);
}

async function fetchSuggestions(): Promise<SuggestionsResponse> {
  const response = await fetch("/api/promo-food-style-suggestions", { cache: "no-store" });
  if (!response.ok) {
    await throwApiError(response, "Failed to load food style suggestions");
  }
  return response.json() as Promise<SuggestionsResponse>;
}

export function PromoFoodStyleFavoritesSection({
  watchlistItems,
  busy,
  onPersist,
  onError,
}: {
  watchlistItems: string[];
  busy: boolean;
  onPersist: (items: string[]) => Promise<void>;
  onError: (message: string | null) => void;
}) {
  const [selectedStyle, setSelectedStyle] = useState<string>("");
  const [selectedTexts, setSelectedTexts] = useState<Set<string>>(() => new Set());

  const suggestionsQuery = useQuery({
    queryKey: ["promo-food-style-suggestions"],
    queryFn: fetchSuggestions,
  });

  const suggestions = useMemo(
    () => suggestionsQuery.data?.suggestions ?? [],
    [suggestionsQuery.data?.suggestions],
  );
  const mappedStyleLabels = useMemo(() => {
    const map = new Map<string, string>();
    for (const suggestion of suggestions) {
      map.set(suggestion.style_id, suggestion.style_label);
    }
    return map;
  }, [suggestions]);

  const styles = useMemo(
    () => [...mappedStyleLabels.entries()].map(([id, label]) => ({ id, label })),
    [mappedStyleLabels],
  );

  const activeStyle = selectedStyle || styles[0]?.id || "";
  const activeStyleLabel = styles.find((style) => style.id === activeStyle)?.label ?? "";
  const activeSuggestions = suggestions.filter((suggestion) => suggestion.style_id === activeStyle);
  const watchlistSet = useMemo(() => new Set(watchlistItems), [watchlistItems]);

  async function addSelectedToWatchlist() {
    const nextItems = [...watchlistItems];
    for (const text of selectedTexts) {
      if (!nextItems.includes(text)) {
        nextItems.push(text);
      }
    }
    try {
      await onPersist(nextItems);
      setSelectedTexts(new Set());
    } catch (error) {
      onError(error instanceof Error ? error.message : "Failed to add style favorites");
    }
  }

  const queryError = suggestionsQuery.error instanceof Error ? suggestionsQuery.error.message : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add by food style</CardTitle>
        <CardDescription>
          Pick a cooking style, review the suggested favorites, and add useful ingredients to your
          weekly promo watchlist.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {suggestionsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading food styles...</p>
        ) : null}
        {queryError ? (
          <p className="text-sm text-red-600">{queryError}</p>
        ) : null}

        {styles.length > 0 ? (
          <>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select
                value={activeStyle}
                onValueChange={(value) => {
                  setSelectedStyle(value);
                  setSelectedTexts(new Set());
                }}
              >
                <SelectTrigger className="w-full sm:w-72">
                  <SelectValue placeholder="Choose food style" />
                </SelectTrigger>
                <SelectContent>
                  {styles.map((style) => (
                    <SelectItem key={style.id} value={style.id}>
                        {style.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                className="w-full sm:w-auto"
                disabled={busy || selectedTexts.size === 0}
                onClick={() => void addSelectedToWatchlist()}
              >
                Add selected ({selectedTexts.size})
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                asChild
              >
                <Link href="/recipe-generator/mapping">Manage mapping</Link>
              </Button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {activeSuggestions.length > 0 ? activeSuggestions.map((suggestion) => {
                const alreadyAdded = watchlistSet.has(suggestion.watchlist_text);
                const checked = selectedTexts.has(suggestion.watchlist_text);
                return (
                  <label
                    key={suggestion.id}
                    className="flex min-h-16 gap-3 rounded-md border bg-background p-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="mt-1 size-4 shrink-0"
                      disabled={alreadyAdded}
                      checked={checked || alreadyAdded}
                      onChange={(event) => {
                        const next = new Set(selectedTexts);
                        if (event.target.checked) {
                          next.add(suggestion.watchlist_text);
                        } else {
                          next.delete(suggestion.watchlist_text);
                        }
                        setSelectedTexts(next);
                      }}
                    />
                    <span className="min-w-0">
                      <span className="block font-medium">{suggestion.watchlist_text}</span>
                      <span className="block text-xs text-muted-foreground">
                        {alreadyAdded ? "Already on watchlist" : suggestion.reason ?? activeStyleLabel}
                      </span>
                    </span>
                  </label>
                );
              }) : (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">
                  No mappings for this recipe food style yet. Manage mappings under Recipes.
                </div>
              )}
            </div>

          </>
        ) : !suggestionsQuery.isLoading ? (
          <div className="flex flex-col gap-3 rounded-lg border border-dashed p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              No food style mappings yet. Create one manually or generate suggestions with AI.
            </p>
            <Button type="button" variant="outline" asChild>
              <Link href="/recipe-generator/mapping">Manage mapping</Link>
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
