import { ActivityCaptureReview } from "@/components/dashboard/activity-capture-review";
import { DashboardHeader } from "@/components/dashboard/header";

export default function ActivityCapturePage() {
  return <><DashboardHeader /><main className="mx-auto w-full max-w-4xl px-4 py-6"><ActivityCaptureReview /></main></>;
}
