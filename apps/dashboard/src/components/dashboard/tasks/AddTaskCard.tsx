"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Bucket } from "@/types/database";
import { readApiError } from "./api";
import type { CreateTaskPayload } from "./types";
import { BUCKETS, BUCKET_LABELS } from "./types";

export function AddTaskCard() {
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newBucket, setNewBucket] = useState<Bucket>("later");
  const [error, setError] = useState<string | null>(null);

  const createTaskMutation = useMutation({
    mutationFn: async (payload: CreateTaskPayload) => {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        await readApiError(response, "Failed to create task");
      }
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "Failed to create task");
    },
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await createTaskMutation.mutateAsync({
        title: newTitle,
        due_date: newDueDate ? new Date(newDueDate).toISOString() : null,
        bucket: newBucket,
      });
      setNewTitle("");
      setNewDueDate("");
      setNewBucket("later");
    } catch {
      return;
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Task</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-3 md:grid-cols-4" onSubmit={handleSubmit}>
          <Input
            className="md:col-span-2"
            placeholder="Task title"
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            required
          />
          <Input type="date" value={newDueDate} onChange={(event) => setNewDueDate(event.target.value)} />
          <select
            className="rounded-md border px-3 py-2 text-sm"
            value={newBucket}
            onChange={(event) => setNewBucket(event.target.value as Bucket)}
          >
            {BUCKETS.map((bucket) => (
              <option key={bucket} value={bucket}>
                {BUCKET_LABELS[bucket]}
              </option>
            ))}
          </select>
          <Button className="min-h-11 md:col-start-4" type="submit">
            Add Task
          </Button>
        </form>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
