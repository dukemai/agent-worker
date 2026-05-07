import { RecipeHubPageLayout } from "@/components/recipes/recipe-hub-page-layout";
import { RecipesHub } from "@/components/recipes/recipes-hub";

export default function RecipesPage() {
  return (
    <RecipeHubPageLayout withLocale>
      <RecipesHub />
    </RecipeHubPageLayout>
  );
}
