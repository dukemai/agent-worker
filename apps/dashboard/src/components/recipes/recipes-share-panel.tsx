"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, ExternalLink, Link2, Trash2 } from "lucide-react";
import Link from "next/link";
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
import { fetchFoodTypes, type FoodTypesJson } from "@/components/dashboard/recipe-generator-api";
import type { RecipeShareScopeType } from "@/lib/recipe-shares/types";
import {
  createRecipeShare,
  disableRecipeShare,
  fetchRecipeShares,
} from "./recipe-share-api";

const SHARE_TYPES: { value: RecipeShareScopeType; label: string }[] = [
  { value: "food_style", label: "Food style" },
  { value: "recipe", label: "Single recipe" },
];

export function RecipesSharePanel() {
  const queryClient = useQueryClient();
  const sharesQuery = useQuery({ queryKey: ["recipe-shares"], queryFn: fetchRecipeShares });
  const foodTypesQuery = useQuery<FoodTypesJson>({
    queryKey: ["recipe-food-types"],
    queryFn: fetchFoodTypes,
  });
  const [scopeType, setScopeType] = useState<RecipeShareScopeType>("food_style");
  const [recipeId, setRecipeId] = useState("");
  const [foodTypeId, setFoodTypeId] = useState("brunch-breakfast-light");
  const [title, setTitle] = useState("");
  const [lastCopiedSlug, setLastCopiedSlug] = useState<string | null>(null);

  const labelByFoodTypeId = useMemo(() => {
    const labels = new Map<string, string>();
    for (const option of foodTypesQuery.data?.options ?? []) {
      labels.set(option.id, option.label);
    }
    return labels;
  }, [foodTypesQuery.data?.options]);

  const recipeById = useMemo(() => {
    const map = new Map<string, string>();
    for (const recipe of sharesQuery.data?.recipes ?? []) {
      map.set(recipe.id, recipe.title);
    }
    return map;
  }, [sharesQuery.data?.recipes]);

  const activeLinks = (sharesQuery.data?.links ?? []).filter((link) => !link.disabled_at);
  const disabledLinks = (sharesQuery.data?.links ?? []).filter((link) => link.disabled_at);

  const createMutation = useMutation({
    mutationFn: createRecipeShare,
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["recipe-shares"] });
      await copyShareUrl(data.link.public_slug);
    },
  });

  const disableMutation = useMutation({
    mutationFn: disableRecipeShare,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["recipe-shares"] });
    },
  });

  async function copyShareUrl(slug: string) {
    const url = `${window.location.origin}/recipes/shared/${slug}`;
    await navigator.clipboard.writeText(url);
    setLastCopiedSlug(slug);
  }

  function createCurrentShare() {
    void createMutation.mutateAsync({
      scopeType,
      recipeId: scopeType === "recipe" ? recipeId : undefined,
      foodTypeId: scopeType === "food_style" ? foodTypeId : undefined,
      title: title.trim() || undefined,
    });
  }

  const createDisabled =
    createMutation.isPending ||
    (scopeType === "recipe" ? !recipeId : !foodTypeId) ||
    sharesQuery.isLoading;

  const error =
    sharesQuery.error instanceof Error
      ? sharesQuery.error.message
      : foodTypesQuery.error instanceof Error
        ? foodTypesQuery.error.message
        : createMutation.error instanceof Error
          ? createMutation.error.message
          : disableMutation.error instanceof Error
            ? disableMutation.error.message
            : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="size-5" aria-hidden />
            Share read-only recipes
          </CardTitle>
          <CardDescription>
            Create links for family to view a recipe or a whole food style without signing in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[12rem_1fr_1fr_auto] md:items-end">
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground" id="share-scope">
                Share type
              </span>
              <Select
                value={scopeType}
                onValueChange={(value) => setScopeType(value as RecipeShareScopeType)}
              >
                <SelectTrigger aria-labelledby="share-scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHARE_TYPES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {scopeType === "food_style" ? (
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground" id="share-style">
                  Food style
                </span>
                <Select
                  value={foodTypeId}
                  onValueChange={setFoodTypeId}
                  disabled={foodTypesQuery.isLoading}
                >
                  <SelectTrigger aria-labelledby="share-style">
                    <SelectValue placeholder="Choose style" />
                  </SelectTrigger>
                  <SelectContent>
                    {(foodTypesQuery.data?.options ?? []).map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground" id="share-recipe">
                  Recipe
                </span>
                <Select value={recipeId} onValueChange={setRecipeId} disabled={sharesQuery.isLoading}>
                  <SelectTrigger aria-labelledby="share-recipe">
                    <SelectValue placeholder="Choose recipe" />
                  </SelectTrigger>
                  <SelectContent>
                    {(sharesQuery.data?.recipes ?? []).map((recipe) => (
                      <SelectItem key={recipe.id} value={recipe.id}>
                        {recipe.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="share-title">
                Link title
              </label>
              <Input
                id="share-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Optional display title"
                maxLength={200}
              />
            </div>

            <Button type="button" disabled={createDisabled} onClick={createCurrentShare}>
              {createMutation.isPending ? "Creating..." : "Create / copy link"}
            </Button>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active links</CardTitle>
          <CardDescription>
            Recreating the same recipe or style reuses its active link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sharesQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : activeLinks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active recipe share links yet.</p>
          ) : (
            <ul className="space-y-2">
              {activeLinks.map((link) => {
                const label =
                  link.scope_type === "recipe"
                    ? recipeById.get(link.recipe_id ?? "") || link.title || "Shared recipe"
                    : labelByFoodTypeId.get(link.food_type_id ?? "") || link.title || "Shared style";
                return (
                  <li
                    key={link.id}
                    className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{link.title || label}</p>
                      <p className="text-xs text-muted-foreground">
                        {link.scope_type === "recipe" ? "Recipe" : "Food style"} · {label}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        /recipes/shared/{link.public_slug}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => void copyShareUrl(link.public_slug)}
                      >
                        <Copy className="mr-1.5 size-4" aria-hidden />
                        {lastCopiedSlug === link.public_slug ? "Copied" : "Copy"}
                      </Button>
                      <Button asChild variant="outline" size="icon" title="Open shared link">
                        <Link href={`/recipes/shared/${link.public_slug}`} target="_blank">
                          <ExternalLink className="size-4" aria-hidden />
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={disableMutation.isPending}
                        title="Disable shared link"
                        aria-label={`Disable ${link.title || label}`}
                        onClick={() => {
                          if (window.confirm(`Disable "${link.title || label}"? The public link will stop working.`)) {
                            void disableMutation.mutateAsync(link.id);
                          }
                        }}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {disabledLinks.length > 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              {disabledLinks.length} disabled {disabledLinks.length === 1 ? "link" : "links"} hidden
              from public access.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
