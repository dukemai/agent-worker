"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddRenewalReminderCard } from "./AddRenewalReminderCard";
import { AddTaskCard } from "./AddTaskCard";
import { RenewalsCard } from "./RenewalsCard";
import { TasksBoard } from "./TasksBoard";

export function TasksDashboard() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6">
      <Tabs defaultValue="tasks" className="space-y-6">
        <TabsList>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="renewals">Renewals</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-6">
          <AddTaskCard />
          <TasksBoard />
        </TabsContent>

        <TabsContent value="renewals" className="space-y-6">
          <RenewalsCard />
          <AddRenewalReminderCard />
        </TabsContent>
      </Tabs>
    </main>
  );
}
