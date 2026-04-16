"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Task } from "@/types/database";
import { BUCKET_LABELS, type Bucket, type TasksByBucket } from "./types";
import { TaskCard } from "./TaskCard";

type TaskStatusFilter = "all" | "done" | "pending";
type TaskColumnSort =
  | "updated_desc"
  | "updated_asc"
  | "status_pending_first"
  | "status_done_first";

function taskActivityTimestamp(task: Task): number {
  const raw = task.updated_at ?? task.created_at;
  return new Date(raw).getTime();
}

function compareForSort(a: Task, b: Task, sort: TaskColumnSort): number {
  switch (sort) {
    case "updated_desc":
      return taskActivityTimestamp(b) - taskActivityTimestamp(a);
    case "updated_asc":
      return taskActivityTimestamp(a) - taskActivityTimestamp(b);
    case "status_pending_first": {
      const rank = (s: Task["status"]) => (s === "pending" ? 0 : 1);
      const primary = rank(a.status) - rank(b.status);
      if (primary !== 0) return primary;
      return taskActivityTimestamp(b) - taskActivityTimestamp(a);
    }
    case "status_done_first": {
      const rank = (s: Task["status"]) => (s === "done" ? 0 : 1);
      const primary = rank(a.status) - rank(b.status);
      if (primary !== 0) return primary;
      return taskActivityTimestamp(b) - taskActivityTimestamp(a);
    }
    default:
      return 0;
  }
}

type BucketCardProps = {
  bucket: Bucket;
  tasks: TasksByBucket;
  /** When true, this column’s list is still loading (shows message under the header). */
  loading?: boolean;
  /** Task IDs currently being toggled between pending/done. */
  togglingTaskIds?: Set<string>;
  onMove: (taskId: string, fromBucket: Bucket, toBucket: Bucket) => Promise<void> | void;
  onMarkDone: (taskId: string, status: Task["status"]) => Promise<void> | void;
  onDelete: (taskId: string) => Promise<void> | void;
};

export function BucketCard({
  bucket,
  tasks,
  loading = false,
  togglingTaskIds,
  onMove,
  onMarkDone,
  onDelete,
}: BucketCardProps) {
  const list = tasks[bucket];
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>("all");
  const [sort, setSort] = useState<TaskColumnSort>("status_pending_first");

  const { displayList, totalInBucket } = useMemo(() => {
    const filtered =
      statusFilter === "all"
        ? list
        : list.filter((t) => (statusFilter === "done" ? t.status === "done" : t.status === "pending"));
    const sorted = [...filtered].sort((a, b) => compareForSort(a, b, sort));
    return { displayList: sorted, totalInBucket: list.length };
  }, [list, statusFilter, sort]);

  const showCountBreakdown = !loading && totalInBucket > 0 && statusFilter !== "all";
  const countLabel =
    !loading && totalInBucket > 0
      ? showCountBreakdown
        ? `(${displayList.length}/${totalInBucket})`
        : `(${displayList.length})`
      : null;

  return (
    <Card className="border-0 bg-transparent shadow-none gap-3 py-0">
      <CardHeader className="px-0 pb-2 pt-0 space-y-2">
        <CardTitle className="text-base font-semibold tracking-tight">
          {BUCKET_LABELS[bucket]}
          {countLabel ? (
            <span className="ml-1.5 font-normal text-muted-foreground tabular-nums">{countLabel}</span>
          ) : null}
        </CardTitle>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TaskStatusFilter)}>
            <SelectTrigger className="h-8 w-full min-w-0 sm:w-[130px] text-xs" aria-label={`${BUCKET_LABELS[bucket]} status filter`}>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tasks</SelectItem>
              <SelectItem value="pending">Undone</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as TaskColumnSort)}>
            <SelectTrigger className="h-8 w-full min-w-0 sm:min-w-[200px] sm:max-w-[240px] text-xs" aria-label={`${BUCKET_LABELS[bucket]} sort`}>
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated_desc">Last updated (newest)</SelectItem>
              <SelectItem value="updated_asc">Last updated (oldest)</SelectItem>
              <SelectItem value="status_pending_first">Status (undone first)</SelectItem>
              <SelectItem value="status_done_first">Status (done first)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-0">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading tasks…</p>
        ) : totalInBucket === 0 ? (
          <p className="text-sm text-muted-foreground">No tasks</p>
        ) : displayList.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tasks match this filter.</p>
        ) : (
          displayList.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              bucket={bucket}
              markDoneLoading={togglingTaskIds?.has(task.id) ?? false}
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
