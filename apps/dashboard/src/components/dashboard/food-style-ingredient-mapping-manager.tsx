"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { FoodStyleFavoriteSuggestionRow } from "@/app/api/promo-food-style-suggestions/route";
import { fetchFoodTypes } from "@/components/dashboard/recipe-generator-api";
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
import { findMappingsByFoodStyle } from "@/lib/food-style-ingredient-mappings";

type SuggestionsResponse = {
  suggestions: FoodStyleFavoriteSuggestionRow[];
};

type AiSuggestion = {
  watchlist_text: string;
  priority: number;
  reason: string;
};

type RecipeFoodTypeOption = {
  id: string;
  label: string;
};

async function throwApiError(response: Response, fallback: string): Promise<never> {
  const json = (await response.json().catch(() => ({}))) as { error?: string };
  throw new Error(json.error ?? fallback);
}

async function fetchSuggestions(): Promise<SuggestionsResponse> {
  const response = await fetch("/api/promo-food-style-suggestions", { cache: "no-store" });
  if (!response.ok) {
    await throwApiError(response, "Failed to load food style mappings");
  }
  return response.json() as Promise<SuggestionsResponse>;
}

async function createSuggestion(input: {
  styleId: string;
  styleLabel: string;
  watchlistText: string;
  priority: number;
  reason?: string | null;
}) {
  const response = await fetch("/api/promo-food-style-suggestions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    await throwApiError(response, "Failed to add mapping");
  }
  return response.json();
}

async function suggestMappingsWithAi(input: { styleLabel: string }): Promise<{
  suggestions: AiSuggestion[];
}> {
  const response = await fetch("/api/promo-food-style-suggestions/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    await throwApiError(response, "Failed to generate mappings");
  }
  return response.json() as Promise<{ suggestions: AiSuggestion[] }>;
}

async function deleteSuggestion(id: string) {
  const response = await fetch(`/api/promo-food-style-suggestions/${id}`, { method: "DELETE" });
  if (!response.ok) {
    await throwApiError(response, "Failed to remove mapping");
  }
}

