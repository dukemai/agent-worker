"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";
import type { Bucket } from "@/types/database";
import { getISOWeekNumber } from "@agent/shared";
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
  const plannedCount = activeActions.filter((item) => item.status === "converted").length;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        {error ? <p className="text-sm text-red-600">{error}</p> : <span />}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-9 gap-2 px-2 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground"
          onClick={() => regenerateMutation.mutate()}
          disabled={isBusy}
        >
          <RefreshCw className={regenerateMutation.isPending ? "size-3.5 animate-spin" : "size-3.5"} />
          {regenerateMutation.isPending ? "Regenerating…" : "Regenerate"}
        </Button>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card className="gap-0 rounded-2xl border bg-card py-0 shadow-[0_1px_2px_rgba(36,31,25,0.04),0_8px_24px_-12px_rgba(36,31,25,0.14)]">
          <CardHeader className="px-6 pt-6 pb-[18px]">
            <CardTitle className="flex items-center justify-between">
              This Week in Stockholm
              <span className="rounded-full bg-[#f4e1cf] px-2.5 py-1 font-sans text-xs font-semibold text-primary">
                Week {getISOWeekNumber()}
              </span>
            </CardTitle>
            <div className="flex items-center justify-between mt-1">
              <p className="text-[13px] text-muted-foreground">Recommended actions</p>
              {activeActions.length > 0 && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {plannedCount}/{activeActions.length} planned
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3.5 px-6 pb-6">
            {activeActions.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No seasonal actions logged for this week.</p>
            ) : (
              activeActions.map((item) => (
                <article key={item.id} className="rounded-[14px] border bg-card p-4 transition-colors hover:border-primary/30">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-sans text-[15px] font-semibold text-foreground">{item.title}</h3>
                    {item.status === 'converted' && (
                      <span className="shrink-0 rounded-full bg-[#e1efe2] px-2.5 py-1 text-[11px] font-semibold text-[#3f7a4f]">
                        Planned
                      </span>
                    )}
                  </div>
                  <p className="mb-3.5 mt-2 text-[13px] leading-relaxed text-muted-foreground">{item.details}</p>
                  {item.window_id && supportingByWindowId.get(item.window_id)?.length ? (
                    <div className="mb-3 rounded-[10px] bg-muted px-3 py-2.5">
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.05em] text-muted-foreground">
                        Related knowledge
                      </p>
                      <div className="space-y-2">
                        {supportingByWindowId.get(item.window_id!)!.map((k) => (
                          <div key={`${item.id}-${k.id}`}>
                            <p className="text-[13px] font-medium text-foreground">{k.title}</p>
                            <p className="line-clamp-2 text-xs text-muted-foreground">{k.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    {item.status === "converted" ? (
                      <Button size="sm" variant="ghost" className="h-auto px-1 font-medium text-[#3f7a4f] hover:bg-transparent" asChild>
                        <Link href="/">✓ In Planner</Link>
                      </Button>
                    ) : (
                      <>
                        <Button 
                          size="sm" 
                          variant="default" 
                          className="h-10 rounded-[10px] bg-primary px-4 text-white shadow-none hover:bg-primary/90"
                          onClick={() => onAddToBucket(item.id, "this_week")}
                          disabled={isBusy}
                        >
                          Add to Planner
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-10 text-muted-foreground hover:bg-muted"
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

        <Card className="gap-0 rounded-2xl border bg-card py-0 shadow-[0_1px_2px_rgba(36,31,25,0.04),0_8px_24px_-12px_rgba(36,31,25,0.14)]">
          <CardHeader className="px-6 pt-6 pb-[18px]">
            <CardTitle>Knowledge for your actions</CardTitle>
            <p className="mt-1 text-[13px] text-muted-foreground">Tips grouped by this week&apos;s actions</p>
          </CardHeader>
          <CardContent className="space-y-3.5 px-6 pb-6">
            {data.supporting_knowledge.every((group) => group.knowledge.length === 0) ? (
              <p className="text-sm text-muted-foreground italic">No supporting knowledge found for current actions.</p>
            ) : (
              data.actions.map((action) => {
                const related = action.window_id ? supportingByWindowId.get(action.window_id) ?? [] : [];
                if (related.length === 0) return null;
                return (
                  <article
                    key={`knowledge-${action.id}`}
                    className="rounded-[14px] border bg-card p-4 transition-colors hover:border-primary/30"
                  >
                    <h3 className="font-sans text-[15px] font-semibold text-foreground">{action.title}</h3>
                    <div className="mt-3 space-y-3">
                      {related.map((item) => (
                        <div key={`${action.id}-${item.id}`}>
                          <p className="text-sm font-medium text-foreground">{item.title}</p>
                          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{item.content}</p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {item.tags.slice(0, 4).map((tag) => (
                              <span
                                key={`${item.id}-${tag}`}
                                className="rounded-full bg-[#dfe9e6] px-2.5 py-1 text-[11px] font-semibold text-[#3d6e68]"
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
