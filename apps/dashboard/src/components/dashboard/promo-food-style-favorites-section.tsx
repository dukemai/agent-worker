"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { FoodStyleFavoriteSuggestionRow } from "@/app/api/promo-food-style-suggestions/route";
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

type RecipeFoodTypesResponse = {
  options: RecipeFoodTypeOption[];
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

async function fetchRecipeFoodTypes(): Promise<RecipeFoodTypeOption[]> {
  const response = await fetch("/data/recipe-food-types.json", { cache: "no-store" });
  if (!response.ok) {
    await throwApiError(response, "Failed to load recipe food styles");
  }
  const data = (await response.json()) as RecipeFoodTypesResponse;
  if (!Array.isArray(data.options)) {
    throw new Error("Recipe food styles file is missing options");
  }
  return data.options.filter(
    (option): option is RecipeFoodTypeOption =>
      typeof option.id === "string" &&
      option.id.trim().length > 0 &&
      typeof option.label === "string" &&
      option.label.trim().length > 0,
  );
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
    await throwApiError(response, "Failed to add suggestion");
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
    await throwApiError(response, "Failed to generate suggestions");
  }
  return response.json() as Promise<{ suggestions: AiSuggestion[] }>;
}

async function deleteSuggestion(id: string) {
  const response = await fetch(`/api/promo-food-style-suggestions/${id}`, { method: "DELETE" });
  if (!response.ok) {
    await throwApiError(response, "Failed to remove suggestion");
  }
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
  const queryClient = useQueryClient();
  const [selectedStyle, setSelectedStyle] = useState<string>("");
  const [selectedTexts, setSelectedTexts] = useState<Set<string>>(() => new Set());
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminStyleId, setAdminStyleId] = useState("");
  const [adminText, setAdminText] = useState("");
  const [adminPriority, setAdminPriority] = useState("100");
  const [aiDrafts, setAiDrafts] = useState<AiSuggestion[]>([]);
  const [selectedAiTexts, setSelectedAiTexts] = useState<Set<string>>(() => new Set());

  const suggestionsQuery = useQuery({
    queryKey: ["promo-food-style-suggestions"],
    queryFn: fetchSuggestions,
  });

  const foodTypesQuery = useQuery({
    queryKey: ["recipe-food-types"],
    queryFn: fetchRecipeFoodTypes,
  });

  const createMutation = useMutation({
    mutationFn: createSuggestion,
    onSuccess: async () => {
      setAdminText("");
      setAdminPriority("100");
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

  const suggestions = useMemo(
    () => suggestionsQuery.data?.suggestions ?? [],
    [suggestionsQuery.data?.suggestions],
  );
  console.log("Loaded suggestions:", suggestions);
  const mappedStyleLabels = useMemo(() => {
    const map = new Map<string, string>();
    for (const suggestion of suggestions) {
      map.set(suggestion.style_id, suggestion.style_label);
    }
    return map;
  }, [suggestions]);

  const recipeFoodTypes = useMemo(
    () => foodTypesQuery.data ?? [],
    [foodTypesQuery.data],
  );
  const styles = useMemo(
    () => [...mappedStyleLabels.entries()].map(([id, label]) => ({ id, label })),
    [mappedStyleLabels],
  );
  const adminStyles = useMemo(() => {
    if (recipeFoodTypes.length > 0) {
      return recipeFoodTypes;
    }
    return [...mappedStyleLabels.entries()].map(([id, label]) => ({ id, label }));
  }, [mappedStyleLabels, recipeFoodTypes]);

  const activeStyle = selectedStyle || styles[0]?.id || "";
  const activeStyleLabel = styles.find((style) => style.id === activeStyle)?.label ?? "";
  const activeSuggestions = suggestions.filter((suggestion) => suggestion.style_id === activeStyle);
  const watchlistSet = useMemo(() => new Set(watchlistItems), [watchlistItems]);
  const adminStyleLabel =
    adminStyles.find((style) => style.id === adminStyleId)?.label ??
    mappedStyleLabels.get(adminStyleId) ??
    "";
  const adminMappings = useMemo(
    () =>
      suggestions
        .filter((suggestion) => suggestion.style_id === adminStyleId.trim())
        .slice()
        .sort((a, b) =>
          a.priority === b.priority
            ? a.watchlist_text.localeCompare(b.watchlist_text, "sv")
            : a.priority - b.priority,
        ),
    [adminStyleId, suggestions],
  );

  function openAdminModal() {
    const styleId = activeStyle || adminStyleId || adminStyles[0]?.id || "";
    setAdminStyleId(styleId);
    setAdminOpen(true);
  }

  async function saveSelectedAiMappings() {
    const styleId = adminStyleId.trim();
    const styleLabel = adminStyleLabel.trim();
    if (!styleId || !styleLabel) {
      onError("Style id and label are required before saving AI suggestions");
      return;
    }
    const selected = aiDrafts.filter((suggestion) => selectedAiTexts.has(suggestion.watchlist_text));
    for (const suggestion of selected) {
      await createMutation.mutateAsync({
        styleId,
        styleLabel,
        watchlistText: suggestion.watchlist_text,
        priority: suggestion.priority,
        reason: suggestion.reason,
      });
    }
  }

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

  const mutationError =
    createMutation.error instanceof Error
      ? createMutation.error.message
      : deleteMutation.error instanceof Error
        ? deleteMutation.error.message
        : aiMutation.error instanceof Error
          ? aiMutation.error.message
          : null;
  const queryError = suggestionsQuery.error instanceof Error ? suggestionsQuery.error.message : null;
  const foodTypesError =
    foodTypesQuery.error instanceof Error ? foodTypesQuery.error.message : null;

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
        {queryError || mutationError || foodTypesError ? (
          <p className="text-sm text-red-600">{queryError ?? mutationError ?? foodTypesError}</p>
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
                onClick={openAdminModal}
              >
                Manage mapping
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
                  No mappings for this recipe food style yet. Open Manage mapping and generate
                  suggestions from the ICA catalog.
                </div>
              )}
            </div>

          </>
        ) : !suggestionsQuery.isLoading && !foodTypesQuery.isLoading ? (
          <div className="flex flex-col gap-3 rounded-lg border border-dashed p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              No food style mappings yet. Create one manually or generate suggestions with AI.
            </p>
            <Button type="button" variant="outline" onClick={openAdminModal}>
              Manage mapping
            </Button>
          </div>
        ) : null}

        <Dialog open={adminOpen} onOpenChange={setAdminOpen}>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Manage food-style mapping</DialogTitle>
              <DialogDescription>
                Add or remove watchlist suggestions for a food style. AI uses the food style plus
                ICA categories and catalog items to propose initial mappings.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1 text-sm">
                <span className="font-medium">Recipe food style</span>
                <Select value={adminStyleId} onValueChange={setAdminStyleId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose recipe food style" />
                  </SelectTrigger>
                  <SelectContent>
                    {adminStyles.map((style) => (
                      <SelectItem key={style.id} value={style.id}>
                        {style.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-lg border border-dashed p-3">
                <h3 className="mb-3 text-sm font-medium">AI suggestions from ICA catalog</h3>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    disabled={!adminStyleLabel.trim() || aiMutation.isPending}
                    onClick={() => aiMutation.mutate({ styleLabel: adminStyleLabel.trim() })}
                  >
                    {aiMutation.isPending ? "Generating..." : "Generate suggestions"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={
                      createMutation.isPending ||
                      selectedAiTexts.size === 0 ||
                      !adminStyleId.trim() ||
                      !adminStyleLabel.trim()
                    }
                    onClick={() => void saveSelectedAiMappings()}
                  >
                    Save selected AI items ({selectedAiTexts.size})
                  </Button>
                </div>

                {aiDrafts.length > 0 ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
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
                            <span className="block font-medium">
                              {suggestion.watchlist_text}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {suggestion.reason}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              <div className="rounded-lg border border-dashed p-3">
                <h3 className="mb-3 text-sm font-medium">Manual mapping</h3>
                <div className="grid gap-2 sm:grid-cols-[1fr_7rem_auto]">
                  <Input
                    value={adminText}
                    onChange={(event) => setAdminText(event.target.value)}
                    placeholder={`Add item for ${adminStyleLabel || "style"}`}
                  />
                  <Input
                    value={adminPriority}
                    onChange={(event) => setAdminPriority(event.target.value)}
                    inputMode="numeric"
                    placeholder="Priority"
                  />
                  <Button
                    type="button"
                    disabled={
                      !adminStyleId.trim() ||
                      !adminStyleLabel.trim() ||
                      !adminText.trim() ||
                      createMutation.isPending
                    }
                    onClick={() =>
                      createMutation.mutate({
                        styleId: adminStyleId.trim(),
                        styleLabel: adminStyleLabel.trim(),
                        watchlistText: adminText.trim(),
                        priority: Number.parseInt(adminPriority, 10) || 100,
                      })
                    }
                  >
                    {createMutation.isPending ? "Adding..." : "Add mapping"}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">
                  Current mappings ({adminMappings.length})
                </h3>
                {adminMappings.length > 0 ? (
                  <ul className="divide-y rounded-md border">
                    {adminMappings.map((suggestion) => (
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
                              <p className="mt-1 text-xs text-muted-foreground">
                                {suggestion.reason}
                              </p>
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
                ) : (
                  <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                    No mappings saved for this food style yet.
                  </p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
