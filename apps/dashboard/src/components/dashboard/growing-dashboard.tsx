"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GrowingContextCard } from "./growing-context-card";
import { GrowingKnowledgeTab } from "./growing-knowledge-tab";
import { GrowingSourcesTab } from "./growing-sources-tab";
import { GrowingWeeklyTab } from "./growing-weekly-tab";
import { GrowingWindowsTab } from "./growing-windows-tab";

export function GrowingDashboard() {
  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
      <div className="flex justify-end">
        <GrowingContextCard />
      </div>

      <Tabs defaultValue="weekly" className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="weekly">This Week</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="windows">Windows</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly">
          <GrowingWeeklyTab />
        </TabsContent>

        <TabsContent value="sources" className="space-y-4">
          <GrowingSourcesTab />
        </TabsContent>

        <TabsContent value="windows" className="space-y-4">
          <GrowingWindowsTab />
        </TabsContent>

        <TabsContent value="knowledge" className="space-y-4">
          <GrowingKnowledgeTab />
        </TabsContent>
      </Tabs>
    </main>
  );
}
