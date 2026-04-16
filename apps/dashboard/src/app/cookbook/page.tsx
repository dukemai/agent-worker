import { PublicCookbookShell } from "@/components/cookbook/public-cookbook-shell";
import { PublicCookbookList } from "@/components/cookbook/public-cookbook-list";

export default function CookbookPage() {
  const title = process.env.NEXT_PUBLIC_COOKBOOK_TITLE?.trim() || "Shared cookbook";
  const subtitle =
    process.env.NEXT_PUBLIC_COOKBOOK_SUBTITLE?.trim() ||
    "Browse, search, and open a recipe to start cooking";

  return (
    <PublicCookbookShell title={title} subtitle={subtitle}>
      <PublicCookbookList />
    </PublicCookbookShell>
  );
}
