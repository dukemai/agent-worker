import { redirect } from "next/navigation";

export default function FamilyRecipeSearchRoute() {
  redirect("/recipes?tab=cook");
}
