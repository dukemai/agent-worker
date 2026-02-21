"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Bucket, GrowingProfile, GrowingSuggestion } from "@/types/database";

type WeeklyGrowingResponse = {
  week_start_date: string;
  profile: GrowingProfile;
  actions: GrowingSuggestion[];
  inspirations: GrowingSuggestion[];
};

async function fetchWeeklyGrowing(): Promise<WeeklyGrowingResponse> {
  const response = await fetch("/api/growing/weekly", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load weekly growing suggestions");
  }
  return (await response.json()) as WeeklyGrowingResponse;
}

async function readApiError(response: Response, fallback: string): Promise<never> {
  const json = (await response.json().catch(() => ({}))) as { error?: string };
  throw new Error(json.error ?? fallback);
}

export function GrowingDashboard() {
  const queryClient = useQueryClient();
  const weeklyQuery = useQuery({
    queryKey: ["growing", "weekly"],
    queryFn: fetchWeeklyGrowing,
  });

  const convertMutation = useMutation({
    mutationFn: async ({ suggestionId, bucket }: { suggestionId: string; bucket: Bucket }) => {
      const response = await fetch("/api/growing/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          suggestion_id: suggestionId,
          bucket,
        }),
      });
      if (!response.ok) {
        await readApiError(response, "Failed to convert growing suggestion");
      }
      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["growing", "weekly"] }),
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
      ]);
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ suggestionId, status }: { suggestionId: string; status: "dismissed" | "done" }) => {
      const response = await fetch(`/api/growing/suggestions/${suggestionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        await readApiError(response, "Failed to update suggestion status");
      }
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["growing", "weekly"] });
    },
  });

  const isBusy = convertMutation.isPending || statusMutation.isPending;
  const error =
    weeklyQuery.error instanceof Error
      ? weeklyQuery.error.message
      : convertMutation.error instanceof Error
        ? convertMutation.error.message
        : statusMutation.error instanceof Error
          ? statusMutation.error.message
          : null;

  async function addToBucket(suggestionId: string, bucket: Bucket) {
    try {
      await convertMutation.mutateAsync({ suggestionId, bucket });
    } catch {
      return;
    }
  }

  async function dismissSuggestion(suggestionId: string) {
    try {
      await statusMutation.mutateAsync({ suggestionId, status: "dismissed" });
    } catch {
      return;
    }
  }

  if (weeklyQuery.isLoading) {
    return <main className="mx-auto w-full max-w-7xl px-4 py-6">Loading growing suggestions...</main>;
  }

  const data = weeklyQuery.data;
  if (!data) {
    return <main className="mx-auto w-full max-w-7xl px-4 py-6">No growing suggestions available.</main>;
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
      <Card>
        <CardHeader>
          <CardTitle>Growing This Week</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Location: {data.profile.city}, {data.profile.country_code}
          </p>
          <p>
            Setup: {data.profile.space_type} · Experience: {data.profile.experience_level}
          </p>
          <p>
            Week starting: {new Date(`${data.week_start_date}T00:00:00Z`).toLocaleDateString()}
          </p>
          {data.profile.interests.length > 0 ? <p>Interests: {data.profile.interests.join(", ")}</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-2">
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
                  <div className="flex flex-wrap gap-1">
                    <Button
                      size="sm"
                      className="min-h-11"
                      onClick={() => addToBucket(item.id, "today")}
                      disabled={isBusy}
                    >
                      Add to Today
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-11"
                      onClick={() => addToBucket(item.id, "this_week")}
                      disabled={isBusy}
                    >
                      Add to This Week
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-11"
                      onClick={() => dismissSuggestion(item.id)}
                      disabled={isBusy}
                    >
                      Dismiss
                    </Button>
                  </div>
                </article>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inspiration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.inspirations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No inspirations this week.</p>
            ) : (
              data.inspirations.map((item) => (
                <article key={item.id} className="rounded-md border p-3">
                  <h3 className="font-medium">{item.title}</h3>
                  <p className="mb-3 mt-1 text-sm text-muted-foreground">{item.details}</p>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-11"
                      onClick={() => addToBucket(item.id, "this_week")}
                      disabled={isBusy}
                    >
                      Turn into task
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-11"
                      onClick={() => dismissSuggestion(item.id)}
                      disabled={isBusy}
                    >
                      Dismiss
                    </Button>
                  </div>
                </article>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
