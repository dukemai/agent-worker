import { DashboardHeader } from "@/components/dashboard/header";
import { AddRenewalReminderCard } from "@/components/dashboard/tasks/AddRenewalReminderCard";
import { RenewalsCard } from "@/components/dashboard/tasks/RenewalsCard";

export default function RenewalsPage() {
  return (
    <>
      <DashboardHeader />
      <main className="mx-auto w-full max-w-7xl space-y-6 px-5 py-8 sm:px-8">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Household admin</p>
          <h1 className="font-serif text-3xl">Renewals</h1>
        </div>
        <RenewalsCard />
        <AddRenewalReminderCard />
      </main>
    </>
  );
}