export function FoodStyleIngredientMappingManager() {
  const queryClient = useQueryClient();
  const [styleId, setStyleId] = useState("");
  const [manualText, setManualText] = useState("");
  const [manualPriority, setManualPriority] = useState("100");
  const [aiDrafts, setAiDrafts] = useState<AiSuggestion[]>([]);
  const [selectedAiTexts, setSelectedAiTexts] = useState<Set<string>>(() => new Set());

  const suggestionsQuery = useQuery({
    queryKey: ["promo-food-style-suggestions"],
    queryFn: fetchSuggestions,
  });
  const foodTypesQuery = useQuery({
    queryKey: ["recipe-food-types"],
    queryFn: fetchFoodTypes,
  });

  const createMutation = useMutation({
    mutationFn: createSuggestion,
    onSuccess: async () => {
      setManualText("");
      setManualPriority("100");
      await queryClient.invalidateQueries({ queryKey: ["promo-food-style-suggestions"] });
    },
  });

  const aiMutation = useMutation({
    mutationFn: suggestMappingsWithAi,
    onSuccess: (data) => {
      setAiDrafts(data.suggestions);
      setSelectedAiTexts(new Set(data.suggestions.map((suggestion) => suggestion.watchlist_text)));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSuggestion,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["promo-food-style-suggestions"] });
    },
  });

  const foodTypes = useMemo<RecipeFoodTypeOption[]>(
    () => (Array.isArray(foodTypesQuery.data?.options) ? foodTypesQuery.data.options : []),
    [foodTypesQuery.data],
  );
  const activeStyleId = styleId || foodTypes[0]?.id || "";
  const activeStyleLabel = foodTypes.find((style) => style.id === activeStyleId)?.label ?? "";

  const mappings = useMemo(
    () =>
      findMappingsByFoodStyle(suggestionsQuery.data?.suggestions, activeStyleId),
    [activeStyleId, suggestionsQuery.data?.suggestions],
  );

  const error =
    suggestionsQuery.error instanceof Error
      ? suggestionsQuery.error.message
      : foodTypesQuery.error instanceof Error
        ? foodTypesQuery.error.message
        : createMutation.error instanceof Error
          ? createMutation.error.message
          : aiMutation.error instanceof Error
            ? aiMutation.error.message
            : deleteMutation.error instanceof Error
              ? deleteMutation.error.message
              : null;

  async function saveSelectedAiMappings() {
    if (!activeStyleId || !activeStyleLabel) {
      return;
    }
    const selected = aiDrafts.filter((suggestion) => selectedAiTexts.has(suggestion.watchlist_text));
    for (const suggestion of selected) {
      await createMutation.mutateAsync({
        styleId: activeStyleId,
        styleLabel: activeStyleLabel,
        watchlistText: suggestion.watchlist_text,
        priority: suggestion.priority,
        reason: suggestion.reason,
      });
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Food style ingredient mapping</CardTitle>
          <CardDescription>
            Manage the ingredients used when recipe generation, recipe search, and promo tools filter
            by food style.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground" id="style-mapping-style">
                Food style
              </span>
              <Select value={activeStyleId} onValueChange={setStyleId}>
                <SelectTrigger aria-labelledby="style-mapping-style">
                  <SelectValue placeholder="Choose food style" />
                </SelectTrigger>
                <SelectContent>
                  {foodTypes.map((style) => (
                    <SelectItem key={style.id} value={style.id}>
                      {style.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              disabled={!activeStyleLabel || aiMutation.isPending}
              onClick={() => aiMutation.mutate({ styleLabel: activeStyleLabel })}
            >
              {aiMutation.isPending ? "Generating..." : "Generate suggestions"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Manual mapping</CardTitle>
          <CardDescription>Add one ingredient phrase to the selected food style.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-[1fr_7rem_auto]">
            <Input
              value={manualText}
              onChange={(event) => setManualText(event.target.value)}
              placeholder={`Add item for ${activeStyleLabel || "style"}`}
            />
            <Input
              value={manualPriority}
              onChange={(event) => setManualPriority(event.target.value)}
              inputMode="numeric"
              placeholder="Priority"
            />
            <Button
              type="button"
              disabled={!activeStyleId || !activeStyleLabel || !manualText.trim() || createMutation.isPending}
              onClick={() =>
                createMutation.mutate({
                  styleId: activeStyleId,
                  styleLabel: activeStyleLabel,
                  watchlistText: manualText.trim(),
                  priority: Number.parseInt(manualPriority, 10) || 100,
                })
              }
            >
              {createMutation.isPending ? "Adding..." : "Add mapping"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {aiDrafts.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">AI suggestions</CardTitle>
            <CardDescription>Review generated ingredient phrases before saving.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={selectedAiTexts.size === 0 || createMutation.isPending}
                onClick={() => void saveSelectedAiMappings()}
              >
                Save selected ({selectedAiTexts.size})
              </Button>
              <Button type="button" variant="outline" onClick={() => setSelectedAiTexts(new Set())}>
                Clear selection
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {aiDrafts.map((suggestion) => {
                const checked = selectedAiTexts.has(suggestion.watchlist_text);
                return (
                  <label
                    key={suggestion.watchlist_text}
                    className="flex gap-3 rounded-md border bg-background p-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="mt-1 size-4 shrink-0"
                      checked={checked}
                      onChange={(event) => {
                        const next = new Set(selectedAiTexts);
                        if (event.target.checked) {
                          next.add(suggestion.watchlist_text);
                        } else {
                          next.delete(suggestion.watchlist_text);
                        }
                        setSelectedAiTexts(next);
                      }}
                    />
                    <span className="min-w-0">
                      <span className="block font-medium">{suggestion.watchlist_text}</span>
                      <span className="block text-xs text-muted-foreground">
                        {suggestion.reason}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current mappings ({mappings.length})</CardTitle>
          <CardDescription>{activeStyleLabel || "Choose a style"}.</CardDescription>
        </CardHeader>
        <CardContent>
          {suggestionsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading mappings...</p>
          ) : mappings.length === 0 ? (
            <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              No mappings saved for this food style yet.
            </p>
          ) : (
            <ul className="divide-y rounded-md border">
              {mappings.map((suggestion) => (
                <li
                  key={suggestion.id}
                  className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{suggestion.watchlist_text}</span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                        Priority {suggestion.priority}
                      </span>
                    </div>
                    {suggestion.reason ? (
                      <p className="mt-1 text-xs text-muted-foreground">{suggestion.reason}</p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full shrink-0 sm:w-auto"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(suggestion.id)}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
