"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Bucket } from "@/types/database";
import { cn } from "@/lib/utils";
import { readApiError } from "./api";
import type { CreateTaskPayload } from "./types";
import { BUCKETS, BUCKET_LABELS } from "./types";

const selectClassName = cn(
  "border-input bg-background dark:bg-input/30 flex h-9 w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none",
  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
);

export function AddTaskCard() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
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

  function resetForm() {
    setNewTitle("");
    setNewDueDate("");
    setNewBucket("later");
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await createTaskMutation.mutateAsync({
        title: newTitle,
        due_date: newDueDate ? new Date(newDueDate).toISOString() : null,
        bucket: newBucket,
      });
      resetForm();
      setOpen(false);
    } catch {
      return;
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="h-[calc(100%-1px)] rounded-md border border-transparent px-2 py-1 text-sm font-semibold text-foreground hover:bg-background/60"
        >
          <PlusIcon className="size-4" aria-hidden />
          Add task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Add task</DialogTitle>
          <DialogDescription>
            Create a task and choose which list it belongs in.
          </DialogDescription>
        </DialogHeader>
        <form id="add-task-form" className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <label htmlFor="task-title" className="text-sm font-medium">
              Title
            </label>
            <Input
              id="task-title"
              placeholder="What needs to be done?"
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="task-due" className="text-sm font-medium">
              Due date <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Input
              id="task-due"
              type="date"
              value={newDueDate}
              onChange={(event) => setNewDueDate(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="task-bucket" className="text-sm font-medium">
              List
            </label>
            <select
              id="task-bucket"
              className={selectClassName}
              value={newBucket}
              onChange={(event) => setNewBucket(event.target.value as Bucket)}
            >
              {BUCKETS.map((bucket) => (
                <option key={bucket} value={bucket}>
                  {BUCKET_LABELS[bucket]}
                </option>
              ))}
            </select>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" form="add-task-form" disabled={createTaskMutation.isPending}>
            {createTaskMutation.isPending ? "Adding…" : "Add task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
