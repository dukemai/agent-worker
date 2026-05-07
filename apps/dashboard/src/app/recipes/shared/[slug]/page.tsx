import { PublicRecipeSharePage } from "@/components/recipes/public-recipe-share-page";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function SharedRecipePage({ params }: Props) {
  const { slug } = await params;
  return <PublicRecipeSharePage slug={slug} />;
}
