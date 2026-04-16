import { PublicCookbookShell } from "@/components/cookbook/public-cookbook-shell";
import { PublicRecipeDetail } from "@/components/cookbook/public-recipe-detail";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CookbookRecipePage({ params }: PageProps) {
  const { id } = await params;
  const title = process.env.NEXT_PUBLIC_COOKBOOK_TITLE?.trim() || "Shared cookbook";

  return (
    <PublicCookbookShell title={title} subtitle="Recipe">
      <PublicRecipeDetail recipeId={id} />
    </PublicCookbookShell>
  );
}
