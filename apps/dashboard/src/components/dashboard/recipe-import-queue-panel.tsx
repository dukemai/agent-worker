"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock3, Loader2, RotateCcw, Trash2, XCircle } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  createRecipeImportQueueItem,
  deleteRecipeImportQueueItem,
  fetchRecipeImportQueue,
  runRecipeImportQueueNow,
} from "@/components/dashboard/recipe-generator-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { RecipeImportQueueRow, RecipeImportQueueStatus } from "@/lib/recipe-import-queue";
import { cn } from "@/lib/utils";

function formatQueueTime(iso: string | null): string {
  if (!iso) {
    return "-";
  }
  try {
    return new Date(iso).toLocaleString("sv-SE", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function statusLabel(status: RecipeImportQueueStatus): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "processing":
      return "Processing";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
  }
}

function StatusBadge({ status }: { status: RecipeImportQueueStatus }) {
  const Icon =
    status === "completed"
      ? CheckCircle2
      : status === "failed"
        ? XCircle
        : status === "processing"
          ? Loader2
          : Clock3;
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5",
        status === "completed" && "border-emerald-300 bg-emerald-50 text-emerald-900",
        status === "failed" && "border-destructive/40 bg-destructive/5 text-destructive",
        status === "processing" && "border-blue-300 bg-blue-50 text-blue-900",
      )}
    >
      <Icon
        className={cn("size-3.5", status === "processing" && "animate-spin")}
        aria-hidden
      />
      {statusLabel(status)}
    </Badge>
  );
}

