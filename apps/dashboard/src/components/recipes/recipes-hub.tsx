"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FamilyRecipesDashboard } from "@/components/dashboard/family-recipes-dashboard";
import { RecipeGeneratorDashboard } from "@/components/dashboard/recipe-generator-dashboard";
import { RecipesCookPanel } from "@/components/recipes/recipes-cook-panel";
import { RecipesSharePanel } from "@/components/recipes/recipes-share-panel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type HubTab = "cook" | "manage" | "collect" | "share";

function parseHubTab(raw: string | null): HubTab {
  return raw === "manage" || raw === "collect" || raw === "share" || raw === "cook"
    ? raw
    : "cook";
}

export function RecipesHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = parseHubTab(searchParams.get("tab"));

  function setHubTab(value: HubTab) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", value);
    if (value !== "manage") {
      next.delete("manageTab");
      next.delete("importRecipe");
    }
    if (value !== "cook") {
      next.delete("mode");
    }
    router.replace(`/recipes?${next.toString()}`, { scroll: false });
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6">
      <nav className="flex flex-wrap gap-1" aria-label="Recipe sections">
        {(["cook", "manage", "collect", "share"] as const).map((item) => (
          <Button
            key={item}
            type="button"
            variant={activeTab === item ? "secondary" : "ghost"}
            size="sm"
            className={cn("capitalize", activeTab === item ? "font-semibold" : "")}
            onClick={() => setHubTab(item)}
            aria-current={activeTab === item ? "page" : undefined}
          >
            {item}
          </Button>
        ))}
      </nav>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Recipes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage the knowledge base, decide what to cook, collect family ideas, and share read-only
          recipe links.
        </p>
      </div>

      {activeTab === "cook" ? <RecipesCookPanel /> : null}
      {activeTab === "manage" ? (
        <RecipeGeneratorDashboard basePath="/recipes" tabParamName="manageTab" lockedParentTab="manage" />
      ) : null}
      {activeTab === "collect" ? <FamilyRecipesDashboard compact /> : null}
      {activeTab === "share" ? <RecipesSharePanel /> : null}
    </div>
  );
}
