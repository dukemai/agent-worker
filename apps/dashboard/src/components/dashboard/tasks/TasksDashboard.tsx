"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddRenewalReminderCard } from "./AddRenewalReminderCard";
import { AddTaskCard } from "./AddTaskCard";
import { RenewalsCard } from "./RenewalsCard";
import { TasksBoard } from "./TasksBoard";

export function TasksDashboard() {
  const [activeTab, setActiveTab] = useState<"tasks" | "renewals">("tasks");

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="space-y-6">
        <TabsList className="flex w-full items-center justify-between">
          <div className="inline-flex gap-1">
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="renewals">Renewals</TabsTrigger>
          </div>
          {activeTab === "tasks" ? (
            <div className="flex items-center">
              <AddTaskCard />
            </div>
          ) : null}
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
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
