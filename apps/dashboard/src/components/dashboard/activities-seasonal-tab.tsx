"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityCard } from "./activities-cards";
import { fetchSeasonalActivities, updateSeasonalActivityStatus } from "./activities-api";
import type { SeasonalActivityStatus } from "@/types/database";

export function ActivitiesSeasonalTab() {
  const queryClient = useQueryClient();
  const seasonalQuery = useQuery({
    queryKey: ["activities", "seasonal"],
    queryFn: fetchSeasonalActivities,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: SeasonalActivityStatus }) =>
      updateSeasonalActivityStatus(id, status),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["activities", "seasonal"] }),
        queryClient.invalidateQueries({ queryKey: ["activities", "summary"] }),
      ]);
    },
  });

  const error =
    seasonalQuery.error instanceof Error
      ? seasonalQuery.error.message
      : statusMutation.error instanceof Error
        ? statusMutation.error.message
        : null;

  if (seasonalQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading seasonal activities...</p>;
  }

  const instances = seasonalQuery.data?.instances ?? [];

  return (
    <section className="space-y-4">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {instances.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">Seasonal activity instances will appear after source extraction.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {instances.map((instance) => (
            <Card key={instance.id} className={instance.status === "dismissed" ? "opacity-70" : undefined}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
                  <span>{instance.title}</span>
                  <span className="flex items-center gap-2">
                    <Badge variant="outline">{instance.season}</Badge>
                    <Badge variant="outline" className="capitalize">
                      {instance.status}
                    </Badge>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ActivityCard item={instance} compact />
                <div className="flex justify-end gap-2">
                  {instance.status !== "active" ? (
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      onClick={() => statusMutation.mutate({ id: instance.id, status: "active" })}
                      disabled={statusMutation.isPending}
                    >
                      Restore
                    </Button>
                  ) : null}
                  {instance.status === "active" ? (
                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      onClick={() => statusMutation.mutate({ id: instance.id, status: "dismissed" })}
                      disabled={statusMutation.isPending}
                    >
                      Not now
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
