import { redirect } from "next/navigation";

export default function PlanToCookPage() {
  redirect("/recipes?tab=cook");
}
