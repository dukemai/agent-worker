import { Suspense } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { RecipeLocaleProvider } from "@/components/dashboard/recipe-locale-provider";
import { RecipeGeneratorDashboard } from "@/components/dashboard/recipe-generator-dashboard";

export default function RecipeGeneratorPage() {
  return (
    <>
      <DashboardHeader />
      <Suspense fallback={<p className="px-4 py-6 text-sm text-muted-foreground">Loading…</p>}>
        <RecipeLocaleProvider>
          <RecipeGeneratorDashboard />
        </RecipeLocaleProvider>
      </Suspense>
    </>
  );
}