function QueueItemCard({
  item,
  onDelete,
  onRun,
  deleting,
  running,
}: {
  item: RecipeImportQueueRow;
  onDelete: (id: string) => void;
  onRun: (id: string) => void;
  deleting: boolean;
  running: boolean;
}) {
  const sourceText = item.source_label.trim() || item.source_url.trim() || "Pasted source";
  const canRun = item.status === "pending" || item.status === "failed";
  const [showMarkdown, setShowMarkdown] = useState(false);
  return (
    <div className="rounded-md border bg-background p-3 text-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={item.status} />
            <span className="font-medium leading-snug">{sourceText}</span>
          </div>
          {item.source_url.trim() ? (
            <a
              href={item.source_url}
              target="_blank"
              rel="noreferrer"
              className="block truncate text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              {item.source_url}
            </a>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Added {formatQueueTime(item.created_at)}
            {item.attempts > 0 ? ` · attempts ${item.attempts}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {canRun ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={running || deleting}
              onClick={() => onRun(item.id)}
              title="Run this queue item now"
            >
              {running ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  Running
                </>
              ) : (
                "Run now"
              )}
            </Button>
          ) : null}
          {item.created_recipe_id ? (
            <Button asChild size="sm" variant="outline">
              <Link href={`/recipe-generator/${item.created_recipe_id}/edit`}>
                Open recipe
              </Link>
            </Button>
          ) : null}
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            disabled={deleting || item.status === "processing"}
            onClick={() => onDelete(item.id)}
            aria-label="Delete import queue item"
            title={
              item.status === "processing"
                ? "Processing items cannot be deleted"
                : "Delete queue item"
            }
          >
            {deleting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="size-4" aria-hidden />
            )}
          </Button>
        </div>
      </div>
      {item.last_error ? (
        <p className="mt-2 rounded border border-destructive/30 bg-destructive/5 px-2 py-1.5 text-xs text-destructive">
          {item.last_error}
        </p>
      ) : null}
      {item.source_markdown_preview ? (
        <div className="mt-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={() => setShowMarkdown((v) => !v)}
          >
            {showMarkdown ? "Hide markdown" : "Show markdown"}
          </Button>
          {showMarkdown ? (
            <p className="mt-1 whitespace-pre-wrap rounded bg-muted/40 px-2 py-1.5 font-mono text-xs text-muted-foreground">
              {item.source_markdown_preview}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function formatQueueSummary(items: RecipeImportQueueRow[]): string {
  const total = items.length;
  const pending = items.filter((item) => item.status === "pending").length;
  const processing = items.filter((item) => item.status === "processing").length;
  const completed = items.filter((item) => item.status === "completed").length;
  const failed = items.filter((item) => item.status === "failed").length;
  return `${total} total · ${pending} pending · ${processing} processing · ${completed} completed · ${failed} failed`;
}

export function RecipeImportQueuePanel() {
  const queryClient = useQueryClient();
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [sourceMarkdown, setSourceMarkdown] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [lastRunSummary, setLastRunSummary] = useState<string | null>(null);

  const queueQuery = useQuery({
    queryKey: ["recipe-import-queue"],
    queryFn: fetchRecipeImportQueue,
  });

  const createMutation = useMutation({
    mutationFn: createRecipeImportQueueItem,
    onSuccess: async () => {
      setSourceUrl("");
      setSourceLabel("");
      setSourceMarkdown("");
      setLocalError(null);
      setLastRunSummary(null);
      await queryClient.invalidateQueries({ queryKey: ["recipe-import-queue"] });
    },
    onError: (e) => {
      setLocalError(e instanceof Error ? e.message : "Failed to add import queue item");
    },
  });

  const runMutation = useMutation({
    mutationFn: runRecipeImportQueueNow,
    onSuccess: async (result) => {
      setLocalError(null);
      setLastRunSummary(
        `Processed ${result.processed}; completed ${result.completed}, failed ${result.failed}, skipped ${result.skipped}.`,
      );
      await queryClient.invalidateQueries({ queryKey: ["recipe-import-queue"] });
      await queryClient.invalidateQueries({ queryKey: ["saved-recipes"] });
    },
    onError: (e) => {
      setLastRunSummary(null);
      setLocalError(e instanceof Error ? e.message : "Failed to run import queue");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRecipeImportQueueItem,
    onSuccess: async () => {
      setLocalError(null);
      await queryClient.invalidateQueries({ queryKey: ["recipe-import-queue"] });
    },
    onError: (e) => {
      setLocalError(e instanceof Error ? e.message : "Failed to delete queue item");
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void createMutation.mutateAsync({
      source_url: sourceUrl,
      source_label: sourceLabel,
      source_markdown: sourceMarkdown,
    });
  }

  const items = queueQuery.data ?? [];
  const busy = createMutation.isPending;

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Add to import queue</CardTitle>
            <CardDescription className="mt-1.5">
              Paste a trusted source now; the worker extracts it into the library on the next run.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="w-fit gap-1.5">
              <RotateCcw className="size-3.5" aria-hidden />
              Daily worker
            </Badge>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={runMutation.isPending}
              onClick={() => void runMutation.mutateAsync(undefined)}
            >
              {runMutation.isPending && runMutation.variables === undefined ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  Running
                </>
              ) : (
                "Run queue now"
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {localError ? (
          <p className="rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {localError}
          </p>
        ) : null}
        {lastRunSummary ? (
          <p className="rounded-md border border-emerald-300/70 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {lastRunSummary}
          </p>
        ) : null}

        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Source URL</span>
              <Input
                type="url"
                inputMode="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://..."
                maxLength={2000}
                disabled={busy}
              />
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Source label</span>
              <Input
                value={sourceLabel}
                onChange={(e) => setSourceLabel(e.target.value)}
                placeholder="Blog, cookbook note, YouTube..."
                maxLength={200}
                disabled={busy}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Markdown</span>
            <Textarea
              value={sourceMarkdown}
              onChange={(e) => setSourceMarkdown(e.target.value)}
              rows={10}
              placeholder="Paste recipe markdown or copied recipe text..."
              className="font-mono text-sm"
              disabled={busy}
            />
          </div>
          <Button type="submit" disabled={busy || !sourceMarkdown.trim()}>
            {busy ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                Adding...
              </>
            ) : (
              "Add to queue"
            )}
          </Button>
        </form>

        <div className="space-y-2 border-t pt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Import queue</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {queueQuery.isLoading ? "Loading..." : formatQueueSummary(items)}
            </p>
          </div>
          {queueQuery.isError ? (
            <p className="text-sm text-destructive">
              {queueQuery.error instanceof Error
                ? queueQuery.error.message
                : "Failed to load import queue"}
            </p>
          ) : null}
          {!queueQuery.isLoading && !queueQuery.isError && items.length === 0 ? (
            <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
              No queued imports yet.
            </p>
          ) : null}
          <div className="space-y-2">
            {items.map((item) => (
              <QueueItemCard
                key={item.id}
                item={item}
                deleting={deleteMutation.isPending && deleteMutation.variables === item.id}
                running={runMutation.isPending && runMutation.variables === item.id}
                onDelete={(id) => void deleteMutation.mutateAsync(id)}
                onRun={(id) => void runMutation.mutateAsync(id)}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
