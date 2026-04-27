"use client";

import type { RecipeGeneratorMeal } from "@agent/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
import { formatSavedRecipeSourceLabel } from "@/lib/recipe-source";
import { RECIPE_DIFFICULTIES, formatRecipeDifficulty } from "@/lib/recipe-difficulty";
import {
  type RecipeEditDraft,
  type SavedRecipeRow,
  savedRowToEditDraft,
} from "@/lib/saved-recipe-row";
import { markdownToRecipeSteps, recipeStepsToMarkdown } from "@/lib/recipe-steps-markdown";
import { cn } from "@/lib/utils";

const MEAL_KIND_OPTIONS = ["lunch", "dinner", "either", "snack", "other"] as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function throwApiError(response: Response, fallback: string): Promise<never> {
  const json = (await response.json().catch(() => ({}))) as { error?: string };
  throw new Error(json.error ?? fallback);
}

async function fetchRecipe(id: string): Promise<SavedRecipeRow> {
  const response = await fetch(`/api/recipes/${encodeURIComponent(id)}`, { cache: "no-store" });
  if (!response.ok) {
    await throwApiError(response, "Failed to load recipe");
  }
  const json = (await response.json()) as { recipe: SavedRecipeRow };
  return json.recipe;
}

type EditRecipePageProps = {
  recipeId: string;
};

