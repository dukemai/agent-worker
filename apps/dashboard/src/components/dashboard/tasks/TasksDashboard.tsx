"use client";

import { AddRenewalReminderCard } from "./AddRenewalReminderCard";
import { AddTaskCard } from "./AddTaskCard";
import { RenewalsCard } from "./RenewalsCard";
import { TasksBoard } from "./TasksBoard";

export function TasksDashboard() {
  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
      <RenewalsCard />
      <AddTaskCard />
      <AddRenewalReminderCard />
      <TasksBoard />
    </main>
  );
}
