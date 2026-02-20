"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Bucket, Task } from "@/types/database";

const BUCKETS: Bucket[] = ["today", "this_week", "later"];
const BUCKET_LABELS: Record<Bucket, string> = {
  today: "Today",
  this_week: "This Week",
  later: "Later",
};

type TasksByBucket = Record<Bucket, Task[]>;
type ReminderType = "passport" | "subscription" | "membership" | "permit" | "insurance" | "other";
type Recurrence = "none" | "yearly" | "monthly";

type ReminderItem = {
  id: string;
  title: string;
  due_date: string;
  days_left: number;
  metadata: Record<string, unknown> | null;
  group: "critical" | "urgent" | "soon";
};

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
  const [activeBucket, setActiveBucket] = useState<Bucket>("today");
  const [renewals, setRenewals] = useState<ReminderItem[]>([]);
  const [newReminderTitle, setNewReminderTitle] = useState("");
  const [newReminderType, setNewReminderType] = useState<ReminderType>("passport");
  const [newReminderOwner, setNewReminderOwner] = useState("");
  const [newReminderExpiry, setNewReminderExpiry] = useState("");
  const [newReminderLeadDays, setNewReminderLeadDays] = useState("30");
  const [newReminderRecurrence, setNewReminderRecurrence] = useState<Recurrence>("none");
  const [newReminderLink, setNewReminderLink] = useState("");
  const [newReminderAction, setNewReminderAction] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchBucket = useCallback(async (bucket: Bucket): Promise<Task[]> => {
    const response = await fetch(`/api/tasks?bucket=${bucket}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to fetch ${bucket} tasks`);
    }
    const json = (await response.json()) as { tasks: Task[] };
    return json.tasks;
  }, []);

  const fetchRenewals = useCallback(async (): Promise<ReminderItem[]> => {
    const response = await fetch("/api/reminders", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to fetch reminders");
    }
    const json = (await response.json()) as { reminders: ReminderItem[] };
    return json.reminders ?? [];
  }, []);

  const reloadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [today, thisWeek, later, reminders] = await Promise.all([
        fetchBucket("today"),
        fetchBucket("this_week"),
        fetchBucket("later"),
        fetchRenewals(),
      ]);
      setTasks({ today, this_week: thisWeek, later });
      setRenewals(reminders);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [fetchBucket, fetchRenewals]);

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

  async function onCreateReminder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const leadDaysNum = Number(newReminderLeadDays);
    const response = await fetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newReminderTitle,
        reminder_type: newReminderType,
        owner: newReminderOwner,
        expires_on: newReminderExpiry ? new Date(newReminderExpiry).toISOString() : null,
        lead_days: Number.isFinite(leadDaysNum) ? leadDaysNum : 30,
        recurrence: newReminderRecurrence,
        link: newReminderLink,
        next_action: newReminderAction || "Review and renew",
      }),
    });

    if (!response.ok) {
      const json = (await response.json()) as { error?: string };
      setError(json.error ?? "Failed to create reminder");
      return;
    }

    setNewReminderTitle("");
    setNewReminderType("passport");
    setNewReminderOwner("");
    setNewReminderExpiry("");
    setNewReminderLeadDays("30");
    setNewReminderRecurrence("none");
    setNewReminderLink("");
    setNewReminderAction("");
    await reloadAll();
  }

  async function onReminderAction(reminderId: string, action: "complete" | "snooze") {
    setError(null);
    const response = await fetch(`/api/reminders/${reminderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action === "snooze" ? { action, days: 7 } : { action }),
    });
    if (!response.ok) {
      const json = (await response.json()) as { error?: string };
      setError(json.error ?? `Failed to ${action} reminder`);
      return;
    }
    await reloadAll();
  }

  function getGroupLabel(group: ReminderItem["group"]) {
    if (group === "critical") return "Critical (<=1d)";
    if (group === "urgent") return "Urgent (<=7d)";
    return "Soon (<=30d)";
  }

  function renderRenewalsCard() {
    const groups: ReminderItem["group"][] = ["critical", "urgent", "soon"];

    return (
      <Card>
        <CardHeader>
          <CardTitle>Renewals</CardTitle>
        </CardHeader>
        <CardContent>
          {renewals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming renewals in the next 30 days.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {groups.map((group) => {
                const items = renewals.filter((r) => r.group === group);
                return (
                  <section key={group} className="rounded-md border p-3">
                    <h3 className="mb-2 text-sm font-medium">{getGroupLabel(group)}</h3>
                    {items.length === 0 ? (
                      <p className="text-xs text-muted-foreground">None</p>
                    ) : (
                      <div className="space-y-2">
                        {items.map((item) => {
                          const link = typeof item.metadata?.link === "string" ? item.metadata.link : "";
                          const nextAction =
                            typeof item.metadata?.next_action === "string" ? item.metadata.next_action : "";
                          return (
                            <article key={item.id} className="rounded-md border p-2">
                              <p className="text-sm font-medium">{item.title}</p>
                              <p className="text-xs text-muted-foreground">
                                Due in {item.days_left} days · {new Date(item.due_date).toLocaleDateString()}
                              </p>
                              {nextAction ? (
                                <p className="mt-1 text-xs text-muted-foreground">Next: {nextAction}</p>
                              ) : null}
                              <div className="mt-2 flex flex-wrap gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="min-h-11"
                                  onClick={() => onReminderAction(item.id, "complete")}
                                >
                                  Done
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="min-h-11"
                                  onClick={() => onReminderAction(item.id, "snooze")}
                                >
                                  Snooze 7d
                                </Button>
                                {link ? (
                                  <Button
                                    size="sm"
                                    className="min-h-11"
                                    onClick={() => window.open(link, "_blank", "noopener,noreferrer")}
                                  >
                                    Open
                                  </Button>
                                ) : null}
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  function renderBucketCard(bucket: Bucket) {
    return (
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
                {task.metadata?.item_type === "renewal" &&
                typeof task.metadata.expires_on === "string" ? (
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
                      onClick={() => window.open(task.metadata?.link as string, "_blank", "noopener,noreferrer")}
                    >
                      Open
                    </Button>
                  ) : null}
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
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
      {renderRenewalsCard()}

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
            <Button className="min-h-11 md:col-start-4" type="submit">
              Add Task
            </Button>
          </form>
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add Renewal Reminder</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-4" onSubmit={onCreateReminder}>
            <Input
              className="md:col-span-2"
              placeholder="Title (e.g., Renew Anna passport)"
              value={newReminderTitle}
              onChange={(event) => setNewReminderTitle(event.target.value)}
              required
            />
            <select
              className="rounded-md border px-3 py-2 text-sm"
              value={newReminderType}
              onChange={(event) => setNewReminderType(event.target.value as ReminderType)}
            >
              <option value="passport">Passport</option>
              <option value="subscription">Subscription</option>
              <option value="membership">Membership</option>
              <option value="permit">Permit</option>
              <option value="insurance">Insurance</option>
              <option value="other">Other</option>
            </select>
            <Input
              placeholder="Owner (optional)"
              value={newReminderOwner}
              onChange={(event) => setNewReminderOwner(event.target.value)}
            />
            <Input
              type="date"
              value={newReminderExpiry}
              onChange={(event) => setNewReminderExpiry(event.target.value)}
              required
            />
            <Input
              type="number"
              min={0}
              placeholder="Lead days"
              value={newReminderLeadDays}
              onChange={(event) => setNewReminderLeadDays(event.target.value)}
            />
            <select
              className="rounded-md border px-3 py-2 text-sm"
              value={newReminderRecurrence}
              onChange={(event) => setNewReminderRecurrence(event.target.value as Recurrence)}
            >
              <option value="none">No recurrence</option>
              <option value="yearly">Yearly</option>
              <option value="monthly">Monthly</option>
            </select>
            <Input
              className="md:col-span-2"
              placeholder="Link (optional)"
              value={newReminderLink}
              onChange={(event) => setNewReminderLink(event.target.value)}
            />
            <Input
              className="md:col-span-2"
              placeholder="Next action (optional)"
              value={newReminderAction}
              onChange={(event) => setNewReminderAction(event.target.value)}
            />
            <Button className="min-h-11 md:col-start-4" type="submit">
              Add Renewal
            </Button>
          </form>
        </CardContent>
      </Card>

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
              {renderBucketCard(bucket)}
            </TabsContent>
          ))}
        </Tabs>
      </section>

      <section className="hidden gap-4 md:grid md:grid-cols-3">
        {BUCKETS.map((bucket) => (
          renderBucketCard(bucket)
        ))}
      </section>
    </main>
  );
}
