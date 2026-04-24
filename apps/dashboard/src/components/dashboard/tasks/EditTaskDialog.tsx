"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { FormEvent, useState } from "react";
import type { ReactNode } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import type { Task } from "@/types/database";
import { updateTask } from "./api";

type EditTaskDialogProps = {
  task: Task;
  trigger?: ReactNode;
};

function toDateInputValue(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function EditTaskDialog({ task, trigger }: EditTaskDialogProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [dueDate, setDueDate] = useState(toDateInputValue(task.due_date));
  const [notes, setNotes] = useState(task.original_body ?? "");
  const [error, setError] = useState<string | null>(null);

  const editTaskMutation = useMutation({
    mutationFn: () =>
      updateTask(task.id, {
        title,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        original_body: notes.trim().length > 0 ? notes : null,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
        queryClient.invalidateQueries({ queryKey: ["tasks", task.id] }),
      ]);
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "Failed to update task");
    },
  });

  function resetForm() {
    setTitle(task.title);
    setDueDate(toDateInputValue(task.due_date));
    setNotes(task.original_body ?? "");
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await editTaskMutation.mutateAsync();
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
        if (next) {
          resetForm();
        } else {
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" variant="ghost" size="icon-xs" className="text-muted-foreground hover:text-foreground">
            <Pencil className="size-3.5" />
            <span className="sr-only">Edit task</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>Edit task</DialogTitle>
          <DialogDescription>Update the title, due date, and notes.</DialogDescription>
        </DialogHeader>
        <form id={`edit-task-form-${task.id}`} className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <label htmlFor={`task-title-${task.id}`} className="text-sm font-medium">
              Title
            </label>
            <Input
              id={`task-title-${task.id}`}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor={`task-due-${task.id}`} className="text-sm font-medium">
              Due date <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Input
              id={`task-due-${task.id}`}
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor={`task-notes-${task.id}`} className="text-sm font-medium">
              Notes <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Textarea
              id={`task-notes-${task.id}`}
              className="min-h-28"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" form={`edit-task-form-${task.id}`} disabled={editTaskMutation.isPending}>
            {editTaskMutation.isPending ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
