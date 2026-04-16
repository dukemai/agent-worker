"use client";

import type { ParsedRecipeFromMarkdownImport, RecipeIngredient } from "@agent/shared";
import { RECIPE_SOURCE_MANUAL_MARKDOWN } from "@agent/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RecipeStepsDisplay } from "@/components/dashboard/recipe-steps-display";
import { formatSavedRecipeSourceLabel } from "@/lib/recipe-source";
import type { SavedRecipeRow } from "@/lib/saved-recipe-row";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function throwApiError(response: Response, fallback: string): Promise<never> {
  const json = (await response.json().catch(() => ({}))) as { error?: string };
  throw new Error(json.error ?? fallback);
}

function IngredientsTable({ rows }: { rows: RecipeIngredient[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-md border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
        No ingredients
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[14rem] border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-2 py-1.5 text-left font-medium">Label</th>
            <th className="px-2 py-1.5 text-left font-medium">Amount</th>
            <th className="px-2 py-1.5 text-left font-medium">Text</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`ing-${i}`} className="border-b last:border-0">
              <td className="px-2 py-1.5 align-top">{row.ingredient_label}</td>
              <td className="px-2 py-1.5 align-top">{row.amount}</td>
              <td className="px-2 py-1.5 align-top">{row.text}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StepsBlock({ steps }: { steps: string[] }) {
  if (steps.length === 0) {
    return (
      <p className="rounded-md border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
        No steps
      </p>
    );
  }
  return <RecipeStepsDisplay className="list-decimal space-y-1.5 pl-5 text-sm" steps={steps} />;
}

async function fetchRecipe(id: string): Promise<SavedRecipeRow> {
  const response = await fetch(`/api/recipes/${encodeURIComponent(id)}`, { cache: "no-store" });
  if (!response.ok) {
    await throwApiError(response, "Failed to load recipe");
  }
  const json = (await response.json()) as { recipe: SavedRecipeRow };
  return json.recipe;
}

const RECIPE_GENERATOR_IMPORT_TAB = "/recipe-generator?tab=import";

type ImportRecipeFromSourcePageProps = {
  recipeId: string;
  /**
   * When true, layout is nested under Recipe generator → Import (no full-page chrome).
   * Back/cancel targets return to the import tab without a selected recipe.
   */
  embedInRecipeGenerator?: boolean;
};

export function ImportRecipeFromSourcePage({
  recipeId,
  embedInRecipeGenerator = false,
}: ImportRecipeFromSourcePageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const validId = UUID_RE.test(recipeId);

  const [markdown, setMarkdown] = useState("");
  const [originalUrl, setOriginalUrl] = useState("");
  const [parsed, setParsed] = useState<ParsedRecipeFromMarkdownImport | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const seededFromRecipe = useRef(false);

  const recipeQuery = useQuery({
    queryKey: ["recipe", recipeId],
    queryFn: () => fetchRecipe(recipeId),
    enabled: validId,
  });

  const recipe = recipeQuery.data;

  useEffect(() => {
    if (!recipe || seededFromRecipe.current) {
      return;
    }
    seededFromRecipe.current = true;
    setMarkdown(recipe.source_markdown?.trim() ?? "");
    setOriginalUrl(recipe.similar_recipe_url?.trim() ?? "");
  }, [recipe]);

  const parseMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `/api/recipes/${encodeURIComponent(recipeId)}/parse-import`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markdown }),
        },
      );
      if (!response.ok) {
        await throwApiError(response, "Parse failed");
      }
      const json = (await response.json()) as { parsed: ParsedRecipeFromMarkdownImport };
      return json.parsed;
    },
    onSuccess: (data) => {
      setParsed(data);
      setLocalError(null);
    },
    onError: (e) => {
      setParsed(null);
      setLocalError(e instanceof Error ? e.message : "Parse failed");
    },
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!parsed || !recipe) {
        throw new Error("Nothing to apply");
      }
      const response = await fetch(`/api/recipes/${encodeURIComponent(recipeId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: parsed.summary,
          ingredients: parsed.ingredients,
          steps: parsed.steps,
          estimated_cook_time: parsed.estimated_cook_time.trim() || recipe.estimated_cook_time,
          source_markdown: markdown.trim(),
          similar_recipe_url: originalUrl.trim(),
          source: RECIPE_SOURCE_MANUAL_MARKDOWN,
        }),
      });
      if (!response.ok) {
        await throwApiError(response, "Could not save recipe");
      }
      return response.json() as Promise<{ recipe: SavedRecipeRow }>;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["saved-recipes"] });
      await queryClient.invalidateQueries({ queryKey: ["recipe", recipeId] });
      router.push(`/recipe-generator/${recipeId}/edit`);
    },
    onError: (e) => {
      setLocalError(e instanceof Error ? e.message : "Save failed");
    },
  });

  const busy = parseMutation.isPending || applyMutation.isPending;

  const exitHref = embedInRecipeGenerator
    ? RECIPE_GENERATOR_IMPORT_TAB
    : `/recipe-generator/${recipeId}/edit`;
  const exitErrorHref = embedInRecipeGenerator
    ? RECIPE_GENERATOR_IMPORT_TAB
    : "/recipe-generator?tab=library";
  const Shell = embedInRecipeGenerator ? "div" : "main";

  if (!validId) {
    return (
      <Shell className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-sm text-muted-foreground">Invalid recipe id.</p>
        <Button asChild variant="link" className="mt-2 h-auto p-0">
          <Link href={exitErrorHref}>
            {embedInRecipeGenerator ? "Back to import" : "Back to library"}
          </Link>
        </Button>
      </Shell>
    );
  }

  if (recipeQuery.isLoading) {
    return (
      <Shell className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-sm text-muted-foreground">Loading recipe…</p>
      </Shell>
    );
  }

  if (recipeQuery.isError || !recipe) {
    return (
      <Shell className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-sm text-destructive">
          {recipeQuery.error instanceof Error
            ? recipeQuery.error.message
            : "Could not load recipe."}
        </p>
        <Button asChild variant="link" className="mt-2 h-auto p-0">
          <Link href={exitErrorHref}>
            {embedInRecipeGenerator ? "Back to import" : "Back to library"}
          </Link>
        </Button>
      </Shell>
    );
  }

  const compareWide = Boolean(parsed);

  return (
    <Shell
      className={`mx-auto w-full space-y-6 ${embedInRecipeGenerator ? "py-2" : "px-4 py-8"} ${compareWide ? "max-w-6xl" : "max-w-3xl"}`}
    >
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-1 h-8 gap-1 px-2 text-muted-foreground">
          <Link href={exitHref}>
            <ArrowLeft className="size-4" aria-hidden />
            {embedInRecipeGenerator ? "Choose another recipe" : "Back to edit"}
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Import from another source</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste markdown from a recipe you trust. AI extracts summary, ingredients, steps, and
          timing. Review the preview, then apply to update this saved recipe (titles and meal kind
          stay as you set them in edit unless you change them later).
        </p>
      </div>

      {localError ? (
        <p className="rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {localError}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recipe you are filling</CardTitle>
          <CardDescription>
            Structured fields below will replace summary, ingredients, steps, and timings for this
            row only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Title (SV): </span>
            <span className="font-medium text-foreground">{recipe.title}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Meal kind: </span>
            <span className="capitalize">{recipe.meal_kind}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Current source label: </span>
            {formatSavedRecipeSourceLabel(recipe.source)}
          </p>
          {recipe.summary.trim() ? (
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Current summary: </span>
              {recipe.summary.length > 240 ? `${recipe.summary.slice(0, 240)}…` : recipe.summary}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Source text & link</CardTitle>
          <CardDescription>
            Paste full or partial markdown from the original page. Add the canonical URL if you
            want it stored on the recipe.
          </CardDescription>
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
                setParsed(null);
              }}
              rows={16}
              placeholder="Paste exported markdown or copy from the recipe page…"
              className="font-mono text-sm"
              disabled={busy}
            />
          </div>
          <Button
            type="button"
            disabled={busy || !markdown.trim()}
            onClick={() => void parseMutation.mutateAsync()}
          >
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

      {parsed ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Preview & compare</CardTitle>
            <CardDescription>
              Compare each section with what is saved now. Apply replaces summary, ingredients,
              steps, and cook time on this recipe.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-sm">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5 rounded-lg border bg-muted/20 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Current summary
                </p>
                {recipe.summary.trim() ? (
                  <p className="text-foreground">{recipe.summary}</p>
                ) : (
                  <p className="text-muted-foreground italic">Empty</p>
                )}
              </div>
              <div className="space-y-1.5 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  From import
                </p>
                <p className="text-foreground">{parsed.summary}</p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <p className="md:col-span-1">
                <span className="text-muted-foreground">Current cook time: </span>
                <span>{recipe.estimated_cook_time.trim() || "—"}</span>
              </p>
              <p className="md:col-span-1">
                <span className="text-muted-foreground">Import cook time: </span>
                <span>{parsed.estimated_cook_time.trim() || "—"}</span>
              </p>
            </div>

            <div>
              <p className="mb-3 text-xs font-medium text-muted-foreground">Ingredients</p>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-foreground">Current recipe</p>
                  <IngredientsTable rows={recipe.ingredients} />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-primary">From import (preview)</p>
                  <IngredientsTable rows={parsed.ingredients} />
                </div>
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs font-medium text-muted-foreground">Steps</p>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-foreground">Current recipe</p>
                  <StepsBlock steps={recipe.steps} />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-primary">From import (preview)</p>
                  <StepsBlock steps={parsed.steps} />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" disabled={busy} asChild>
                <Link href={exitHref}>Cancel</Link>
              </Button>
              <Button
                type="button"
                disabled={busy}
                onClick={() => void applyMutation.mutateAsync()}
              >
                {applyMutation.isPending ? "Saving…" : "Apply to recipe"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </Shell>
  );
}
