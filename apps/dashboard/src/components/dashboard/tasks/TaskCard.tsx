"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Task } from "@/types/database";
import { BUCKETS, BUCKET_LABELS, type Bucket } from "./types";

type TaskCardProps = {
  task: Task;
  bucket: Bucket;
  onMove: (taskId: string, fromBucket: Bucket, toBucket: Bucket) => Promise<void> | void;
  onMarkDone: (taskId: string, status: Task["status"]) => Promise<void> | void;
};

export function TaskCard({ task, bucket, onMove, onMarkDone }: TaskCardProps) {
  return (
    <article className="rounded-md border bg-muted/30 p-3">
      {task.metadata?.item_type === "renewal" ? (
        <Badge variant="outline" className="mb-2">
          renewal
        </Badge>
      ) : null}
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="font-medium">{task.title}</h3>
        <Badge variant={task.status === "done" ? "secondary" : "default"}>{task.status}</Badge>
      </div>
      <p className="mb-2 text-xs text-muted-foreground">
        Due: {task.due_date ? new Date(task.due_date).toLocaleString() : "No due date"}
      </p>
      {task.metadata?.item_type === "renewal" && typeof task.metadata.expires_on === "string" ? (
        <p className="mb-2 text-xs text-muted-foreground">
          Expires: {new Date(task.metadata.expires_on).toLocaleDateString()}
        </p>
      ) : null}
      <div className="mb-2 flex flex-wrap gap-1">
        {BUCKETS.filter((b) => b !== bucket).map((target) => (
          <Button
            key={target}
            size="sm"
            variant="outline"
            className="min-h-11"
            onClick={() => onMove(task.id, bucket, target)}
          >
            Move to {BUCKET_LABELS[target]}
          </Button>
        ))}
      </div>
      <div className="mb-2">
        <Button
          size="sm"
          className="min-h-11"
          variant={task.status === "done" ? "outline" : "default"}
          onClick={() => onMarkDone(task.id, task.status)}
        >
          {task.status === "done" ? "Mark pending" : "Mark done"}
        </Button>
        {typeof task.metadata?.link === "string" && task.metadata.link.length > 0 ? (
          <Button
            size="sm"
            variant="outline"
            className="ml-2 min-h-11"
            onClick={() => window.open(task.metadata.link as string, "_blank", "noopener,noreferrer")}
          >
            Open
          </Button>
        ) : null}
      </div>
      {task.original_body ? (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground">View original email body</summary>
          <pre className="mt-2 whitespace-pre-wrap rounded bg-muted p-2 text-xs">{task.original_body}</pre>
        </details>
      ) : null}
    </article>
  );
}
