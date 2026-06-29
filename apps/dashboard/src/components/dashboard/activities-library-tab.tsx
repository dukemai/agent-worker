"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityCard } from "./activities-cards";
import { fetchLocalActivities, updateLocalActivityStatus } from "./activities-api";
import type { ActivityStatus } from "@/types/database";

export function ActivitiesLibraryTab() {
  const queryClient = useQueryClient();
  const activitiesQuery = useQuery({
    queryKey: ["activities", "local"],
    queryFn: fetchLocalActivities,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ActivityStatus }) => updateLocalActivityStatus(id, status),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["activities", "local"] }),
        queryClient.invalidateQueries({ queryKey: ["activities", "summary"] }),
      ]);
    },
  });

  const error =
    activitiesQuery.error instanceof Error
      ? activitiesQuery.error.message
      : statusMutation.error instanceof Error
        ? statusMutation.error.message
        : null;

  if (activitiesQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading reusable activities...</p>;
  }

  const activities = activitiesQuery.data?.activities ?? [];

  return (
    <section className="space-y-4">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {activities.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">Reusable local activities will appear after source extraction.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {activities.map((activity) => (
            <Card key={activity.id} className={activity.status === "dismissed" ? "opacity-70" : undefined}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2 text-base">
                  <span>{activity.title}</span>
                  <Badge variant="outline" className="capitalize">
                    {activity.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ActivityCard item={activity} compact />
                <div className="flex justify-end gap-2">
                  {activity.status !== "active" ? (
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      onClick={() => statusMutation.mutate({ id: activity.id, status: "active" })}
                      disabled={statusMutation.isPending}
                    >
                      Restore
                    </Button>
                  ) : null}
                  {activity.status === "active" ? (
                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      onClick={() => statusMutation.mutate({ id: activity.id, status: "dismissed" })}
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
