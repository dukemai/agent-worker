"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Circle, ExternalLink, Loader2, Pencil } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { fetchTask, fetchGrowingWindowKnowledge, updateTaskStatus } from "./api";
import { fetchGrowingWindow } from "@/lib/growing-api";
import type { Task } from "@/types/database";
import { EditTaskDialog } from "./EditTaskDialog";

type TaskDetailViewProps = {
  taskId: string;
};

export function TaskDetailView({ taskId }: TaskDetailViewProps) {
  const queryClient = useQueryClient();
  const taskQuery = useQuery({
    queryKey: ["tasks", taskId],
    queryFn: () => fetchTask(taskId),
  });

  const markDoneMutation = useMutation({
    mutationFn: (status: Task["status"]) => updateTaskStatus(taskId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const task = taskQuery.data;
  const isGrowingTask = task?.source === "growing" || task?.metadata?.item_type === "growing";
  const windowId = task?.window_id || (task?.metadata?.window_id as string);

  const windowQuery = useQuery({
    queryKey: ["growing", "window", windowId],
    queryFn: () => fetchGrowingWindow(windowId!),
    enabled: !!windowId && isGrowingTask,
  });

  const knowledgeQuery = useQuery({
    queryKey: ["growing", "window-knowledge", windowId],
    queryFn: () => fetchGrowingWindowKnowledge(windowId!),
    enabled: !!windowId && isGrowingTask,
  });

  if (taskQuery.isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading task details...</p>
      </div>
    );
  }

  if (taskQuery.error || !task) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4 text-center">
        <p className="text-sm text-red-600">Failed to load task. It may have been deleted.</p>
        <Button asChild variant="outline">
          <Link href="/">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  const sourceUrl = windowQuery.data?.source?.url || (task.metadata?.link as string);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground hover:text-foreground">
          <Link href="/">
            <ArrowLeft className="mr-2 size-4" />
            Back to Dashboard
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <EditTaskDialog
            task={task}
            trigger={
              <Button type="button" variant="outline" size="sm">
                <Pencil className="mr-2 size-4" />
                Edit
              </Button>
            }
          />
          <Button
            variant={task.status === "done" ? "default" : "outline"}
            size="sm"
            className={cn(
              "capitalize transition-all",
              task.status === "done" && "bg-emerald-600 hover:bg-emerald-700 text-white"
            )}
            onClick={() => {
              const nextStatus = task.status === "done" ? "pending" : "done";
              markDoneMutation.mutate(nextStatus);
            }}
            disabled={markDoneMutation.isPending}
          >
            {markDoneMutation.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : task.status === "done" ? (
              <CheckCircle2 className="mr-2 size-4" />
            ) : (
              <Circle className="mr-2 size-4" />
            )}
            {task.status === "done" ? "Completed" : "Mark as Done"}
          </Button>
        </div>
      </div>

      <header className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight">{task.title}</h1>
          {sourceUrl ? (
            <Button asChild size="sm" variant="outline">
              <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 size-4" />
                View Source
              </a>
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <span>Created: {new Date(task.created_at).toLocaleDateString()}</span>
          {task.due_date ? (
            <span className="flex items-center">
              <span className="mx-2">•</span>
              Due: {new Date(task.due_date).toLocaleDateString()}
            </span>
          ) : null}
          <span className="flex items-center uppercase tracking-wider text-[10px] font-bold">
            <span className="mx-2">•</span>
            Source: {task.source}
          </span>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Task Notes</CardTitle>
        </CardHeader>
        <CardContent>
          {task.original_body ? (
            <pre className="whitespace-pre-wrap rounded-md bg-muted/50 p-4 text-sm font-sans leading-relaxed">
              {task.original_body}
            </pre>
          ) : (
            <p className="text-sm italic text-muted-foreground">No additional notes for this task.</p>
          )}
        </CardContent>
      </Card>

      {isGrowingTask && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Seasonal Context</h2>
          
          {windowQuery.data && (
            <Card className="border-emerald-100 bg-emerald-50/20 dark:border-emerald-900/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Gardening Window</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm font-medium">{windowQuery.data.item_name}</p>
                <p className="text-sm text-muted-foreground">{windowQuery.data.stockholm_note}</p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {windowQuery.data.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px]">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Related Knowledge</h3>
            {knowledgeQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading related tips...</p>
            ) : !knowledgeQuery.data?.length ? (
              <p className="text-sm italic text-muted-foreground">No specific tips found for this window.</p>
            ) : (
              <div className="grid gap-3">
                {knowledgeQuery.data.map((item) => (
                  <Card key={item.id} className="border-amber-100/50 bg-amber-50/10">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold">{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
