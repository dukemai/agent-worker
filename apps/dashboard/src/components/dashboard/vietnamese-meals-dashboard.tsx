"use client";

import type { RecipeGenerateResult, VietnameseMealDraft } from "@agent/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Database, Loader2, Pencil, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { normalizeExcludeMealTitles } from "@/lib/recipe-request";
import type { VietnameseMealRow, VietnameseMealStatus } from "@/lib/vietnamese-meals";
import {
  deleteVietnameseMeal,
  enrichVietnameseMeals,
  fetchVietnameseMeals,
  generateVietnameseRecipeSuggestions,
  saveRecipeFromVietnameseMeal,
  saveVietnameseMealDrafts,
  updateVietnameseMeal,
} from "./vietnamese-meals-api";
import { DraftCard, TagBadges, draftFromMeal } from "./vietnamese-meals-draft-card";

const ALL_STATUS = "all";

function ingredientPicksFromMeals(meals: VietnameseMealRow[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const meal of meals) {
    for (const ingredient of meal.typical_ingredients) {
      const label = ingredient.name || ingredient.name_vi;
      if (!label || seen.has(label)) continue;
      seen.add(label);
      out.push(label);
      if (out.length >= 15) return out;
    }
  }
  return out;
}

export function VietnameseMealsDashboard() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>(ALL_STATUS);
  const [search, setSearch] = useState("");
  const [bulkNames, setBulkNames] = useState("");
  const [drafts, setDrafts] = useState<VietnameseMealDraft[]>([]);
  const [editMeal, setEditMeal] = useState<VietnameseMealRow | null>(null);
  const [selectedMealIds, setSelectedMealIds] = useState<string[]>([]);
  const [excludeText, setExcludeText] = useState("");
  const [suggestions, setSuggestions] = useState<RecipeGenerateResult | null>(null);
  const [suggestionMealIds, setSuggestionMealIds] = useState<string[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);

  const mealsQuery = useQuery({
    queryKey: ["vietnamese-meals", status, search],
    queryFn: () => fetchVietnameseMeals({ status, search }),
  });

  const allMealsQuery = useQuery({
    queryKey: ["vietnamese-meals", "published-for-inspiration"],
    queryFn: () => fetchVietnameseMeals({ status: "published" }),
  });

  const meals = useMemo(() => mealsQuery.data ?? [], [mealsQuery.data]);
  const publishedMeals = useMemo(() => allMealsQuery.data ?? [], [allMealsQuery.data]);
  const mealStatusCounts = useMemo(
    () =>
      meals.reduce(
        (acc, meal) => {
          acc[meal.status] += 1;
          return acc;
        },
        { draft: 0, published: 0, archived: 0 } satisfies Record<VietnameseMealStatus, number>,
      ),
    [meals],
  );
  const selectedMeals = useMemo(
    () => publishedMeals.filter((meal) => selectedMealIds.includes(meal.id)),
    [publishedMeals, selectedMealIds],
  );

  const enrichMutation = useMutation({
    mutationFn: async () => {
      const names = bulkNames
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      return enrichVietnameseMeals(names);
    },
    onSuccess: (data) => {
      setDrafts(data.drafts);
      setLocalError(null);
    },
    onError: (e) => setLocalError(e instanceof Error ? e.message : "Enrichment failed"),
  });

  const saveDraftsMutation = useMutation({
    mutationFn: async () => saveVietnameseMealDrafts(drafts),
    onSuccess: async () => {
      setDrafts([]);
      setBulkNames("");
      setLocalError(null);
      await queryClient.invalidateQueries({ queryKey: ["vietnamese-meals"] });
    },
    onError: (e) => setLocalError(e instanceof Error ? e.message : "Save failed"),
  });

  const updateMutation = useMutation({
    mutationFn: async (meal: VietnameseMealRow) => updateVietnameseMeal(meal.id, meal),
    onSuccess: async () => {
      setEditMeal(null);
      await queryClient.invalidateQueries({ queryKey: ["vietnamese-meals"] });
    },
    onError: (e) => setLocalError(e instanceof Error ? e.message : "Update failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteVietnameseMeal,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["vietnamese-meals"] });
    },
    onError: (e) => setLocalError(e instanceof Error ? e.message : "Delete failed"),
  });

  const suggestionMutation = useMutation({
    mutationFn: async () =>
      generateVietnameseRecipeSuggestions({
        mealIds: selectedMealIds,
        excludeMealTitles: normalizeExcludeMealTitles(
          excludeText
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
        ),
      }),
    onSuccess: (data) => {
      setSuggestions(data.result);
      setSuggestionMealIds(data.meta.source_meal_ids);
      setLocalError(null);
    },
    onError: (e) => setLocalError(e instanceof Error ? e.message : "Suggestion failed"),
  });

  const saveRecipeMutation = useMutation({
    mutationFn: async (meal: RecipeGenerateResult["meals"][number]) =>
      saveRecipeFromVietnameseMeal({
        meal,
        sourceMealIds: suggestionMealIds,
        ingredientPicks: ingredientPicksFromMeals(selectedMeals),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["saved-recipes"] });
      await queryClient.invalidateQueries({ queryKey: ["vietnamese-meals"] });
    },
    onError: (e) => setLocalError(e instanceof Error ? e.message : "Recipe save failed"),
  });

  const busy =
    enrichMutation.isPending ||
    saveDraftsMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    suggestionMutation.isPending ||
    saveRecipeMutation.isPending;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vietnamese meals</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Curate meal ideas first, then turn selected dishes into recipe-library suggestions.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/recipe-generator?tab=library">
            <Database className="mr-2 size-4" aria-hidden />
            Recipe library
          </Link>
        </Button>
      </div>

      {localError ? (
        <p className="rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {localError}
        </p>
      ) : null}

      <Tabs defaultValue="meals" className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="meals">Meals</TabsTrigger>
          <TabsTrigger value="add">Add meals</TabsTrigger>
          <TabsTrigger value="inspiration">Recipe inspiration</TabsTrigger>
        </TabsList>

        <TabsContent value="meals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Catalog</CardTitle>
              <CardDescription>Search and manage reviewed Vietnamese meal rows.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="default">{meals.length} meals</Badge>
                <Badge variant="secondary">{mealStatusCounts.published} published</Badge>
                <Badge variant="secondary">{mealStatusCounts.draft} draft</Badge>
                <Badge variant="outline">{mealStatusCounts.archived} archived</Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_STATUS}>All statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search Vietnamese or English name"
                />
              </div>

              {mealsQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading meals…</p>
              ) : meals.length === 0 ? (
                <p className="text-sm text-muted-foreground">No Vietnamese meals yet.</p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Meal</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium">Regions</th>
                        <th className="px-3 py-2 font-medium">Base/protein</th>
                        <th className="px-3 py-2 font-medium">Recipes</th>
                        <th className="px-3 py-2 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {meals.map((meal) => (
                        <tr key={meal.id} className="border-t align-top">
                          <td className="max-w-sm px-3 py-3">
                            <div className="font-medium">{meal.name_vi}</div>
                            <div className="text-muted-foreground">{meal.name_en}</div>
                            <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {meal.summary}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <Badge variant={meal.status === "published" ? "default" : "secondary"}>
                              {meal.status}
                            </Badge>
                          </td>
                          <td className="px-3 py-3">
                            <TagBadges tags={meal.region_tags} />
                          </td>
                          <td className="px-3 py-3">
                            <TagBadges tags={[...meal.base_tags, ...meal.protein_tags]} />
                          </td>
                          <td className="px-3 py-3">{meal.linked_recipe_count ?? 0}</td>
                          <td className="px-3 py-3">
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditMeal(meal)}
                                aria-label={`Edit ${meal.name_vi}`}
                              >
                                <Pencil className="size-4" aria-hidden />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={busy}
                                onClick={() => void deleteMutation.mutateAsync(meal.id)}
                                aria-label={`Delete ${meal.name_vi}`}
                              >
                                <Trash2 className="size-4" aria-hidden />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Dialog open={Boolean(editMeal)} onOpenChange={(open) => !open && setEditMeal(null)}>
            <DialogContent className="sm:max-w-4xl">
              <DialogHeader>
                <DialogTitle>Edit meal</DialogTitle>
                <DialogDescription>
                  Adjust the catalog row before publishing or archiving.
                </DialogDescription>
              </DialogHeader>
              {editMeal ? (
                <div className="space-y-4">
                  <DraftCard
                    draft={draftFromMeal(editMeal)}
                    onChange={(draft) =>
                      setEditMeal({
                        ...editMeal,
                        ...draft,
                        name_en: draft.name_en || null,
                        status: draft.status as VietnameseMealStatus,
                      })
                    }
                  />
                  <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
                    <Select
                      value={editMeal.status}
                      onValueChange={(value) =>
                        setEditMeal({ ...editMeal, status: value as VietnameseMealStatus })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        disabled={busy}
                        onClick={() => void updateMutation.mutateAsync(editMeal)}
                      >
                        <Save className="mr-2 size-4" aria-hidden />
                        Save changes
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setEditMeal(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="add" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bulk add names</CardTitle>
              <CardDescription>Paste one meal per line. AI drafts stay unsaved until reviewed.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={bulkNames}
                onChange={(e) => setBulkNames(e.target.value)}
                rows={8}
                placeholder={"bún bò Huế\ncơm tấm\nbánh xèo"}
                disabled={busy}
              />
              <Button
                type="button"
                disabled={busy || !bulkNames.trim()}
                onClick={() => void enrichMutation.mutateAsync()}
              >
                {enrichMutation.isPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                ) : (
                  <Sparkles className="mr-2 size-4" aria-hidden />
                )}
                Enrich drafts
              </Button>
            </CardContent>
          </Card>

          {drafts.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Review drafts</h2>
                <Button
                  type="button"
                  disabled={busy || drafts.length === 0}
                  onClick={() => void saveDraftsMutation.mutateAsync()}
                >
                  <Plus className="mr-2 size-4" aria-hidden />
                  Save {drafts.length} meal{drafts.length === 1 ? "" : "s"}
                </Button>
              </div>
              {drafts.map((draft, index) => (
                <DraftCard
                  key={`${draft.name_vi}-${index}`}
                  draft={draft}
                  onChange={(next) =>
                    setDrafts((prev) => prev.map((item, i) => (i === index ? next : item)))
                  }
                  onRemove={() => setDrafts((prev) => prev.filter((_, i) => i !== index))}
                />
              ))}
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="inspiration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select catalog meals</CardTitle>
              <CardDescription>Generate recipe-library suggestions from published meals.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {publishedMeals.length === 0 ? (
                <p className="text-sm text-muted-foreground">Publish at least one meal first.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {publishedMeals.map((meal) => {
                    const checked = selectedMealIds.includes(meal.id);
                    return (
                      <label
                        key={meal.id}
                        className="flex cursor-pointer gap-3 rounded-md border p-3 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setSelectedMealIds((prev) =>
                              e.target.checked
                                ? [...prev, meal.id].slice(0, 8)
                                : prev.filter((id) => id !== meal.id),
                            )
                          }
                          className="mt-1"
                        />
                        <span>
                          <span className="block font-medium">{meal.name_vi}</span>
                          <span className="line-clamp-2 text-xs text-muted-foreground">
                            {meal.summary}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
              <Textarea
                value={excludeText}
                onChange={(e) => setExcludeText(e.target.value)}
                rows={4}
                placeholder="Optional: titles to avoid, one per line"
                disabled={busy}
              />
              <Button
                type="button"
                disabled={busy || selectedMealIds.length === 0}
                onClick={() => void suggestionMutation.mutateAsync()}
              >
                {suggestionMutation.isPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                ) : (
                  <Sparkles className="mr-2 size-4" aria-hidden />
                )}
                Generate recipe suggestions
              </Button>
            </CardContent>
          </Card>

          {suggestions ? (
            <div className="space-y-4">
              {suggestions.intro ? (
                <p className="text-sm text-muted-foreground">{suggestions.intro}</p>
              ) : null}
              <div className="grid gap-4 md:grid-cols-2">
                {suggestions.meals.map((meal) => (
                  <Card key={`${meal.title}-${meal.title_vi}`} className="gap-4 py-6">
                    <CardHeader className="px-6">
                      <CardTitle className="text-base">{meal.title}</CardTitle>
                      <CardDescription>
                        {meal.title_vi || meal.title_en} · {meal.estimated_cook_time} ·{" "}
                        {meal.difficulty}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 px-6 text-sm">
                      <p className="text-muted-foreground">{meal.summary}</p>
                      <ul className="space-y-1">
                        {meal.ingredients.slice(0, 8).map((ingredient) => (
                          <li key={ingredient.text}>{ingredient.text}</li>
                        ))}
                      </ul>
                      <Button
                        type="button"
                        size="sm"
                        disabled={busy}
                        onClick={() => void saveRecipeMutation.mutateAsync(meal)}
                      >
                        <Save className="mr-2 size-4" aria-hidden />
                        Save to recipe library
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : null}
        </TabsContent>
      </Tabs>
    </main>
  );
}
