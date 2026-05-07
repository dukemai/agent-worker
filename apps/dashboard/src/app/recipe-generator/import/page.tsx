import { RecipeGeneratorDashboard } from "@/components/dashboard/recipe-generator-dashboard";
import { RecipeHubPageLayout } from "@/components/recipes/recipe-hub-page-layout";

export default function RecipeImportRoute() {
  return (
    <RecipeHubPageLayout withLocale>
      <RecipeGeneratorDashboard
        basePath="/recipe-generator/import"
        fixedRecipeTab="import"
        libraryHref="/recipes?tab=manage"
      />
    </RecipeHubPageLayout>
  );
}
