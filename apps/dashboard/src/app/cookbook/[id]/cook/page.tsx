import { PublicCookbookShell } from "@/components/cookbook/public-cookbook-shell";
import { PublicCookbookCook } from "@/components/cookbook/public-cookbook-cook";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CookbookCookPage({ params }: PageProps) {
  const { id } = await params;
  const title = process.env.NEXT_PUBLIC_COOKBOOK_TITLE?.trim() || "Shared cookbook";

  return (
    <PublicCookbookShell title={title} subtitle="Cooking mode">
      <PublicCookbookCook recipeId={id} />
    </PublicCookbookShell>
  );
}
