"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Task } from "@/types/database";
import { cn } from "@/lib/utils";
import { fetchGrowingWindowKnowledge } from "./api";
import { BUCKETS, type Bucket } from "./types";

/** Short labels for move actions to keep the row compact. */
const MOVE_SHORT: Record<Bucket, string> = {
  today: "Today",
  this_week: "Week",
  later: "Later",
};

type TaskCardProps = {
  task: Task;
  bucket: Bucket;
  markDoneLoading?: boolean;
  onMove: (taskId: string, fromBucket: Bucket, toBucket: Bucket) => Promise<void> | void;
  onMarkDone: (taskId: string, status: Task["status"]) => Promise<void> | void;
  onDelete: (taskId: string) => Promise<void> | void;
};

export function TaskCard({ task, bucket, markDoneLoading = false, onMove, onMarkDone, onDelete }: TaskCardProps) {
  const isDone = task.status === "done";
  const link = typeof task.metadata?.link === "string" && task.metadata.link.length > 0 ? task.metadata.link : null;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const isGrowingTask = task.source === "growing" || task.metadata?.item_type === "growing";
  const growingWindowId = useMemo(() => {
    if (typeof task.metadata?.window_id === "string" && task.metadata.window_id.length > 0) {
      return task.metadata.window_id;
    }
    return task.window_id;
  }, [task.metadata, task.window_id]);
  const knowledgeQuery = useQuery({
    queryKey: ["growing", "window-knowledge", growingWindowId],
    queryFn: () => fetchGrowingWindowKnowledge(growingWindowId!),
    enabled: detailsOpen && isGrowingTask && typeof growingWindowId === "string" && growingWindowId.length > 0,
    staleTime: 60_000,
  });

  return (
    <article
      className={cn(
        "rounded-lg border p-3 transition-colors",
        isDone
          ? "border-emerald-200/80 bg-emerald-50/70 dark:border-emerald-900/45 dark:bg-emerald-950/30"
          : "border-amber-200/70 bg-amber-50/90 shadow-sm dark:border-amber-900/35 dark:bg-amber-950/20"
      )}
    >
      {task.metadata?.item_type === "renewal" ? (
        <Badge variant="outline" className="mb-2 text-[10px] font-normal uppercase tracking-wide">
          renewal
        </Badge>
      ) : null}

      <div className="flex gap-2.5">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={cn("shrink-0", isDone ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}
          aria-label={markDoneLoading ? "Updating task status" : isDone ? "Mark as pending" : "Mark as done"}
          aria-busy={markDoneLoading}
          disabled={markDoneLoading}
          onClick={() => onMarkDone(task.id, task.status)}
        >
          {markDoneLoading ? (
            <Loader2 className="size-5 animate-spin" aria-hidden />
          ) : isDone ? (
            <CheckCircle2 className="size-5" strokeWidth={2} />
          ) : (
            <Circle className="size-5" strokeWidth={1.75} />
          )}
        </Button>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3
              className={cn(
                "leading-snug font-medium",
                isDone && "text-muted-foreground line-through decoration-muted-foreground/80"
              )}
            >
              <Link href={`/tasks/${task.id}`} className="hover:underline">
                {task.title}
              </Link>
            </h3>
            <div className="flex shrink-0 items-center gap-0.5">
              {link ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Open link"
                  onClick={() => window.open(link, "_blank", "noopener,noreferrer")}
                >
                  <ExternalLink className="size-3.5" />
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:text-destructive"
                aria-label="Delete task"
                onClick={() => onDelete(task.id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Due: {task.due_date ? new Date(task.due_date).toLocaleString() : "No due date"}
          </p>
          {task.metadata?.item_type === "renewal" && typeof task.metadata.expires_on === "string" ? (
            <p className="text-xs text-muted-foreground">
              Expires: {new Date(task.metadata.expires_on).toLocaleDateString()}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-1 pt-0.5">
            {BUCKETS.filter((b) => b !== bucket).map((target) => (
              <Button
                key={target}
                type="button"
                size="xs"
                variant="outline"
                className="font-normal"
                onClick={() => onMove(task.id, bucket, target)}
              >
                {MOVE_SHORT[target]}
              </Button>
            ))}
          </div>

          {task.original_body || isGrowingTask ? (
            <details className="text-xs" onToggle={(event) => setDetailsOpen((event.currentTarget as HTMLDetailsElement).open)}>
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                View task details
              </summary>
              {task.original_body ? (
                <pre className="mt-2 whitespace-pre-wrap rounded-md bg-muted/80 p-2 text-xs dark:bg-muted/50">
                  {task.original_body}
                </pre>
              ) : (
                <p className="mt-2 text-muted-foreground">No additional task note.</p>
              )}
              {isGrowingTask ? (
                <div className="mt-2 rounded-md border border-emerald-100 bg-emerald-50/30 p-2 dark:border-emerald-900/35 dark:bg-emerald-950/20">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                    Related knowledge
                  </p>
                  {knowledgeQuery.isLoading ? (
                    <p className="text-muted-foreground">Loading related knowledge…</p>
                  ) : knowledgeQuery.error instanceof Error ? (
                    <p className="text-red-600">{knowledgeQuery.error.message}</p>
                  ) : !knowledgeQuery.data?.length ? (
                    <p className="text-muted-foreground">No related knowledge found.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {knowledgeQuery.data.map((item) => (
                        <div key={`${task.id}-${item.id}`}>
                          <p className="font-medium text-foreground">{item.title}</p>
                          <p className="line-clamp-2 text-muted-foreground">{item.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </details>
          ) : null}
        </div>
      </div>
    </article>
  );
}
