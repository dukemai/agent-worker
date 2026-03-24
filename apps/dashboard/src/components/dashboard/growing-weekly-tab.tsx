"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Bucket } from "@/types/database";
import {
  convertGrowingSuggestion,
  fetchWeeklyGrowing,
  refreshWeeklyInspirations,
  updateSuggestionStatus,
} from "@/lib/growing-api";

export function GrowingWeeklyTab() {
  const queryClient = useQueryClient();
  const weeklyQuery = useQuery({
    queryKey: ["growing", "weekly"],
    queryFn: fetchWeeklyGrowing,
  });

  const convertMutation = useMutation({
    mutationFn: ({ suggestionId, bucket }: { suggestionId: string; bucket: Bucket }) =>
      convertGrowingSuggestion(suggestionId, bucket),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["growing", "weekly"] }),
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
      ]);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ suggestionId, status }: { suggestionId: string; status: "dismissed" | "done" }) =>
      updateSuggestionStatus(suggestionId, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["growing", "weekly"] });
    },
  });

  const refreshMutation = useMutation({
    mutationFn: refreshWeeklyInspirations,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["growing", "weekly"] });
    },
  });

  const isBusy = convertMutation.isPending || statusMutation.isPending || refreshMutation.isPending;

  async function onAddToBucket(suggestionId: string, bucket: Bucket) {
    try {
      await convertMutation.mutateAsync({ suggestionId, bucket });
    } catch {
      return;
    }
  }

  async function onDismiss(suggestionId: string) {
    try {
      await statusMutation.mutateAsync({ suggestionId, status: "dismissed" });
    } catch {
      return;
    }
  }

  async function onRefreshInspirations() {
    try {
      await refreshMutation.mutateAsync();
    } catch {
      return;
    }
  }

  const error =
    weeklyQuery.error instanceof Error
      ? weeklyQuery.error.message
      : convertMutation.error instanceof Error
      ? convertMutation.error.message
      : statusMutation.error instanceof Error
        ? statusMutation.error.message
        : refreshMutation.error instanceof Error
          ? refreshMutation.error.message
          : null;

  if (weeklyQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading weekly growing suggestions...</p>;
  }

  const data = weeklyQuery.data;
  if (!data) {
    return <p className="text-sm text-muted-foreground">No weekly growing suggestions available.</p>;
  }

  return (
    <section className="space-y-3">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>This Week in Stockholm</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.actions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No actions this week.</p>
            ) : (
              data.actions.map((item) => (
                <article key={item.id} className="rounded-md border p-3">
                  <h3 className="font-medium">{item.title}</h3>
                  <p className="mb-3 mt-1 text-sm text-muted-foreground">{item.details}</p>
                  {item.converted_task_id ? (
                    <p className="mb-3 text-xs text-muted-foreground">Linked task: {item.converted_task_id}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" variant="outline" className="min-h-11" asChild>
                      <Link href="/">Open Tasks</Link>
                    </Button>
                  </div>
                </article>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Inspiration</CardTitle>
              <Button
                size="sm"
                variant="outline"
                className="min-h-9"
                onClick={onRefreshInspirations}
                disabled={isBusy}
              >
                Refresh inspirations
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.inspirations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No inspirations this week.</p>
            ) : (
              data.inspirations.map((item) => (
                <article key={item.id} className="rounded-md border p-3">
                  <h3 className="font-medium">{item.title}</h3>
                  <p className="mb-3 mt-1 text-sm text-muted-foreground">{item.details}</p>
                  {item.converted_task_id ? (
                    <>
                      <p className="mb-3 text-xs text-muted-foreground">Linked task: {item.converted_task_id}</p>
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="outline" className="min-h-11" asChild>
                          <Link href="/">Open Tasks</Link>
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-h-11"
                        onClick={() => onAddToBucket(item.id, "this_week")}
                        disabled={isBusy}
                      >
                        Turn into task
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-h-11"
                        onClick={() => onDismiss(item.id)}
                        disabled={isBusy}
                      >
                        Dismiss
                      </Button>
                    </div>
                  )}
                </article>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
