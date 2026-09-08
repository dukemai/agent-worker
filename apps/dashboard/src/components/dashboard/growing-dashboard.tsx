"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GrowingContextCard, GrowingProfileSummary } from "./growing-context-card";
import { GrowingKnowledgeTab } from "./growing-knowledge-tab";
import { GrowingSourcesTab } from "./growing-sources-tab";
import { GrowingWeeklyTab } from "./growing-weekly-tab";
import { GrowingWindowsTab } from "./growing-windows-tab";

export function GrowingDashboard() {
  return (
    <main className="mx-auto w-full max-w-[1440px] px-5 pb-12 sm:px-8 lg:px-10">
      <div className="flex items-start justify-between gap-6 pt-8 pb-6 sm:pt-9">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Growing</p>
          <h1 className="mb-4 font-serif text-[2rem] leading-none font-medium tracking-tight">Season Tracker</h1>
          <GrowingProfileSummary />
        </div>
        <GrowingContextCard />
      </div>

      <Tabs defaultValue="weekly" className="gap-0">
        <div className="border-b">
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none bg-transparent p-0">
          <TabsTrigger className="rounded-none border-b-2 border-transparent px-1 pb-3.5 shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none" value="weekly">This Week</TabsTrigger>
          <TabsTrigger className="rounded-none border-b-2 border-transparent px-4 pb-3.5 shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none" value="sources">Sources</TabsTrigger>
          <TabsTrigger className="rounded-none border-b-2 border-transparent px-4 pb-3.5 shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none" value="windows">Windows</TabsTrigger>
          <TabsTrigger className="rounded-none border-b-2 border-transparent px-4 pb-3.5 shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none" value="knowledge">Knowledge</TabsTrigger>
        </TabsList>
        </div>

        <TabsContent value="weekly" className="pt-7">
          <GrowingWeeklyTab />
        </TabsContent>

        <TabsContent value="sources" className="space-y-4 pt-7">
          <GrowingSourcesTab />
        </TabsContent>

        <TabsContent value="windows" className="space-y-4 pt-7">
          <GrowingWindowsTab />
        </TabsContent>

        <TabsContent value="knowledge" className="space-y-4 pt-7">
          <GrowingKnowledgeTab />
        </TabsContent>
      </Tabs>
    </main>
  );
}
