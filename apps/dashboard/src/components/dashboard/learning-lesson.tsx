"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { advanceLearningProgram, fetchLearningProgramDay } from "@/lib/learning-api";

export function LearningLesson({ programId, dayNumber }: { programId: string; dayNumber: number }) {
  const client = useQueryClient();
  const lesson = useQuery({
    queryKey: ["learning-programs", programId, "days", dayNumber],
    queryFn: () => fetchLearningProgramDay(programId, dayNumber),
  });
  const isCurrent = lesson.data?.program.status === "active" && lesson.data.program.current_day === dayNumber;
  const advance = useMutation({
    mutationFn: () => advanceLearningProgram(programId, dayNumber),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["learning-programs"] }),
        client.invalidateQueries({ queryKey: ["digest", "preview"] }),
      ]);
    },
  });

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" asChild><Link href="/learning">Today’s learning</Link></Button>
        <Button variant="ghost" asChild><Link href="/learning/programs">Manage programs</Link></Button>
      </div>
      {lesson.isPending ? <p className="text-sm text-muted-foreground">Loading lesson…</p> : null}
      {lesson.error ? <p role="alert" className="text-sm text-destructive">{lesson.error.message}</p> : null}
      {lesson.data ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge variant="outline">{lesson.data.program.topic}</Badge>
              <span className="text-sm text-muted-foreground">Day {dayNumber} of {lesson.data.program.total_days}</span>
            </div>
            <CardTitle>{lesson.data.day.title}</CardTitle>
            <CardDescription>{lesson.data.program.title}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {!isCurrent ? (
              <p className="rounded-md bg-muted p-3 text-sm">
                {lesson.data.program.status === "active" ? <>You’re currently on Day {lesson.data.program.current_day}. <Link className="underline" href={`/learning/programs/${programId}/days/${lesson.data.program.current_day}`}>Go to today’s lesson</Link>.</> : <>This program is {lesson.data.program.status}.</>}
              </p>
            ) : null}
            <p className="whitespace-pre-wrap break-words text-sm leading-7">{lesson.data.day.content}</p>
            {lesson.data.day.resources.length > 0 ? (
              <ul className="list-disc pl-5 text-sm">
                {lesson.data.day.resources.map((resource, index) => (
                  <li key={index} className="break-words">
                    {/^https?:\/\//i.test(resource) ? <a href={resource} target="_blank" rel="noopener noreferrer" className="underline">{resource}</a> : resource}
                  </li>
                ))}
              </ul>
            ) : null}
            {advance.error ? <p role="alert" className="text-sm text-destructive">{advance.error.message}</p> : null}
          </CardContent>
          {isCurrent ? <CardFooter><Button disabled={advance.isPending} onClick={() => advance.mutate()}>{advance.isPending ? "Saving…" : "Mark day done"}</Button></CardFooter> : null}
        </Card>
      ) : null}
    </main>
  );
}
