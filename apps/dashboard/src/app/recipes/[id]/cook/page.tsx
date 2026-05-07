import { RecipeHubPageLayout } from "@/components/recipes/recipe-hub-page-layout";
import { RecipeCookingView } from "@/components/recipes/recipe-cooking-view";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function RecipeCookPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <RecipeHubPageLayout withLocale>
      <RecipeCookingView recipeId={id} />
    </RecipeHubPageLayout>
  );
}
