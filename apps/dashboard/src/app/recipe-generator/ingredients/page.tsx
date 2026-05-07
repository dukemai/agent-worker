import { FamilyIngredientSourcesPage } from "@/components/dashboard/family-ingredient-sources-page";
import { RecipeHubPageLayout } from "@/components/recipes/recipe-hub-page-layout";

export default function RecipeIngredientSourcesRoute() {
  return (
    <RecipeHubPageLayout>
      <FamilyIngredientSourcesPage />
    </RecipeHubPageLayout>
  );
}
