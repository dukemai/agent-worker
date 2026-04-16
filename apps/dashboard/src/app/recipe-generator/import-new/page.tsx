import { Suspense } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { ImportNewDishPage } from "@/components/dashboard/import-new-dish-page";

export default function RecipeImportNewRoute() {
  return (
    <>
      <DashboardHeader />
      <Suspense fallback={<p className="px-4 py-6 text-sm text-muted-foreground">Loading…</p>}>
        <ImportNewDishPage />
      </Suspense>
    </>
  );
}
