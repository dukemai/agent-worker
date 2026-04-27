import { Suspense } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { FamilyRecipeStylePage } from "@/components/dashboard/family-recipe-style-page";
import { RecipeLocaleProvider } from "@/components/dashboard/recipe-locale-provider";

type PageProps = {
  params: Promise<{ styleId: string }>;
};

export default async function FamilyRecipeStyleRoute({ params }: PageProps) {
  const { styleId } = await params;

  return (
    <>
      <DashboardHeader />
      <Suspense fallback={<p className="px-4 py-6 text-sm text-muted-foreground">Loading...</p>}>
        <RecipeLocaleProvider>
          <FamilyRecipeStylePage styleId={styleId} />
        </RecipeLocaleProvider>
      </Suspense>
    </>
  );
}
