import { RecipeGeneratorDashboard } from "@/components/dashboard/recipe-generator-dashboard";
import { RecipeHubPageLayout } from "@/components/recipes/recipe-hub-page-layout";

export default function RecipeGenerateRoute() {
  return (
    <RecipeHubPageLayout withLocale>
      <RecipeGeneratorDashboard
        basePath="/recipe-generator/generate"
        fixedRecipeTab="generate"
        libraryHref="/recipes?tab=manage"
      />
    </RecipeHubPageLayout>
  );
}
