"use client";

import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
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
import type { SavedRecipeRow } from "@/lib/saved-recipe-row";
import { formatRecipeDifficulty } from "@/lib/recipe-difficulty";

const ALL_TYPES = "__all__";
const ALL_MEAL = "__all__";
const ALL_TESTED = "__all__";
const TESTED_ONLY = "tested";

type FoodTypesJson = { options: { id: string; label: string }[] };

type PublicCookbookListPayload = {
  recipes: SavedRecipeRow[];
  mode?: "public" | "session_preview";
};

async function fetchPublicRecipes(): Promise<PublicCookbookListPayload> {
  const res = await fetch("/api/public/cookbook/recipes", {
    cache: "no-store",
    credentials: "same-origin",
  });
  const j = (await res.json().catch(() => ({}))) as { error?: string; recipes?: SavedRecipeRow[]; mode?: string };
  if (res.status === 503) {
    throw new Error(j.error ?? "Public cookbook is not configured");
  }
  if (!res.ok) {
    throw new Error(j.error ?? "Failed to load recipes");
  }
  return {
    recipes: j.recipes ?? [],
    mode: j.mode as PublicCookbookListPayload["mode"],
  };
}

async function fetchFoodTypes(): Promise<FoodTypesJson> {
  const res = await fetch("/data/recipe-food-types.json", { cache: "force-cache" });
  if (!res.ok) {
    throw new Error("Food types");
  }
  return res.json() as Promise<FoodTypesJson>;
}

function recipeSearchHaystack(r: SavedRecipeRow): string {
  const ing = r.ingredients.map((x) => `${x.ingredient_label} ${x.amount} ${x.text}`).join(" ");
  return `${r.title} ${r.title_en} ${r.title_vi} ${r.summary} ${ing}`.toLowerCase();
}

export function PublicCookbookList() {
  const [q, setQ] = useState("");
  const [foodType, setFoodType] = useState(ALL_TYPES);
  const [mealKind, setMealKind] = useState(ALL_MEAL);
  const [vegetarianOnly, setVegetarianOnly] = useState(false);
  const [testedFilter, setTestedFilter] = useState(ALL_TESTED);

  const recipesQuery = useQuery({
    queryKey: ["public-cookbook-recipes"],
    queryFn: fetchPublicRecipes,
  });
  const foodTypesQuery = useQuery({
    queryKey: ["recipe-food-types"],
    queryFn: fetchFoodTypes,
  });

  const labelByFoodTypeId = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of foodTypesQuery.data?.options ?? []) {
      m.set(o.id, o.label);
    }
    return m;
  }, [foodTypesQuery.data?.options]);

  const filtered = useMemo(() => {
    const list = recipesQuery.data?.recipes ?? [];
    const needle = q.trim().toLowerCase();
    return list.filter((r) => {
      if (foodType !== ALL_TYPES && r.food_type_id !== foodType) {
        return false;
      }
      if (mealKind !== ALL_MEAL && r.meal_kind !== mealKind) {
        return false;
      }
      if (vegetarianOnly && !r.vegetarian) {
        return false;
      }
      if (testedFilter === TESTED_ONLY && !r.tested) {
        return false;
      }
      if (needle && !recipeSearchHaystack(r).includes(needle)) {
        return false;
      }
      return true;
    });
  }, [recipesQuery.data, q, foodType, mealKind, vegetarianOnly, testedFilter]);

  if (recipesQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading recipes…</p>;
  }

  if (recipesQuery.error) {
    const msg =
      recipesQuery.error instanceof Error ? recipesQuery.error.message : "Could not load";
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cookbook unavailable</CardTitle>
          <CardDescription className="text-pretty">{msg}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            For <strong>anonymous visitors</strong>, set <code className="rounded bg-muted px-1 text-xs">COOKBOOK_PUBLIC_USER_ID</code>{" "}
            and <code className="rounded bg-muted px-1 text-xs">SUPABASE_SERVICE_ROLE_KEY</code> in{" "}
            <code className="rounded bg-muted px-1 text-xs">.env.local</code>.
          </p>
          <Button asChild variant="secondary" size="sm">
            <Link href="/login">Sign in to preview your own library</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const list = recipesQuery.data?.recipes ?? [];
  const listMode = recipesQuery.data?.mode;

  return (
    <div className="space-y-6">
      {listMode === "session_preview" ? (
        <p className="rounded-md border border-amber-200/80 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          Signed-in preview: showing <strong>your</strong> saved recipes. Friends without an account need the public env vars to see this cookbook.
        </p>
      ) : null}
      <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 shadow-sm">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            className="pl-9"
            placeholder="Search title, summary, ingredients…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search recipes"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Type of food</span>
            <Select value={foodType} onValueChange={setFoodType}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_TYPES}>All types</SelectItem>
                {(foodTypesQuery.data?.options ?? []).map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Meal</span>
            <Select value={mealKind} onValueChange={setMealKind}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_MEAL}>All meals</SelectItem>
                <SelectItem value="lunch">lunch</SelectItem>
                <SelectItem value="dinner">dinner</SelectItem>
                <SelectItem value="either">either</SelectItem>
                <SelectItem value="snack">snack</SelectItem>
                <SelectItem value="other">other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Diet</span>
            <Select
              value={vegetarianOnly ? "veg" : "all"}
              onValueChange={(v) => setVegetarianOnly(v === "veg")}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="veg">Vegetarian only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Tried</span>
            <Select value={testedFilter} onValueChange={setTestedFilter}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_TESTED}>All</SelectItem>
                <SelectItem value={TESTED_ONLY}>Tested at home</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground tabular-nums">{filtered.length}</span> of{" "}
          <span className="tabular-nums">{list.length}</span> recipes
        </p>
      </div>

      {list.length === 0 ? (
        listMode === "public" ? (
          <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">No recipes in the public catalog</p>
            <p className="mt-2 text-pretty">
              The server loads only recipes for the user id in{" "}
              <code className="rounded bg-muted px-1 text-xs">COOKBOOK_PUBLIC_USER_ID</code>. If that
              UUID is not the same as your Supabase account (or points at a different project), the
              list stays empty. Fix the id, or remove{" "}
              <code className="rounded bg-muted px-1 text-xs">COOKBOOK_PUBLIC_USER_ID</code> and{" "}
              <code className="rounded bg-muted px-1 text-xs">SUPABASE_SERVICE_ROLE_KEY</code> from{" "}
              <code className="rounded bg-muted px-1 text-xs">.env.local</code> and sign in to preview
              your own library.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No saved recipes yet.</p>
        )
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No recipes match. Clear search or widen filters.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {filtered.map((r) => (
            <li key={r.id}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base leading-snug">
                    <Link
                      href={`/cookbook/${r.id}`}
                      className="text-foreground hover:underline"
                    >
                      {r.title}
                    </Link>
                  </CardTitle>
                  <CardDescription className="line-clamp-2">{r.summary}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="capitalize">{r.meal_kind}</span>
                  <span>{labelByFoodTypeId.get(r.food_type_id) ?? r.food_type_id}</span>
                  {r.estimated_cook_time.trim() ? <span>{r.estimated_cook_time}</span> : null}
                  <span>{formatRecipeDifficulty(r.difficulty)}</span>
                  {r.vegetarian ? <span className="text-emerald-700 dark:text-emerald-400">Vegetarian</span> : null}
                  {r.tested ? <span>Tested</span> : null}
                </CardContent>
                <CardContent className="pt-0">
                  <Button asChild size="sm" variant="secondary" className="w-full sm:w-auto">
                    <Link href={`/cookbook/${r.id}`}>View recipe</Link>
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
