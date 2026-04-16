import { Suspense } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { ImportRecipeFromSourcePage } from "@/components/dashboard/import-recipe-from-source-page";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function RecipeImportFromSourceRoute({ params }: PageProps) {
  const { id } = await params;
  return (
    <>
      <DashboardHeader />
      <Suspense fallback={<p className="px-4 py-6 text-sm text-muted-foreground">Loading…</p>}>
        <ImportRecipeFromSourcePage recipeId={id} />
      </Suspense>
    </>
  );
}
