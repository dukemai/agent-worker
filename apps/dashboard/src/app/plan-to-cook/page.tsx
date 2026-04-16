import { Suspense } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { PlanToCookDashboard } from "@/components/dashboard/plan-to-cook-dashboard";

export default function PlanToCookPage() {
  return (
    <>
      <DashboardHeader />
      <Suspense fallback={<p className="px-4 py-6 text-sm text-muted-foreground">Loading…</p>}>
        <PlanToCookDashboard />
      </Suspense>
    </>
  );
}
