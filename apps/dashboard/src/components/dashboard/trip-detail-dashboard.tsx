"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchTripDetail } from "@/components/dashboard/trip-ops-api";
import { formatDates, getDayCount } from "@/components/dashboard/trip-utils";
import { TripKnowledgePanel } from "@/components/dashboard/trip-detail/trip-knowledge-panel";
import { TripOverview, TripShareControl } from "@/components/dashboard/trip-detail/trip-overview-panel";
import { TripOptionsPanel } from "@/components/dashboard/trip-detail/trip-options-panel";
import { TripItineraryPanel } from "@/components/dashboard/trip-detail/trip-itinerary-panel";
import { TripDecisionsPanel, TripTasksPanel } from "@/components/dashboard/trip-detail/trip-work-panel";

export function TripDetailDashboard({ tripId }: { tripId: string }) {
  const queryClient = useQueryClient();
  const queryKey = ["trip", tripId];
  const detailQuery = useQuery({ queryKey, queryFn: () => fetchTripDetail(tripId) });
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const detail = detailQuery.data;
  const dayCount = useMemo(() => getDayCount(detail?.trip), [detail?.trip]);

  if (detailQuery.isLoading) {
    return <main className="mx-auto w-full max-w-5xl px-4 py-6 text-sm text-muted-foreground">Loading trip...</main>;
  }
  if (detailQuery.isError || !detail) {
    return <main className="mx-auto w-full max-w-5xl px-4 py-6 text-sm text-destructive">Trip could not be loaded.</main>;
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="px-0">
            <Link href="/trips">
              <ArrowLeft className="size-4" aria-hidden />
              Trips
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">{detail.trip.title}</h2>
            <p className="text-sm text-muted-foreground">{detail.trip.destination || "No destination"} · {formatDates(detail.trip)}</p>
          </div>
        </div>
        <TripShareControl tripId={tripId} tripTitle={detail.trip.title} onError={setError} />
      </div>
      {error ? <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p> : null}

      <Tabs defaultValue="logistics" className="space-y-5">
        <TabsList className="flex w-full justify-start overflow-x-auto">
          <TabsTrigger value="logistics">Logistics</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
          <TabsTrigger value="options">Options</TabsTrigger>
          <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
          <TabsTrigger value="work">Work</TabsTrigger>
        </TabsList>

        <TabsContent value="logistics">
          <TripOverview trip={detail.trip} onError={setError} onDone={invalidate} />
        </TabsContent>

        <TabsContent value="knowledge">
          <TripKnowledgePanel
            tripId={tripId}
            knowledge={detail.knowledge}
            favorites={detail.knowledge_favorites}
            storyContents={detail.story_contents}
            onError={setError}
            onDone={invalidate}
          />
        </TabsContent>

        <TabsContent value="options">
          <TripOptionsPanel
            tripId={tripId}
            options={detail.options}
            dayCount={dayCount}
            knowledge={detail.knowledge}
            favorites={detail.knowledge_favorites}
            onError={setError}
            onDone={invalidate}
          />
        </TabsContent>

        <TabsContent value="itinerary">
          <TripItineraryPanel
            tripId={tripId}
            dayCount={dayCount}
            startDate={detail.trip.start_date}
            destination={detail.trip.destination}
            logisticsDetails={detail.trip.logistics_details}
            itinerary={detail.itinerary}
            options={detail.options}
            knowledge={detail.knowledge}
            weatherForecasts={detail.weather_forecasts}
            onError={setError}
            onDone={invalidate}
          />
        </TabsContent>

        <TabsContent value="work" className="space-y-6">
          <TripDecisionsPanel tripId={tripId} decisions={detail.decisions} onError={setError} onDone={invalidate} />
          <TripTasksPanel tasks={detail.tasks} onError={setError} onDone={invalidate} />
        </TabsContent>
      </Tabs>
    </main>
  );
}
