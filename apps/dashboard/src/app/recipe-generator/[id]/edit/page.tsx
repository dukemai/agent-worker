import { Suspense } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { EditRecipePage } from "@/components/dashboard/edit-recipe-page";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function RecipeEditRoute({ params }: PageProps) {
  const { id } = await params;
  return (
    <>
      <DashboardHeader />
      <Suspense fallback={<p className="px-4 py-6 text-sm text-muted-foreground">Loading…</p>}>
        <EditRecipePage recipeId={id} />
      </Suspense>
    </>
  );
}
