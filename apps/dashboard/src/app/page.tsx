import { DashboardHeader } from "@/components/dashboard/header";
import { TasksDashboard } from "@/components/dashboard/tasks";

export default function HomePage() {
  return (
    <>
      <DashboardHeader />
      <TasksDashboard />
    </>
  );
}
