import { DashboardHeader } from "@/components/dashboard/header";
import { TasksDashboard } from "@/components/dashboard/tasks-dashboard";

export default function HomePage() {
  return (
    <>
      <DashboardHeader />
      <TasksDashboard />
    </>
  );
}
