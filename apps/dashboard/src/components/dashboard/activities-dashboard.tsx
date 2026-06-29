"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivitiesLibraryTab } from "./activities-library-tab";
import { ActivitiesSeasonalTab } from "./activities-seasonal-tab";
import { ActivitiesSourcesTab } from "./activities-sources-tab";
import { ActivitiesWeekTab } from "./activities-week-tab";

export function ActivitiesDashboard() {
  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
      <Tabs defaultValue="week" className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="library">Library</TabsTrigger>
          <TabsTrigger value="seasonal">Seasonal</TabsTrigger>
        </TabsList>

        <TabsContent value="week">
          <ActivitiesWeekTab />
        </TabsContent>

        <TabsContent value="sources">
          <ActivitiesSourcesTab />
        </TabsContent>

        <TabsContent value="library">
          <ActivitiesLibraryTab />
        </TabsContent>

        <TabsContent value="seasonal">
          <ActivitiesSeasonalTab />
        </TabsContent>
      </Tabs>
    </main>
  );
}
