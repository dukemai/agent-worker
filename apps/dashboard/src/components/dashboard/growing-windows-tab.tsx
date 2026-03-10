"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  deleteGrowingWindow,
  fetchGrowingWindows,
  type GrowingWindowItem,
  updateGrowingWindowMonths,
  updateGrowingWindowVerified,
} from "@/lib/growing-api";
import { extractYouTubeVideoId } from "@/lib/youtube";

const MONTH_NAMES = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

function formatMonthRange(start: number, end: number): string {
  if (start === end) return MONTH_NAMES[start] ?? "";
  return `${MONTH_NAMES[start] ?? start}–${MONTH_NAMES[end] ?? end}`;
}

export function GrowingWindowsTab() {
  const queryClient = useQueryClient();
  const windowsQuery = useQuery({
    queryKey: ["growing", "windows"],
    queryFn: fetchGrowingWindows,
  });
  const windows = windowsQuery.data?.windows ?? [];
  const isLoading = windowsQuery.isLoading;
  const [editingMonthsId, setEditingMonthsId] = useState<string | null>(null);
  const [draftStart, setDraftStart] = useState<Record<string, number>>({});
  const [draftEnd, setDraftEnd] = useState<Record<string, number>>({});

  const updateWindowVerifiedMutation = useMutation({
    mutationFn: ({ id, verified }: { id: string; verified: boolean }) => updateGrowingWindowVerified(id, verified),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["growing", "windows"] }),
        queryClient.invalidateQueries({ queryKey: ["growing", "weekly"] }),
      ]);
    },
  });

  const updateWindowMonthsMutation = useMutation({
    mutationFn: ({ id, start_month, end_month }: { id: string; start_month: number; end_month: number }) =>
      updateGrowingWindowMonths(id, start_month, end_month),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["growing", "windows"] }),
        queryClient.invalidateQueries({ queryKey: ["growing", "weekly"] }),
      ]);
    },
  });

  const deleteWindowMutation = useMutation({
    mutationFn: deleteGrowingWindow,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["growing", "windows"] }),
        queryClient.invalidateQueries({ queryKey: ["growing", "weekly"] }),
      ]);
    },
  });

  const isBusy =
    updateWindowVerifiedMutation.isPending ||
    updateWindowMonthsMutation.isPending ||
    deleteWindowMutation.isPending;
  const updatingId =
    updateWindowVerifiedMutation.isPending && updateWindowVerifiedMutation.variables
      ? updateWindowVerifiedMutation.variables.id
      : updateWindowMonthsMutation.isPending && updateWindowMonthsMutation.variables
        ? updateWindowMonthsMutation.variables.id
        : undefined;
  const deletingId =
    deleteWindowMutation.isPending && deleteWindowMutation.variables
      ? deleteWindowMutation.variables
      : undefined;

  const error =
    windowsQuery.error instanceof Error
      ? windowsQuery.error.message
      : updateWindowVerifiedMutation.error instanceof Error
        ? updateWindowVerifiedMutation.error.message
        : updateWindowMonthsMutation.error instanceof Error
          ? updateWindowMonthsMutation.error.message
          : deleteWindowMutation.error instanceof Error
            ? deleteWindowMutation.error.message
            : null;

  const total = windows.length;
  const verifiedCount = windows.filter((w) => w.verified).length;

  function startEditMonths(window: GrowingWindowItem) {
    setEditingMonthsId(window.id);
    setDraftStart((prev) => ({ ...prev, [window.id]: window.start_month }));
    setDraftEnd((prev) => ({ ...prev, [window.id]: window.end_month }));
  }

  function cancelEditMonths() {
    setEditingMonthsId(null);
  }

  async function saveMonths(id: string) {
    const start = draftStart[id] ?? 1;
    const end = draftEnd[id] ?? 12;
    if (start >= 1 && start <= 12 && end >= 1 && end <= 12) {
      await updateWindowMonthsMutation.mutateAsync({ id, start_month: start, end_month: end });
      setEditingMonthsId(null);
    }
  }

  async function handleToggleVerified(id: string, verified: boolean) {
    await updateWindowVerifiedMutation.mutateAsync({ id, verified });
  }

  async function handleDelete(id: string) {
    await deleteWindowMutation.mutateAsync(id);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Actionable Windows</CardTitle>
          <p className="text-sm text-muted-foreground">
            Seasonal tips extracted from your sources (YouTube or blogs). Mark as verified when you&apos;ve confirmed
            they work for your location.
          </p>
          {!isLoading && total > 0 ? (
            <p className="text-sm font-medium">
              {total} total · {verifiedCount} verified
            </p>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-3">
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading windows...</p>
          ) : windows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No actionable windows yet. Extract knowledge from a source first.
            </p>
          ) : (
            windows.map((window) => {
              const isBlog = window.source?.source_type === "blog";
              const isYouTube = window.source?.url ? extractYouTubeVideoId(window.source.url) !== null : false;
              let sourceLabel: string | null = null;
              const sourceHref: string | null = window.source?.url ?? null;
              if (window.source) {
                if (isBlog && window.source.url) {
                  try {
                    const hostname = new URL(window.source.url).hostname.replace(/^www\./, "");
                    sourceLabel = `Source: ${hostname || "Article"}`;
                  } catch {
                    sourceLabel = window.source.title ? `Source: ${window.source.title}` : "Source";
                  }
                } else if (window.source.title) {
                  sourceLabel = `Source: ${window.source.title}`;
                } else if (isYouTube) {
                  sourceLabel = "Source: Video";
                } else {
                  sourceLabel = "Source";
                }
              }

              return (
                <article key={window.id} className="rounded-md border p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium">{window.item_name}</h3>
                      <Badge variant="outline">{window.action_type ?? window.suggestion_kind}</Badge>
                      <Badge variant="secondary">{window.suggested_bucket}</Badge>
                      {window.verified ? (
                        <Badge variant="default">Verified</Badge>
                      ) : (
                        <Badge variant="outline">Unverified</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleVerified(window.id, !window.verified)}
                        disabled={isBusy || updatingId === window.id}
                      >
                        {updatingId === window.id ? "Updating…" : window.verified ? "Mark unverified" : "Mark verified"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(window.id)}
                        disabled={isBusy || deletingId === window.id}
                      >
                        {deletingId === window.id ? "Deleting…" : "Delete"}
                      </Button>
                    </div>
                  </div>
                  <p className="mb-2 text-sm text-muted-foreground">{window.stockholm_note}</p>
                  <div className="mb-2 flex flex-wrap gap-1">
                    {window.tags.map((tag) => (
                      <Badge key={`${window.id}-${tag}`} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {editingMonthsId === window.id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Select
                          value={String(draftStart[window.id] ?? window.start_month)}
                          onValueChange={(v) => setDraftStart((prev) => ({ ...prev, [window.id]: Number(v) }))}
                        >
                          <SelectTrigger className="h-7 w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MONTH_OPTIONS.map((m) => (
                              <SelectItem key={m} value={String(m)}>
                                {MONTH_NAMES[m]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span>–</span>
                        <Select
                          value={String(draftEnd[window.id] ?? window.end_month)}
                          onValueChange={(v) => setDraftEnd((prev) => ({ ...prev, [window.id]: Number(v) }))}
                        >
                          <SelectTrigger className="h-7 w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MONTH_OPTIONS.map((m) => (
                              <SelectItem key={m} value={String(m)}>
                                {MONTH_NAMES[m]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7"
                          onClick={() => saveMonths(window.id)}
                          disabled={isBusy || updatingId === window.id}
                        >
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7" onClick={cancelEditMonths}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span>Months: {formatMonthRange(window.start_month, window.end_month)}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-1 text-xs"
                          onClick={() => startEditMonths(window)}
                          disabled={isBusy}
                        >
                          Edit
                        </Button>
                      </>
                    )}
                    <span>Priority: {window.priority}</span>
                    {window.source && sourceLabel && sourceHref ? (
                      <a className="text-blue-600 underline" href={sourceHref} target="_blank" rel="noreferrer">
                        {sourceLabel}
                      </a>
                    ) : (
                      <span className="italic">No source</span>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
