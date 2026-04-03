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

  const regenerateMutation = useMutation({
    mutationFn: refreshWeeklyInspirations,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["growing", "weekly"] });
    },
  });

  const isBusy = convertMutation.isPending || statusMutation.isPending || regenerateMutation.isPending;

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

  const error =
    weeklyQuery.error instanceof Error
      ? weeklyQuery.error.message
      : convertMutation.error instanceof Error
      ? convertMutation.error.message
      : statusMutation.error instanceof Error
        ? statusMutation.error.message
        : null;

  if (weeklyQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading weekly growing suggestions...</p>;
  }

  const data = weeklyQuery.data;
  if (!data) {
    return <p className="text-sm text-muted-foreground">No weekly growing suggestions available.</p>;
  }
  const supportingByWindowId = new Map(data.supporting_knowledge.map((item) => [item.window_id, item.knowledge]));
  const activeActions = data.actions.filter((item) => item.status !== "dismissed");

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        {error ? <p className="text-sm text-red-600">{error}</p> : <span />}
        <Button
          type="button"
          size="xs"
          variant="ghost"
          className="text-xs text-muted-foreground hover:text-foreground px-2 h-7"
          onClick={() => regenerateMutation.mutate()}
          disabled={isBusy}
        >
          {regenerateMutation.isPending ? "Regenerating…" : "Regenerate"}
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-emerald-50/20 border-emerald-100/50">
          <CardHeader>
            <CardTitle>This Week in Stockholm</CardTitle>
            <p className="text-sm text-emerald-600 font-medium">Recommended Actions</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeActions.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No seasonal actions logged for this week.</p>
            ) : (
              activeActions.map((item) => (
                <article key={item.id} className="rounded-xl border border-emerald-100/50 bg-white p-4 shadow-sm transition-all hover:shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900">{item.title}</h3>
                    {item.status === 'converted' && (
                      <span className="shrink-0 text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase font-bold tracking-tighter border border-emerald-200">
                        Planned
                      </span>
                    )}
                  </div>
                  <p className="mb-4 mt-2 text-sm text-gray-600 leading-relaxed">{item.details}</p>
                  {item.window_id && supportingByWindowId.get(item.window_id)?.length ? (
                    <div className="mb-4 rounded-lg border border-emerald-100 bg-emerald-50/30 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                        Related knowledge
                      </p>
                      <div className="space-y-2">
                        {supportingByWindowId.get(item.window_id!)!.map((k) => (
                          <div key={`${item.id}-${k.id}`}>
                            <p className="text-sm font-medium text-gray-800">{k.title}</p>
                            <p className="text-xs text-gray-600 line-clamp-2">{k.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    {item.status === "converted" ? (
                      <Button size="sm" variant="ghost" className="text-emerald-600 font-medium h-9" asChild>
                        <Link href="/">✓ In Planner</Link>
                      </Button>
                    ) : (
                      <>
                        <Button 
                          size="sm" 
                          variant="default" 
                          className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-4"
                          onClick={() => onAddToBucket(item.id, "this_week")}
                          disabled={isBusy}
                        >
                          Add to Planner
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-gray-400 hover:text-gray-600 h-9"
                          onClick={() => onDismiss(item.id)}
                          disabled={isBusy}
                        >
                          Not now
                        </Button>
                      </>
                    )}
                  </div>
                </article>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="bg-amber-50/20 border-amber-100/50">
          <CardHeader>
            <CardTitle>Knowledge for your actions</CardTitle>
            <p className="text-sm text-amber-600 font-medium mt-1">Tips grouped by selected actions</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.supporting_knowledge.every((group) => group.knowledge.length === 0) ? (
              <p className="text-sm text-muted-foreground italic">No supporting knowledge found for current actions.</p>
            ) : (
              data.actions.map((action) => {
                const related = action.window_id ? supportingByWindowId.get(action.window_id) ?? [] : [];
                if (related.length === 0) return null;
                return (
                  <article
                    key={`knowledge-${action.id}`}
                    className="rounded-xl border border-amber-100/50 bg-white p-4 shadow-sm transition-all hover:shadow-md"
                  >
                    <h3 className="font-semibold text-gray-900">{action.title}</h3>
                    <div className="mt-3 space-y-3">
                      {related.map((item) => (
                        <div key={`${action.id}-${item.id}`}>
                          <p className="text-sm font-medium text-gray-800">{item.title}</p>
                          <p className="mt-1 text-xs text-gray-600 leading-relaxed">{item.content}</p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {item.tags.slice(0, 4).map((tag) => (
                              <span
                                key={`${item.id}-${tag}`}
                                className="text-[11px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
