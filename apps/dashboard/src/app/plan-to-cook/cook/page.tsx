import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { PlanToCookCookView } from "@/components/dashboard/plan-to-cook-cook-view";
import { RecipeLocaleProvider } from "@/components/dashboard/recipe-locale-provider";

export const metadata: Metadata = {
  title: "Cooking",
  description: "See planned meals and open recipes while you cook.",
};

export default function PlanToCookCookPage() {
  return (
    <>
      <DashboardHeader />
      <Suspense fallback={<p className="px-4 py-6 text-sm text-muted-foreground">Loading…</p>}>
        <RecipeLocaleProvider>
          <PlanToCookCookView />
        </RecipeLocaleProvider>
      </Suspense>
    </>
  );
}
