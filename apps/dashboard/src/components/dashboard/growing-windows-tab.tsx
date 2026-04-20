"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  deleteGrowingWindow,
  fetchGrowingWindows,
  type GrowingWindowItem,
  mergeGrowingWindows,
  updateGrowingWindowMonths,
  updateGrowingWindowVerified,
} from "@/lib/growing-api";
import { extractYouTubeVideoId } from "@/lib/youtube";
import { cn } from "@/lib/utils";
import { CheckCircle2, Loader2, Merge, Search, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MONTH_NAMES = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

type WindowVerificationFilter = "all" | "verified" | "unverified";

function formatMonthRange(start: number, end: number): string {
  if (start === end) return MONTH_NAMES[start] ?? "";
  return `${MONTH_NAMES[start] ?? start}–${MONTH_NAMES[end] ?? end}`;
}

type SeasonPhase = "early" | "peak" | "late" | "off";

function getSeasonPhase(start: number, end: number): SeasonPhase {
  // Compute midpoint of the range, handling wrap-around (e.g. Nov–Feb).
  let s = start;
  let e = end;
  if (s < 1 || s > 12 || e < 1 || e > 12) return "off";
  if (e < s) {
    e += 12;
  }
  const mid = ((s + e) / 2) % 12 || 12;
  if (mid <= 3) return "early"; // Jan–Mar
  if (mid <= 7) return "peak"; // Apr–Jul
  if (mid <= 10) return "late"; // Aug–Oct
  return "off"; // Nov–Dec
}

function getSeasonPhaseClass(phase: SeasonPhase): string {
  switch (phase) {
    case "early":
      return "border-blue-200 bg-blue-50 text-blue-800";
    case "peak":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "late":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "off":
    default:
      return "border-muted bg-muted/40 text-muted-foreground";
  }
}

const VERIFIED_BADGE_CLASS = "border-emerald-200 bg-emerald-50 text-emerald-800";
const UNVERIFIED_BADGE_CLASS = "border-amber-200 bg-amber-50 text-amber-800";

export function GrowingWindowsTab() {
  const queryClient = useQueryClient();
  const [verification, setVerification] = useState<WindowVerificationFilter>("all");
  const [monthFilter, setMonthFilter] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const windowsQuery = useQuery({
    queryKey: ["growing", "windows", verification],
    queryFn: () =>
      fetchGrowingWindows({
        verification,
      }),
  });
  const windows = windowsQuery.data?.windows ?? [];
  const isLoading = windowsQuery.isLoading;
  const [editingMonthsId, setEditingMonthsId] = useState<string | null>(null);
  const [draftStart, setDraftStart] = useState<Record<string, number>>({});
  const [draftEnd, setDraftEnd] = useState<Record<string, number>>({});

  // Selection/Merge states
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const [primaryId, setPrimaryId] = useState<string | null>(null);

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

  const mergeWindowsMutation = useMutation({
    mutationFn: ({ primaryId, secondaryIds }: { primaryId: string; secondaryIds: string[] }) =>
      mergeGrowingWindows(primaryId, secondaryIds),
    onSuccess: async () => {
      setSelectionMode(false);
      setSelectedIds(new Set());
      setPrimaryId(null);
      setIsMergeDialogOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["growing", "windows"] }),
        queryClient.invalidateQueries({ queryKey: ["growing", "weekly"] }),
      ]);
    },
  });

  const isBusy =
    updateWindowVerifiedMutation.isPending ||
    updateWindowMonthsMutation.isPending ||
    deleteWindowMutation.isPending ||
    mergeWindowsMutation.isPending;
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
  const visibleWindows = windows.filter((w) => {
    // 1) Filter by verification
    // (Existing fetch logic already handles verification filter if we wanted, 
    // but we can also filter here for extra reactive filtering if needed. 
    // Actually the query already handles it.)
    
    // 2) Filter by month
    const m = monthFilter;
    const start = w.start_month;
    const end = w.end_month;
    let monthMatch = true;
    if (m !== "all") {
      if (start < 1 || start > 12 || end < 1 || end > 12) monthMatch = false;
      else if (start <= end) monthMatch = m >= start && m <= end;
      else monthMatch = m >= start || m <= end;
    }
    if (!monthMatch) return false;

    // 3) Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = w.item_name.toLowerCase().includes(q);
      const noteMatch = w.stockholm_note.toLowerCase().includes(q);
      const tagMatch = w.tags.some(tag => tag.toLowerCase().includes(q));
      if (!nameMatch && !noteMatch && !tagMatch) return false;
    }

    return true;
  });

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
          <CardTitle>
            Actionable Windows
            {!isLoading && total > 0 ? (
              <span className="ml-2 text-sm font-normal text-muted-foreground tabular-nums bg-muted/50 px-2 py-0.5 rounded-md">
                {visibleWindows.length} showing / {total} total
                <span className="mx-1.5 opacity-40">|</span>
                {verifiedCount} verified
              </span>
            ) : null}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Seasonal tips extracted from your sources (YouTube or blogs). Mark as verified when you&apos;ve confirmed
            they work for your location.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search windows..."
                className="w-[200px] pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Select value={verification} onValueChange={(value) => setVerification(value as WindowVerificationFilter)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Verification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All windows</SelectItem>
                <SelectItem value="verified">Verified only</SelectItem>
                <SelectItem value="unverified">Unverified only</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={monthFilter === "all" ? "all" : String(monthFilter)}
              onValueChange={(value) =>
                setMonthFilter(value === "all" ? "all" : (Number(value) as number))
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All months</SelectItem>
                {MONTH_OPTIONS.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {MONTH_NAMES[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex-1" />
            <div className="flex gap-2">
              {selectionMode ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => { setSelectionMode(false); setSelectedIds(new Set()); }}>
                    Cancel
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="bg-indigo-600 hover:bg-indigo-700"
                    disabled={selectedIds.size < 2}
                    onClick={() => setIsMergeDialogOpen(true)}
                  >
                    <Merge className="mr-2 size-4" />
                    Merge ({selectedIds.size})
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setSelectionMode(true)}>
                  <Merge className="mr-2 size-4" />
                  Merge Mode
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading windows...</p>
          ) : windows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No actionable windows yet. Extract knowledge from a source first.
            </p>
          ) : visibleWindows.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              No windows match your filter. Try a different search or clear it.
            </p>
          ) : (
            visibleWindows.map((window) => {
              const isSelected = selectedIds.has(window.id);
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
                <article 
                  key={window.id} 
                  className={cn(
                    "rounded-md border bg-card/60 p-3 transition-all",
                    selectionMode && "cursor-pointer hover:border-indigo-400",
                    isSelected && "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-md ring-1 ring-indigo-600"
                  )}
                  onClick={() => {
                    if (selectionMode) {
                      const next = new Set(selectedIds);
                      if (next.has(window.id)) next.delete(window.id);
                      else next.add(window.id);
                      setSelectedIds(next);
                    }
                  }}
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium">{window.item_name}</h3>
                      <Badge variant="outline">{window.action_type ?? window.suggestion_kind}</Badge>
                      <Badge variant="secondary">{window.suggested_bucket}</Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[11px] tabular-nums border px-2 py-0.5",
                          getSeasonPhaseClass(getSeasonPhase(window.start_month, window.end_month))
                        )}
                      >
                        {formatMonthRange(window.start_month, window.end_month)}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[11px] uppercase tracking-wide border px-2 py-0.5",
                          window.verified ? VERIFIED_BADGE_CLASS : UNVERIFIED_BADGE_CLASS
                        )}
                      >
                        {window.verified ? "Verified" : "Unverified"}
                      </Badge>
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
                      <Badge
                        key={`${window.id}-${tag}`}
                        variant="outline"
                        className="border-amber-200 bg-amber-50 text-amber-800"
                      >
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

      <Dialog open={isMergeDialogOpen} onOpenChange={setIsMergeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Merge Growing Windows</DialogTitle>
            <DialogDescription>
              This will merge {selectedIds.size} windows into one. All historical suggestions and tasks will be reassigned to the primary window. Secondary windows will be deleted.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="text-sm font-medium">Select the primary window to keep:</p>
            <div className="grid gap-2">
              {Array.from(selectedIds).map((id) => {
                const win = windows.find((w) => w.id === id);
                if (!win) return null;
                return (
                  <button
                    key={id}
                    onClick={() => setPrimaryId(id)}
                    className={cn(
                      "flex items-center justify-between rounded-md border p-3 text-left text-sm transition-colors",
                      primaryId === id 
                        ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 ring-1 ring-indigo-600" 
                        : "hover:bg-muted"
                    )}
                  >
                    <span>{win.item_name}</span>
                    {primaryId === id && <CheckCircle2 className="size-4 text-indigo-600" />}
                  </button>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMergeDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              disabled={!primaryId || mergeWindowsMutation.isPending}
              onClick={() => {
                if (primaryId) {
                  const secondaryIds = Array.from(selectedIds).filter(id => id !== primaryId);
                  mergeWindowsMutation.mutate({ primaryId, secondaryIds });
                }
              }}
            >
              {mergeWindowsMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Confirm Merge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
