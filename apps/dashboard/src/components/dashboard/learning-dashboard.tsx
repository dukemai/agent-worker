"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { advanceLearningProgram, fetchLearningProgramDay, fetchLearningPrograms } from "@/lib/learning-api";
import type { LearningProgram } from "@/types/database";

function CurrentLessonCard({ program }: { program: LearningProgram }) {
  const client = useQueryClient();
  const lesson = useQuery({
    queryKey: ["learning-programs", program.id, "days", program.current_day],
    queryFn: () => fetchLearningProgramDay(program.id, program.current_day),
  });
  const advance = useMutation({
    mutationFn: () => advanceLearningProgram(program.id, program.current_day),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["learning-programs"] }),
        client.invalidateQueries({ queryKey: ["digest", "preview"] }),
      ]);
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge variant="outline">{program.topic}</Badge>
          <span className="text-sm text-muted-foreground">Day {program.current_day} of {program.total_days}</span>
        </div>
        <CardTitle>{program.title}</CardTitle>
        {lesson.data ? <CardDescription>{lesson.data.day.title}</CardDescription> : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {lesson.isPending ? <p className="text-sm text-muted-foreground">Loading today’s lesson…</p> : null}
        {lesson.error ? <p role="alert" className="text-sm text-destructive">{lesson.error.message}</p> : null}
        {lesson.data ? (
          <>
            <p className="max-w-prose whitespace-pre-wrap break-words text-sm leading-7">{lesson.data.day.content}</p>
            {lesson.data.day.resources.length > 0 ? (
              <ul className="list-disc pl-5 text-sm">
                {lesson.data.day.resources.map((resource, index) => (
                  <li key={index} className="break-words">
                    {/^https?:\/\//i.test(resource) ? <a href={resource} target="_blank" rel="noopener noreferrer" className="underline">{resource}</a> : resource}
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : null}
        {advance.error ? <p role="alert" className="text-sm text-destructive">{advance.error.message}</p> : null}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <Button disabled={!lesson.data || advance.isPending} onClick={() => advance.mutate()}>
          {advance.isPending ? "Saving…" : "Mark day done"}
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/learning/programs/${program.id}/days/${program.current_day}`}>Open lesson</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export function LearningDashboard() {
  const programs = useQuery({ queryKey: ["learning-programs"], queryFn: fetchLearningPrograms });
  const activePrograms = programs.data?.programs.filter((program) => program.status === "active") ?? [];

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6">
      <section aria-labelledby="learning-heading" className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 id="learning-heading" className="text-xl font-semibold">Today’s learning</h1>
          <p className="max-w-prose text-sm text-muted-foreground">Continue each active program at your own pace. A lesson stays here until you mark it done.</p>
        </div>
        <Button variant="outline" asChild><Link href="/learning/programs">Manage programs</Link></Button>
      </section>

      {programs.isPending ? <p className="text-sm text-muted-foreground">Loading today’s lessons…</p> : null}
      {programs.error ? <p role="alert" className="text-sm text-destructive">{programs.error.message}</p> : null}
      {programs.data && activePrograms.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No active lessons</CardTitle>
            <CardDescription>Start, resume, or import a program to make its current lesson appear here and in the daily digest.</CardDescription>
          </CardHeader>
          <CardFooter><Button asChild><Link href="/learning/programs">Manage programs</Link></Button></CardFooter>
        </Card>
      ) : null}
      <section aria-label="Current lessons" className="grid gap-4 lg:grid-cols-2">
        {activePrograms.map((program) => <CurrentLessonCard key={program.id} program={program} />)}
      </section>
    </main>
  );
}