export function EditRecipePage({ recipeId }: EditRecipePageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<RecipeEditDraft | null>(null);
  const [stepsText, setStepsText] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [similarUrl, setSimilarUrl] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const validId = UUID_RE.test(recipeId);

  const recipeQuery = useQuery({
    queryKey: ["recipe", recipeId],
    queryFn: () => fetchRecipe(recipeId),
    enabled: validId,
  });

  /* eslint-disable react-hooks/set-state-in-effect -- hydrate editable form state after the recipe query resolves. */
  useEffect(() => {
    const r = recipeQuery.data;
    if (!r) {
      return;
    }
    setDraft(savedRowToEditDraft(r));
    setStepsText(recipeStepsToMarkdown(r.steps));
    setCookTime(r.estimated_cook_time);
    setDifficulty(r.difficulty ?? "medium");
    setSimilarUrl(r.similar_recipe_url);
    setLocalError(null);
  }, [recipeQuery.data]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const saveMutation = useMutation({
    mutationFn: async (payload: {
      id: string;
      title: string;
      title_en: string;
      title_vi: string;
      summary: string;
      meal_kind: string;
      ingredients: RecipeGeneratorMeal["ingredients"];
      steps: string[];
      estimated_cook_time: string;
      difficulty: string;
      similar_recipe_url: string;
    }) => {
      const { id, ...rest } = payload;
      const response = await fetch(`/api/recipes/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rest),
      });
      if (!response.ok) {
        await throwApiError(response, "Update failed");
      }
      return response.json() as Promise<{ recipe: SavedRecipeRow }>;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["saved-recipes"] });
      await queryClient.invalidateQueries({ queryKey: ["recipe", recipeId] });
      router.push("/recipe-generator?tab=library");
    },
  });

  const recipe = recipeQuery.data;
  const saving = saveMutation.isPending;

  const onSave = () => {
    if (!draft || !recipe) {
      return;
    }
    const steps = markdownToRecipeSteps(stepsText);
    const ingredients = draft.ingredients.filter(
      (row) => row.ingredient_label.trim() && row.amount.trim() && row.text.trim(),
    );
    if (!draft.title.trim()) {
      setLocalError("Swedish title is required.");
      return;
    }
    if (ingredients.length === 0) {
      setLocalError("Add at least one complete ingredient row.");
      return;
    }
    if (steps.length === 0) {
      setLocalError("Add at least one step (use a numbered list like 1. … 2. …, or plain text).");
      return;
    }
    setLocalError(null);
    void saveMutation.mutateAsync({
      id: recipe.id,
      title: draft.title.trim(),
      title_en: draft.title_en.trim(),
      title_vi: draft.title_vi.trim(),
      summary: draft.summary.trim(),
      meal_kind: draft.meal_kind,
      ingredients,
      steps,
      estimated_cook_time: cookTime,
      difficulty,
      similar_recipe_url: similarUrl,
    });
  };

  if (!validId) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-sm text-muted-foreground">Invalid recipe id.</p>
        <Button asChild variant="link" className="mt-2 h-auto p-0">
          <Link href="/recipe-generator?tab=library">Back to library</Link>
        </Button>
      </main>
    );
  }

  if (recipeQuery.isLoading || (recipeQuery.isSuccess && !draft)) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-sm text-muted-foreground">Loading recipe…</p>
      </main>
    );
  }

  if (recipeQuery.isError) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-sm text-destructive">
          {recipeQuery.error instanceof Error ? recipeQuery.error.message : "Could not load recipe."}
        </p>
        <Button asChild variant="link" className="mt-2 h-auto p-0">
          <Link href="/recipe-generator?tab=library">Back to library</Link>
        </Button>
      </main>
    );
  }

  if (!draft || !recipe) {
    return null;
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-1 h-8 gap-1 px-2 text-muted-foreground">
            <Link href="/recipe-generator?tab=library">
              <ArrowLeft className="size-4" aria-hidden />
              Library
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">Edit recipe</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Update titles, ingredients, steps, and metadata. Changes are saved when you click Save.
          </p>
        </div>
      </div>

      {localError ? (
        <p className="rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {localError}
        </p>
      ) : null}
      {saveMutation.error instanceof Error ? (
        <p className="rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {saveMutation.error.message}
        </p>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-lg">Source information</CardTitle>
            <CardDescription>
              How this row was created and any raw text kept from an external recipe.{" "}
              <strong>Import from another source</strong> uses AI to parse markdown into
              summary, ingredients, steps, and time — then you apply it to this recipe.
            </CardDescription>
          </div>
          <Button asChild variant="secondary" size="sm" className="w-full shrink-0 sm:w-auto">
            <Link href={`/recipe-generator/${recipe.id}/import-from-source`}>
              Import from another source…
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <span className="text-muted-foreground">Recorded as: </span>
            <span className="text-foreground">{formatSavedRecipeSourceLabel(recipe.source)}</span>
          </p>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Raw markdown on file</p>
            {recipe.source_markdown?.trim() ? (
              <pre className="max-h-56 overflow-auto rounded-md border bg-muted/30 p-3 font-mono text-xs whitespace-pre-wrap">
                {recipe.source_markdown}
              </pre>
            ) : (
              <p className="text-muted-foreground">
                None saved yet. Use import to paste markdown from a blog, PDF export, or site
                clip.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Basics</CardTitle>
          <CardDescription>Swedish title, short summary, and when you eat this meal.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Title (Swedish)</span>
            <Input
              value={draft.title}
              onChange={(e) => setDraft((d) => (d ? { ...d, title: e.target.value } : d))}
              maxLength={200}
              disabled={saving}
            />
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Summary</span>
            <Textarea
              value={draft.summary}
              onChange={(e) => setDraft((d) => (d ? { ...d, summary: e.target.value } : d))}
              rows={4}
              maxLength={2000}
              disabled={saving}
            />
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Meal kind</span>
            <Select
              value={draft.meal_kind}
              onValueChange={(v) => setDraft((d) => (d ? { ...d, meal_kind: v } : d))}
              disabled={saving}
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Titles in other languages</CardTitle>
          <CardDescription>Optional translations used when you switch display language.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Title (English)</span>
            <Input
              value={draft.title_en}
              onChange={(e) => setDraft((d) => (d ? { ...d, title_en: e.target.value } : d))}
              maxLength={200}
              disabled={saving}
            />
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Title (Vietnamese)</span>
            <Input
              value={draft.title_vi}
              onChange={(e) => setDraft((d) => (d ? { ...d, title_vi: e.target.value } : d))}
              maxLength={200}
              disabled={saving}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Timing, difficulty & reference</CardTitle>
          <CardDescription>
            How hard it feels, how long it takes, and a link to a similar published recipe, if any.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Est. cook time</span>
            <Input
              value={cookTime}
              onChange={(e) => setCookTime(e.target.value)}
              placeholder="e.g. ca 35 min"
              maxLength={120}
              disabled={saving}
              className="max-w-md"
            />
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Difficulty</span>
            <Select value={difficulty} onValueChange={setDifficulty} disabled={saving}>
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
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Original recipe URL (optional)</span>
            <p className="text-xs text-muted-foreground">
              Link to the page this recipe came from (blog, magazine, cookbook site, …).
            </p>
            <Input
              type="url"
              inputMode="url"
              value={similarUrl}
              onChange={(e) => setSimilarUrl(e.target.value)}
              placeholder="https://…"
              maxLength={2000}
              disabled={saving}
              className="min-w-0"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ingredients</CardTitle>
          <CardDescription>Label, amount, and line text for shopping and cooking.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {draft.ingredients.map((row, i) => (
              <div
                key={`ed-ing-${i}`}
                className={cn(
                  "grid gap-2",
                  "sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)_auto]",
                )}
              >
                <Input
                  placeholder="Label"
                  value={row.ingredient_label}
                  disabled={saving}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDraft((d) => {
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
                  disabled={saving}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDraft((d) => {
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
                  disabled={saving}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDraft((d) => {
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
                  disabled={saving}
                  onClick={() =>
                    setDraft((d) => {
                      if (!d) {
                        return d;
                      }
                      return { ...d, ingredients: d.ingredients.filter((_, j) => j !== i) };
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
              disabled={saving}
              onClick={() =>
                setDraft((d) =>
                  d
                    ? {
                        ...d,
                        ingredients: [
                          ...d.ingredients,
                          { ingredient_label: "", amount: "", text: "" },
                        ],
                      }
                    : d,
                )
              }
            >
              Add row
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Steps</CardTitle>
          <CardDescription>
            Markdown: prefer a numbered list (<code className="rounded bg-muted px-1">1.</code>{" "}
            <code className="rounded bg-muted px-1">2.</code>) so each step is clear. Bold, line
            breaks inside a step, and links work. Plain paragraphs or bullet lines are also accepted
            when you save.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={stepsText}
            onChange={(e) => setStepsText(e.target.value)}
            rows={14}
            className="font-mono text-sm"
            disabled={saving}
          />
        </CardContent>
      </Card>

      <div className="sticky bottom-0 flex flex-col gap-3 border-t bg-background/95 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" disabled={saving} asChild>
          <Link href="/recipe-generator?tab=library">Cancel</Link>
        </Button>
        <Button type="button" disabled={saving} onClick={onSave}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </main>
  );
}
