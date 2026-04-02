"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Task } from "@/types/database";
import { BUCKET_LABELS, type Bucket, type TasksByBucket } from "./types";
import { TaskCard } from "./TaskCard";

type BucketCardProps = {
  bucket: Bucket;
  tasks: TasksByBucket;
  /** When true, this column’s list is still loading (shows message under the header). */
  loading?: boolean;
  onMove: (taskId: string, fromBucket: Bucket, toBucket: Bucket) => Promise<void> | void;
  onMarkDone: (taskId: string, status: Task["status"]) => Promise<void> | void;
  onDelete: (taskId: string) => Promise<void> | void;
};

export function BucketCard({ bucket, tasks, loading = false, onMove, onMarkDone, onDelete }: BucketCardProps) {
  const list = tasks[bucket];

  return (
    <Card className="border-0 bg-transparent shadow-none gap-3 py-0">
      <CardHeader className="px-0 pb-2 pt-0">
        <CardTitle className="text-base font-semibold tracking-tight">
          {BUCKET_LABELS[bucket]}
          {!loading && list.length > 0 ? (
            <span className="ml-1.5 font-normal text-muted-foreground tabular-nums">({list.length})</span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-0">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading tasks…</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tasks</p>
        ) : (
          list.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              bucket={bucket}
              onMove={onMove}
              onMarkDone={onMarkDone}
              onDelete={onDelete}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

