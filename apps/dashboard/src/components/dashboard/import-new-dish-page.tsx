"use client";

import type { ParsedNewDishFromMarkdown, PromoMealPlanMealKind, RecipeIngredient } from "@agent/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Textarea } from "@/components/ui/textarea";
import { RecipeStepsDisplay } from "@/components/dashboard/recipe-steps-display";
import type { RecipeI18nColumn } from "@/lib/recipe-locale";
import { RECIPE_DIFFICULTIES, formatRecipeDifficulty } from "@/lib/recipe-difficulty";
import type { SaveRecipeBody } from "@/lib/recipe-request";
import { parseSaveRecipeBody } from "@/lib/recipe-request";
const MEAL_KINDS: PromoMealPlanMealKind[] = ["lunch", "dinner", "either", "snack", "other"];

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

async function throwApiError(response: Response, fallback: string): Promise<never> {
  const json = (await response.json().catch(() => ({}))) as { error?: string };
  throw new Error(json.error ?? fallback);
}

type EditableNewDish = ParsedNewDishFromMarkdown;

function i18nFromParsedNewDish(draft: ParsedNewDishFromMarkdown): RecipeI18nColumn | null {
  if (draft.source_language !== "en" && draft.source_language !== "vi") {
    return null;
  }
  if (
    !draft.source_language_summary.trim() ||
    draft.source_language_ingredients.length === 0 ||
    draft.source_language_steps.length === 0
  ) {
    return null;
  }
  const title =
    draft.source_language === "en"
      ? draft.title_en.trim() || draft.title
      : draft.title_vi.trim() || draft.title;
  const bundle = {
    title,
    summary: draft.source_language_summary,
    ingredients: draft.source_language_ingredients,
    steps: draft.source_language_steps,
    updated_at: new Date().toISOString(),
  };
  return draft.source_language === "en" ? { en: bundle } : { vi: bundle };
}

