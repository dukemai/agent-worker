import { Suspense } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { PlanToCookPrepare } from "@/components/dashboard/plan-to-cook-prepare";

export default function PlanToCookPreparePage() {
  return (
    <>
      <DashboardHeader />
      <Suspense fallback={<p className="px-4 py-6 text-sm text-muted-foreground">Loading…</p>}>
        <PlanToCookPrepare />
      </Suspense>
    </>
  );
}
