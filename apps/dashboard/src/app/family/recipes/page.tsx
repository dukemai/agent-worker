import { Suspense } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { FamilyRecipesDashboard } from "@/components/dashboard/family-recipes-dashboard";

export default function FamilyRecipesPage() {
  return (
    <>
      <DashboardHeader />
      <Suspense fallback={<p className="px-4 py-6 text-sm text-muted-foreground">Loading...</p>}>
        <FamilyRecipesDashboard />
      </Suspense>
    </>
  );
}
