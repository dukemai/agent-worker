"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Check, ClipboardList, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { decisionStatuses } from "@/components/dashboard/trip-constants";
import { createTripDecision, deleteTripDecision, deleteTripTask, updateTripDecision } from "@/components/dashboard/trip-ops-api";
import { TripSection, useTripTaskMutation } from "@/components/dashboard/trip-detail/trip-detail-shared";
import type { PanelProps } from "@/components/dashboard/trip-detail/trip-detail-shared";
import type { Task, TripDecision } from "@/types/database";

export function TripDecisionsPanel({ tripId, decisions, onError, onDone }: PanelProps & { decisions: TripDecision[] }) {
  const [title, setTitle] = useState("");
  const createMutation = useMutation({
    mutationFn: () => createTripDecision(tripId, { title, status: "open" }),
    onSuccess: () => {
      setTitle("");
      onError(null);
      onDone();
    },
    onError: (err) => onError(err instanceof Error ? err.message : "Failed to add decision"),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TripDecision["status"] }) => updateTripDecision(id, { status }),
    onSuccess: () => onDone(),
    onError: (err) => onError(err instanceof Error ? err.message : "Failed to update decision"),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteTripDecision,
    onSuccess: () => onDone(),
    onError: (err) => onError(err instanceof Error ? err.message : "Failed to delete decision"),
  });
  const taskMutation = useTripTaskMutation(tripId, onError, onDone);

  return (
    <TripSection title="Decisions" className="border-0 pt-0" contentClassName="space-y-3">
        <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); createMutation.mutate(); }}>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Decision to make..." aria-label="Decision title" />
          <Button type="submit" size="icon" disabled={createMutation.isPending} aria-label="Add decision">
            <Plus className="size-4" aria-hidden />
          </Button>
        </form>
        {decisions.length === 0 ? <p className="text-sm text-muted-foreground">No open decisions.</p> : null}
        {decisions.map((decision) => (
          <div key={decision.id} className="space-y-3 rounded-md border p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-medium">{decision.title}</div>
                <div className="text-sm text-muted-foreground">{decision.owner || "No owner"} {decision.due_date ? `· ${decision.due_date}` : ""}</div>
              </div>
              <Badge variant={decision.status === "decided" ? "default" : "outline"}>{decision.status}</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {decisionStatuses.map((status) => (
                <Button key={status} type="button" size="sm" variant={decision.status === status ? "default" : "outline"} onClick={() => updateMutation.mutate({ id: decision.id, status })}>
                  {status === "decided" ? <Check className="size-4" aria-hidden /> : null}
                  {status}
                </Button>
              ))}
              <Button type="button" size="sm" variant="ghost" onClick={() => taskMutation.mutate({ title: decision.title, bucket: "this_week", category: "other", source_item_id: decision.id, source_item_type: "decision" })}>
                <ClipboardList className="size-4" aria-hidden />
                Task
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => deleteMutation.mutate(decision.id)}
                disabled={deleteMutation.isPending}
                aria-label={`Delete ${decision.title}`}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
          </div>
        ))}
    </TripSection>
  );
}

export function TripTasksPanel({ tasks, onError, onDone }: { tasks: Task[]; onError: (error: string | null) => void; onDone: () => void }) {
  const deleteMutation = useMutation({
    mutationFn: deleteTripTask,
    onSuccess: () => {
      onError(null);
      onDone();
    },
    onError: (err) => onError(err instanceof Error ? err.message : "Failed to delete trip task"),
  });

  return (
    <TripSection
      title={(
        <>
          Trip tasks
          <Badge variant="secondary">{tasks.length === 1 ? "1 task" : `${tasks.length} tasks`}</Badge>
        </>
      )}
      icon={<ClipboardList className="size-4" aria-hidden />}
      className="border-0 pt-0"
      contentClassName="grid gap-2 md:grid-cols-2"
    >
        {tasks.length === 0 ? <p className="text-sm text-muted-foreground">No trip tasks yet.</p> : null}
        {tasks.map((task) => (
          <div key={task.id} className="rounded-md border p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-medium">{task.title}</div>
                <div className="text-sm text-muted-foreground">{task.due_date ? task.due_date.slice(0, 10) : "No due date"}</div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => deleteMutation.mutate(task.id)}
                disabled={deleteMutation.isPending}
                aria-label={`Delete ${task.title}`}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
          </div>
        ))}
    </TripSection>
  );
}
