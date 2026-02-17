"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Bucket, Task } from "@/types/database";

const BUCKETS: Bucket[] = ["today", "this_week", "later"];
const BUCKET_LABELS: Record<Bucket, string> = {
  today: "Today",
  this_week: "This Week",
  later: "Later",
};

type TasksByBucket = Record<Bucket, Task[]>;

const EMPTY_TASKS: TasksByBucket = {
  today: [],
  this_week: [],
  later: [],
};

export function TasksDashboard() {
  const [tasks, setTasks] = useState<TasksByBucket>(EMPTY_TASKS);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newBucket, setNewBucket] = useState<Bucket>("later");
  const [error, setError] = useState<string | null>(null);

  const fetchBucket = useCallback(async (bucket: Bucket): Promise<Task[]> => {
    const response = await fetch(`/api/tasks?bucket=${bucket}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to fetch ${bucket} tasks`);
    }
    const json = (await response.json()) as { tasks: Task[] };
    return json.tasks;
  }, []);

  const reloadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [today, thisWeek, later] = await Promise.all([
        fetchBucket("today"),
        fetchBucket("this_week"),
        fetchBucket("later"),
      ]);
      setTasks({ today, this_week: thisWeek, later });
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [fetchBucket]);

  useEffect(() => {
    void reloadAll();
  }, [reloadAll]);

  async function onCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTitle,
        due_date: newDueDate ? new Date(newDueDate).toISOString() : null,
        bucket: newBucket,
      }),
    });

    if (!response.ok) {
      const json = (await response.json()) as { error?: string };
      setError(json.error ?? "Failed to create task");
      return;
    }

    setNewTitle("");
    setNewDueDate("");
    setNewBucket("later");
    await reloadAll();
  }

  async function onMove(taskId: string, fromBucket: Bucket, toBucket: Bucket) {
    if (fromBucket === toBucket) {
      return;
    }
    setError(null);

    const response = await fetch(`/api/tasks/${taskId}/move`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from_bucket: fromBucket, to_bucket: toBucket }),
    });

    if (!response.ok) {
      const json = (await response.json()) as { error?: string };
      setError(json.error ?? "Failed to move task");
      return;
    }

    await reloadAll();
  }

  async function onMarkDone(taskId: string, status: "pending" | "done") {
    const nextStatus = status === "pending" ? "done" : "pending";
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });

    if (!response.ok) {
      const json = (await response.json()) as { error?: string };
      setError(json.error ?? "Failed to update task");
      return;
    }

    await reloadAll();
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Task</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-4" onSubmit={onCreateTask}>
            <Input
              className="md:col-span-2"
              placeholder="Task title"
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              required
            />
            <Input
              type="date"
              value={newDueDate}
              onChange={(event) => setNewDueDate(event.target.value)}
            />
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
            <Button className="md:col-start-4" type="submit">
              Add Task
            </Button>
          </form>
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </CardContent>
      </Card>

      {loading ? <p>Loading tasks...</p> : null}

      <section className="grid gap-4 md:grid-cols-3">
        {BUCKETS.map((bucket) => (
          <Card key={bucket}>
            <CardHeader>
              <CardTitle>{BUCKET_LABELS[bucket]}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tasks[bucket].length === 0 ? (
                <p className="text-sm text-muted-foreground">No tasks</p>
              ) : (
                tasks[bucket].map((task) => (
                  <article key={task.id} className="rounded-md border p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3 className="font-medium">{task.title}</h3>
                      <Badge variant={task.status === "done" ? "secondary" : "default"}>
                        {task.status}
                      </Badge>
                    </div>
                    <p className="mb-2 text-xs text-muted-foreground">
                      Due: {task.due_date ? new Date(task.due_date).toLocaleString() : "No due date"}
                    </p>
                    <div className="mb-2 flex flex-wrap gap-1">
                      {BUCKETS.filter((b) => b !== bucket).map((target) => (
                        <Button
                          key={target}
                          size="sm"
                          variant="outline"
                          onClick={() => onMove(task.id, bucket, target)}
                        >
                          Move to {BUCKET_LABELS[target]}
                        </Button>
                      ))}
                    </div>
                    <div className="mb-2">
                      <Button
                        size="sm"
                        variant={task.status === "done" ? "outline" : "default"}
                        onClick={() => onMarkDone(task.id, task.status)}
                      >
                        {task.status === "done" ? "Mark pending" : "Mark done"}
                      </Button>
                    </div>
                    {task.original_body ? (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground">View original email body</summary>
                        <pre className="mt-2 whitespace-pre-wrap rounded bg-muted p-2 text-xs">
                          {task.original_body}
                        </pre>
                      </details>
                    ) : null}
                  </article>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
