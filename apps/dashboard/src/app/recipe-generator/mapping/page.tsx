import { FoodStyleIngredientMappingPage } from "@/components/dashboard/food-style-ingredient-mapping-page";
import { RecipeHubPageLayout } from "@/components/recipes/recipe-hub-page-layout";

export default function RecipeFoodStyleMappingRoute() {
  return (
    <RecipeHubPageLayout>
      <FoodStyleIngredientMappingPage />
    </RecipeHubPageLayout>
  );
}
