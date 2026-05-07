import { redirect } from "next/navigation";

export default function FamilyRecipesPage() {
  redirect("/recipes?tab=collect");
}
