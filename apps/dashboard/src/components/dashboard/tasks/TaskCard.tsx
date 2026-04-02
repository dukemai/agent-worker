"use client";

import { CheckCircle2, Circle, ExternalLink, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Task } from "@/types/database";
import { cn } from "@/lib/utils";
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
  onMove: (taskId: string, fromBucket: Bucket, toBucket: Bucket) => Promise<void> | void;
  onMarkDone: (taskId: string, status: Task["status"]) => Promise<void> | void;
  onDelete: (taskId: string) => Promise<void> | void;
};

export function TaskCard({ task, bucket, onMove, onMarkDone, onDelete }: TaskCardProps) {
  const isDone = task.status === "done";
  const link = typeof task.metadata?.link === "string" && task.metadata.link.length > 0 ? task.metadata.link : null;

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
          aria-label={isDone ? "Mark as pending" : "Mark as done"}
          onClick={() => onMarkDone(task.id, task.status)}
        >
          {isDone ? <CheckCircle2 className="size-5" strokeWidth={2} /> : <Circle className="size-5" strokeWidth={1.75} />}
        </Button>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3
              className={cn(
                "leading-snug font-medium",
                isDone && "text-muted-foreground line-through decoration-muted-foreground/80"
              )}
            >
              {task.title}
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

          {task.original_body ? (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">View original email body</summary>
              <pre className="mt-2 whitespace-pre-wrap rounded-md bg-muted/80 p-2 text-xs dark:bg-muted/50">{task.original_body}</pre>
            </details>
          ) : null}
        </div>
      </div>
    </article>
  );
}
