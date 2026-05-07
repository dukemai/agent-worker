import { redirect } from "next/navigation";

export default async function RecipeGeneratorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const oldTab = typeof params.tab === "string" ? params.tab : "";
  if (oldTab === "generate" || oldTab === "import") {
    const next = new URLSearchParams();
    for (const key of ["importRecipe", "pick"]) {
      const value = params[key];
      if (typeof value === "string" && value.trim()) {
        next.set(key, value);
      }
    }
    const q = next.toString();
    redirect(`/recipe-generator/${oldTab}${q ? `?${q}` : ""}`);
  }
  const next = new URLSearchParams();
  next.set("tab", "manage");
  if (oldTab) {
    next.set("manageTab", oldTab);
  }
  for (const key of ["importRecipe", "pick"]) {
    const value = params[key];
    if (typeof value === "string" && value.trim()) {
      next.set(key, value);
    }
  }
  redirect(`/recipes?${next.toString()}`);
}
