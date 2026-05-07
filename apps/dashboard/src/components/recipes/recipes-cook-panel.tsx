"use client";

import { useSearchParams } from "next/navigation";
import { PlanToCookCookView } from "@/components/dashboard/plan-to-cook-cook-view";
import { PlanToCookDashboard } from "@/components/dashboard/plan-to-cook-dashboard";
import { FamilyRecipeSearchPage } from "@/components/dashboard/family-recipe-search-page";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function RecipesCookPanel() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");

  if (mode === "cooking") {
    return <PlanToCookCookView />;
  }

  return (
    <Tabs defaultValue="search" className="space-y-4">
      <TabsList className="grid w-full grid-cols-2 sm:w-fit">
        <TabsTrigger value="search">Search</TabsTrigger>
        <TabsTrigger value="plan">Plan</TabsTrigger>
      </TabsList>
      <TabsContent value="search">
        <FamilyRecipeSearchPage compact />
      </TabsContent>
      <TabsContent value="plan">
        <PlanToCookDashboard embedded />
      </TabsContent>
    </Tabs>
  );
}
