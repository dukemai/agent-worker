import { RecipeLocaleProvider } from "@/components/dashboard/recipe-locale-provider";
import { PublicRecipeSharePage } from "@/components/recipes/public-recipe-share-page";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function SharedRecipePage({ params }: Props) {
  const { slug } = await params;
  return (
    <RecipeLocaleProvider>
      <PublicRecipeSharePage slug={slug} />
    </RecipeLocaleProvider>
  );
}
