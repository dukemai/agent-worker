"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { AlertTriangle, Archive, ArrowLeft, CalendarDays, MapPin, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchTripDetail, updateTrip } from "@/components/dashboard/trip-ops-api";
import { formatDates, getDayCount } from "@/components/dashboard/trip-utils";
import { TripKnowledgePanel } from "@/components/dashboard/trip-detail/trip-knowledge-panel";
import { TripOverview, TripShareControl } from "@/components/dashboard/trip-detail/trip-overview-panel";
import { TripOptionsPanel } from "@/components/dashboard/trip-detail/trip-options-panel";
import { TripItineraryPanel } from "@/components/dashboard/trip-detail/trip-itinerary-panel";
import { TripDecisionsPanel, TripTasksPanel } from "@/components/dashboard/trip-detail/trip-work-panel";

export function TripDetailDashboard({ tripId }: { tripId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const queryKey = ["trip", tripId];
  const detailQuery = useQuery({ queryKey, queryFn: () => fetchTripDetail(tripId) });
  const [activeTab, setActiveTab] = useState("logistics");
  const [error, setError] = useState<string | null>(null);

  const lifecycleMutation = useMutation({
    mutationFn: (status: "archived" | "planning") => updateTrip(tripId, { status }),
    onSuccess: async (_, status) => {
      setError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey }),
        queryClient.invalidateQueries({ queryKey: ["trips"] }),
      ]);
      if (status === "archived") router.push("/trips");
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Failed to update trip status"),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const detail = detailQuery.data;
  const dayCount = useMemo(() => getDayCount(detail?.trip), [detail?.trip]);

  if (detailQuery.isLoading) {
    return <main className="mx-auto w-full max-w-[1440px] px-5 py-10 text-sm text-muted-foreground sm:px-8 lg:px-10">Loading trip...</main>;
  }
  if (detailQuery.isError || !detail) {
    return <main className="mx-auto w-full max-w-[1440px] px-5 py-10 text-sm text-destructive sm:px-8 lg:px-10">Trip could not be loaded.</main>;
  }

  return (
    <main className="mx-auto w-full max-w-[1440px] px-5 pb-12 sm:px-8 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-5 pt-7 pb-6">
        <div className="flex flex-col gap-3">
          <Button asChild variant="ghost" size="sm" className="h-auto w-fit gap-1.5 px-0 text-muted-foreground hover:bg-transparent hover:text-foreground">
            <Link href="/trips">
              <ArrowLeft className="size-4" aria-hidden />
              Trip Ops
            </Link>
          </Button>
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Trip workspace</p>
            <h1 className="font-serif text-[2rem] leading-none font-medium tracking-tight">{detail.trip.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1.5 capitalize"><MapPin className="size-3.5" aria-hidden />{detail.trip.destination || "No destination"}</Badge>
              <Badge variant="secondary" className="gap-1.5"><CalendarDays className="size-3.5" aria-hidden />{formatDates(detail.trip)}</Badge>
              <Badge className="border-0 bg-[#dfe9e6] capitalize text-[#3d6e68] shadow-none dark:bg-teal-950 dark:text-teal-200">{detail.trip.status}</Badge>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {detail.trip.status === "archived" ? (
            <Button
              type="button"
              variant="outline"
              size="default"
              disabled={lifecycleMutation.isPending}
              onClick={() => lifecycleMutation.mutate("planning")}
            >
              <RotateCcw className="size-4" aria-hidden />
              {lifecycleMutation.isPending ? "Restoring…" : "Restore to planning"}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="default"
              disabled={lifecycleMutation.isPending}
              onClick={() => {
                if (window.confirm(`Archive “${detail.trip.title}”? You can restore it later.`)) {
                  lifecycleMutation.mutate("archived");
                }
              }}
            >
              <Archive className="size-4" aria-hidden />
              {lifecycleMutation.isPending ? "Archiving…" : "Archive trip"}
            </Button>
          )}
          <TripShareControl tripId={tripId} tripTitle={detail.trip.title} onError={setError} />
        </div>
      </div>
      {error ? <p className="mb-5 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p> : null}

      {detail.trip.status !== "archived" && !detail.itinerary.some((item) => item.day_number === 1) ? (
        <div role="status" className="mb-6 flex items-center gap-3 rounded-[14px] border border-[#e6c6c6] bg-[#f3dede] px-[18px] py-3.5 text-sm text-[#7a3a3a] dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
          <AlertTriangle className="size-[18px] shrink-0" aria-hidden />
          <p>Day-1 itinerary is still missing — worth filling in before departure.{" "}
            <button type="button" className="rounded-sm underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-4" onClick={() => setActiveTab("itinerary")}>Go to Itinerary</button>
          </p>
        </div>
      ) : null}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="min-w-0 gap-0">
        <div className="overflow-x-auto border-b">
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none bg-transparent p-0">
          <TabsTrigger className="rounded-none border-b-2 border-transparent px-1 pb-3.5 shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none" value="logistics">Logistics</TabsTrigger>
          <TabsTrigger className="rounded-none border-b-2 border-transparent px-4 pb-3.5 shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none" value="knowledge">Knowledge</TabsTrigger>
          <TabsTrigger className="rounded-none border-b-2 border-transparent px-4 pb-3.5 shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none" value="options">Options</TabsTrigger>
          <TabsTrigger className="rounded-none border-b-2 border-transparent px-4 pb-3.5 shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none" value="itinerary">Itinerary</TabsTrigger>
          <TabsTrigger className="rounded-none border-b-2 border-transparent px-4 pb-3.5 shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none" value="work">Work</TabsTrigger>
        </TabsList>
        </div>

        <TabsContent value="logistics" className="pt-7">
          <TripOverview trip={detail.trip} />
        </TabsContent>

        <TabsContent value="knowledge" className="pt-7">
          <TripKnowledgePanel
            tripId={tripId}
            knowledge={detail.knowledge}
            favorites={detail.knowledge_favorites}
            storyContents={detail.story_contents}
            onError={setError}
            onDone={invalidate}
          />
        </TabsContent>

        <TabsContent value="options" className="pt-7">
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

        <TabsContent value="itinerary" className="pt-7">
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

        <TabsContent value="work" className="grid gap-6 pt-7 xl:grid-cols-2">
          <TripDecisionsPanel tripId={tripId} decisions={detail.decisions} onError={setError} onDone={invalidate} />
          <TripTasksPanel tasks={detail.tasks} onError={setError} onDone={invalidate} />
        </TabsContent>
      </Tabs>
    </main>
  );
}
