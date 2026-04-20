import { DashboardHeader } from "@/components/dashboard/header";
import { TaskDetailView } from "@/components/dashboard/tasks/TaskDetailView";

type Params = Promise<{ id: string }>;

export default async function TaskPage({ params }: { params: Params }) {
  const { id } = await params;

  return (
    <>
      <DashboardHeader />
      <main className="container mx-auto p-4 md:p-6 lg:p-8">
        <TaskDetailView taskId={id} />
      </main>
    </>
  );
}
