import { AddBirthdayCard } from "@/components/dashboard/tasks/AddBirthdayCard";
import { AddBirthdayEventCard } from "@/components/dashboard/tasks/AddBirthdayEventCard";
import { BirthdaysCard } from "@/components/dashboard/tasks/BirthdaysCard";

export function BirthdaysDashboard() {
  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
      <BirthdaysCard />
      <div className="grid gap-6 lg:grid-cols-2">
        <AddBirthdayCard />
        <AddBirthdayEventCard />
      </div>
    </main>
  );
}
