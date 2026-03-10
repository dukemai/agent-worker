"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Task } from "@/types/database";
import { fetchBucket, readApiError } from "./api";
import { BucketCard } from "./BucketCard";
import { BUCKETS, BUCKET_LABELS, EMPTY_TASKS, type Bucket, type TasksByBucket } from "./types";

function getTasksQueryError(
  todayError: unknown,
  thisWeekError: unknown,
  laterError: unknown
): string | null {
  if (todayError instanceof Error) return todayError.message;
  if (thisWeekError instanceof Error) return thisWeekError.message;
  if (laterError instanceof Error) return laterError.message;
  return null;
}

export function TasksBoard() {
  const queryClient = useQueryClient();
  const [activeBucket, setActiveBucket] = useState<Bucket>("today");
  const [error, setError] = useState<string | null>(null);

  const todayQuery = useQuery({ queryKey: ["tasks", "today"], queryFn: () => fetchBucket("today") });
  const thisWeekQuery = useQuery({ queryKey: ["tasks", "this_week"], queryFn: () => fetchBucket("this_week") });
  const laterQuery = useQuery({ queryKey: ["tasks", "later"], queryFn: () => fetchBucket("later") });

  const tasks: TasksByBucket = {
    today: todayQuery.data ?? EMPTY_TASKS.today,
    this_week: thisWeekQuery.data ?? EMPTY_TASKS.this_week,
    later: laterQuery.data ?? EMPTY_TASKS.later,
  };
  const loading = todayQuery.isLoading || thisWeekQuery.isLoading || laterQuery.isLoading;
  const queryError = getTasksQueryError(
    todayQuery.error,
    thisWeekQuery.error,
    laterQuery.error
  );
  const displayError = error ?? queryError;

  const moveTaskMutation = useMutation({
    mutationFn: async ({ taskId, fromBucket, toBucket }: { taskId: string; fromBucket: Bucket; toBucket: Bucket }) => {
      const response = await fetch(`/api/tasks/${taskId}/move`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from_bucket: fromBucket, to_bucket: toBucket }),
      });
      if (!response.ok) {
        await readApiError(response, "Failed to move task");
      }
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "Failed to move task");
    },
  });

  const markDoneMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: "pending" | "done" }) => {
      const nextStatus = status === "pending" ? "done" : "pending";
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) {
        await readApiError(response, "Failed to update task");
      }
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "Failed to update task");
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async ({ taskId }: { taskId: string }) => {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        await readApiError(response, "Failed to delete task");
      }
      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
        queryClient.invalidateQueries({ queryKey: ["renewals"] }),
      ]);
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "Failed to delete task");
    },
  });

  async function onMove(taskId: string, fromBucket: Bucket, toBucket: Bucket) {
    if (fromBucket === toBucket) {
      return;
    }
    setError(null);
    await moveTaskMutation.mutateAsync({ taskId, fromBucket, toBucket });
  }

  async function onMarkDone(taskId: string, status: Task["status"]) {
    setError(null);
    await markDoneMutation.mutateAsync({ taskId, status });
  }

  async function onDelete(taskId: string) {
    setError(null);
    await deleteTaskMutation.mutateAsync({ taskId });
  }

  return (
    <>
      {displayError ? <p className="text-sm text-red-600">{displayError}</p> : null}
      {loading ? <p>Loading tasks...</p> : null}

      <section className="md:hidden">
        <Tabs value={activeBucket} onValueChange={(value) => setActiveBucket(value as Bucket)}>
          <TabsList className="grid w-full grid-cols-3">
            {BUCKETS.map((bucket) => (
              <TabsTrigger key={bucket} value={bucket}>
                {BUCKET_LABELS[bucket]}
              </TabsTrigger>
            ))}
          </TabsList>
          {BUCKETS.map((bucket) => (
            <TabsContent key={bucket} value={bucket} className="mt-3">
              <BucketCard
                bucket={bucket}
                tasks={tasks}
                onMove={onMove}
                onMarkDone={onMarkDone}
                onDelete={onDelete}
              />
            </TabsContent>
          ))}
        </Tabs>
      </section>

      <section className="hidden gap-4 md:grid md:grid-cols-3">
        {BUCKETS.map((bucket) => (
          <BucketCard
            key={bucket}
            bucket={bucket}
            tasks={tasks}
            onMove={onMove}
            onMarkDone={onMarkDone}
            onDelete={onDelete}
          />
        ))}
      </section>
    </>
  );
}
