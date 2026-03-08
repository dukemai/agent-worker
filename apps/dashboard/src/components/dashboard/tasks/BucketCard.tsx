"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Task } from "@/types/database";
import { BUCKET_LABELS, type Bucket, type TasksByBucket } from "./types";
import { TaskCard } from "./TaskCard";

type BucketCardProps = {
  bucket: Bucket;
  tasks: TasksByBucket;
  onMove: (taskId: string, fromBucket: Bucket, toBucket: Bucket) => Promise<void> | void;
  onMarkDone: (taskId: string, status: Task["status"]) => Promise<void> | void;
};

export function BucketCard({ bucket, tasks, onMove, onMarkDone }: BucketCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{BUCKET_LABELS[bucket]}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks[bucket].length === 0 ? (
          <p className="text-sm text-muted-foreground">No tasks</p>
        ) : (
          tasks[bucket].map((task) => (
            <TaskCard key={task.id} task={task} bucket={bucket} onMove={onMove} onMarkDone={onMarkDone} />
          ))
        )}
      </CardContent>
    </Card>
  );
}