export function ImportNewDishPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const foodTypesQuery = useQuery({
    queryKey: ["recipe-food-types"],
    queryFn: fetchFoodTypes,
  });

  const [markdown, setMarkdown] = useState("");
  const [originalUrl, setOriginalUrl] = useState("");
  const [draft, setDraft] = useState<EditableNewDish | null>(null);
  const [pickLines, setPickLines] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const parseMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/recipes/parse-new-dish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown }),
      });
      if (!response.ok) {
        await throwApiError(response, "Parse failed");
      }
      const json = (await response.json()) as { parsed: ParsedNewDishFromMarkdown };
      return json.parsed;
    },
    onSuccess: (data) => {
      setDraft(data);
      setPickLines(data.ingredient_picks.join("\n"));
      setLocalError(null);
    },
    onError: (e) => {
      setDraft(null);
      setPickLines("");
      setLocalError(e instanceof Error ? e.message : "Parse failed");
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!draft) {
        throw new Error("Nothing to save");
      }
      const picks = pickLines
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      if (picks.length === 0) {
        throw new Error("Add at least one ingredient pick (shopping keyword), one per line.");
      }
      const body: Record<string, unknown> = {
        title: draft.title,
        title_en: draft.title_en,
        title_vi: draft.title_vi,
        summary: draft.summary,
        meal_kind: draft.meal_kind,
        food_type_id: draft.food_type_id,
        vegetarian: draft.vegetarian,
        ingredient_picks: picks,
        ingredients: draft.ingredients,
        steps: draft.steps,
        estimated_cook_time: draft.estimated_cook_time,
        difficulty: draft.difficulty,
        source_markdown: markdown.trim(),
        similar_recipe_url: originalUrl.trim(),
        i18n: i18nFromParsedNewDish(draft),
      };
      const parsed = parseSaveRecipeBody(body);
      if ("error" in parsed) {
        throw new Error(parsed.error);
      }
      const response = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed satisfies SaveRecipeBody),
      });
      if (!response.ok) {
        await throwApiError(response, "Could not save recipe");
      }
      return response.json() as Promise<{ recipe: { id: string } }>;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["saved-recipes"] });
      router.push(`/recipe-generator/${data.recipe.id}/edit`);
    },
    onError: (e) => {
      setLocalError(e instanceof Error ? e.message : "Save failed");
    },
  });

  const busy = parseMutation.isPending || saveMutation.isPending;

  const foodOptions = foodTypesQuery.data?.options ?? [];

  const ingredientsTable = useMemo(() => draft?.ingredients ?? [], [draft?.ingredients]);

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-1 h-8 gap-1 px-2 text-muted-foreground">
          <Link href="/recipe-generator?tab=import">
            <ArrowLeft className="size-4" aria-hidden />
            Recipe generator · Import
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">New dish from a source</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste markdown from a recipe you trust. AI proposes a Swedish title, meal type, food
          style, ingredients, steps, and time — review and edit, then save to your library.
        </p>
      </div>

      {localError ? (
        <p className="rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {localError}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Source</CardTitle>
          <CardDescription>URL is optional; markdown can be a full export or a copy-paste.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Original recipe URL (optional)</span>
            <Input
              type="url"
              inputMode="url"
              value={originalUrl}
              onChange={(e) => setOriginalUrl(e.target.value)}
              placeholder="https://…"
              maxLength={2000}
              disabled={busy}
            />
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Markdown</span>
            <Textarea
              value={markdown}
              onChange={(e) => {
                setMarkdown(e.target.value);
                setDraft(null);
                setPickLines("");
              }}
              rows={14}
              placeholder="Paste exported markdown or the recipe body…"
              className="font-mono text-sm"
              disabled={busy}
            />
          </div>
          <Button type="button" disabled={busy || !markdown.trim()} onClick={() => void parseMutation.mutateAsync()}>
            {parseMutation.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                Parsing…
              </>
            ) : (
              "Parse with AI"
            )}
          </Button>
        </CardContent>
      </Card>

      {draft ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What AI detected — edit before saving</CardTitle>
              <CardDescription>
                Titles and classification follow your presets (food styles match the recipe generator).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <span className="text-xs font-medium text-muted-foreground">Title (Swedish)</span>
                  <Input
                    value={draft.title}
                    onChange={(e) => setDraft((d) => (d ? { ...d, title: e.target.value } : d))}
                    maxLength={200}
                    disabled={busy}
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Title (English)</span>
                  <Input
                    value={draft.title_en}
                    onChange={(e) => setDraft((d) => (d ? { ...d, title_en: e.target.value } : d))}
                    maxLength={200}
                    disabled={busy}
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Title (Vietnamese)</span>
                  <Input
                    value={draft.title_vi}
                    onChange={(e) => setDraft((d) => (d ? { ...d, title_vi: e.target.value } : d))}
                    maxLength={200}
                    disabled={busy}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Meal kind</span>
                  <Select
                    value={draft.meal_kind}
                    onValueChange={(v) =>
                      setDraft((d) =>
                        d ? { ...d, meal_kind: v as PromoMealPlanMealKind } : d,
                      )
                    }
                    disabled={busy}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MEAL_KINDS.map((k) => (
                        <SelectItem key={k} value={k}>
                          {k}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Type of food</span>
                  <Select
                    value={draft.food_type_id}
                    onValueChange={(v) => setDraft((d) => (d ? { ...d, food_type_id: v } : d))}
                    disabled={busy || foodOptions.length === 0}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Choose style" />
                    </SelectTrigger>
                    <SelectContent>
                      {foodOptions.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  className="size-4 shrink-0"
                  checked={draft.vegetarian}
                  onChange={(e) =>
                    setDraft((d) => (d ? { ...d, vegetarian: e.target.checked } : d))
                  }
                  disabled={busy}
                />
                <span>Vegetarian (no meat or fish)</span>
              </label>

              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Summary</span>
                <Textarea
                  value={draft.summary}
                  onChange={(e) => setDraft((d) => (d ? { ...d, summary: e.target.value } : d))}
                  rows={3}
                  maxLength={2000}
                  disabled={busy}
                />
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Ingredient picks (shopping keywords, one per line)
                </span>
                <p className="text-xs text-muted-foreground">
                  Used as quick ICA-style tags. AI fills a first pass — adjust if needed.
                </p>
                <Textarea
                  value={pickLines}
                  onChange={(e) => setPickLines(e.target.value)}
                  rows={5}
                  className="font-mono text-sm"
                  disabled={busy}
                />
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Ingredients</p>
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full min-w-[20rem] border-collapse text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-2 py-1.5 text-left font-medium">Label</th>
                        <th className="px-2 py-1.5 text-left font-medium">Amount</th>
                        <th className="px-2 py-1.5 text-left font-medium">Text</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ingredientsTable.map((row, i) => (
                        <tr key={`ing-${i}`} className="border-b last:border-0">
                          <td className="px-2 py-1.5 align-top">
                            <Input
                              className="h-8 min-w-[5rem] text-sm"
                              value={row.ingredient_label}
                              disabled={busy}
                              onChange={(e) => {
                                const v = e.target.value;
                                setDraft((d) => {
                                  if (!d) {
                                    return d;
                                  }
                                  const next = [...d.ingredients] as RecipeIngredient[];
                                  next[i] = { ...next[i]!, ingredient_label: v };
                                  return { ...d, ingredients: next };
                                });
                              }}
                            />
                          </td>
                          <td className="px-2 py-1.5 align-top">
                            <Input
                              className="h-8 min-w-[5rem] text-sm"
                              value={row.amount}
                              disabled={busy}
                              onChange={(e) => {
                                const v = e.target.value;
                                setDraft((d) => {
                                  if (!d) {
                                    return d;
                                  }
                                  const next = [...d.ingredients];
                                  next[i] = { ...next[i]!, amount: v };
                                  return { ...d, ingredients: next };
                                });
                              }}
                            />
                          </td>
                          <td className="px-2 py-1.5 align-top">
                            <Input
                              className="h-8 min-w-[8rem] text-sm"
                              value={row.text}
                              disabled={busy}
                              onChange={(e) => {
                                const v = e.target.value;
                                setDraft((d) => {
                                  if (!d) {
                                    return d;
                                  }
                                  const next = [...d.ingredients];
                                  next[i] = { ...next[i]!, text: v };
                                  return { ...d, ingredients: next };
                                });
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Est. cook time</span>
                <Input
                  value={draft.estimated_cook_time}
                  onChange={(e) =>
                    setDraft((d) => (d ? { ...d, estimated_cook_time: e.target.value } : d))
                  }
                  placeholder="e.g. ca 35 min"
                  maxLength={120}
                  className="max-w-md"
                  disabled={busy}
                />
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Difficulty</span>
                <Select
                  value={draft.difficulty}
                  onValueChange={(value) =>
                    setDraft((d) => (d ? { ...d, difficulty: value as typeof d.difficulty } : d))
                  }
                  disabled={busy}
                >
                  <SelectTrigger className="h-9 w-full max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RECIPE_DIFFICULTIES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {formatRecipeDifficulty(value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Steps</p>
                <RecipeStepsDisplay className="list-decimal space-y-1.5 pl-5" steps={draft.steps} />
                <p className="mt-2 text-xs text-muted-foreground">
                  To change steps in detail, save first — then edit the recipe (markdown steps).
                </p>
              </div>

              <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" disabled={busy} asChild>
                  <Link href="/recipe-generator?tab=import">Cancel</Link>
                </Button>
                <Button
                  type="button"
                  disabled={busy || !draft.title.trim()}
                  onClick={() => {
                    setLocalError(null);
                    void saveMutation.mutateAsync();
                  }}
                >
                  {saveMutation.isPending ? "Saving…" : "Save to library"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </main>
  );
}
