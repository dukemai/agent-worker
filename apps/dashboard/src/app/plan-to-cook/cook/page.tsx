import { redirect } from "next/navigation";

export default function PlanToCookCookPage() {
  redirect("/recipes?tab=cook&mode=cooking");
}
