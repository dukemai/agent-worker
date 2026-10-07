"use client";

import Link from "next/link";
import { useRef, useState, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LearningPromptDialog } from "@/components/dashboard/learning-prompt-dialog";
import { fetchLearningProgram, fetchLearningPrograms, importLearningProgram, updateLearningProgramStatus } from "@/lib/learning-api";
import type { LearningProgram } from "@/types/database";

function ProgramCard({ program }: { program: LearningProgram }) {
  const client = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const detail = useQuery({ queryKey: ["learning-programs", program.id], queryFn: () => fetchLearningProgram(program.id), enabled: expanded });
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["learning-programs"] }),
      client.invalidateQueries({ queryKey: ["digest", "preview"] }),
    ]);
  };
  const status = useMutation({ mutationFn: (value: "active" | "paused" | "archived") => updateLearningProgramStatus(program.id, value), onSuccess: refresh });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="min-w-0 break-words">{program.title}</CardTitle>
          <Badge variant="outline" className="capitalize">{program.status}</Badge>
        </div>
        <CardDescription className="break-words">{program.topic} · Day {program.current_day} of {program.total_days}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" aria-expanded={expanded} aria-controls={`program-days-${program.id}`} onClick={() => setExpanded((value) => !value)}>{expanded ? "Hide curriculum" : "Browse curriculum"}</Button>
          {program.status === "active" || program.status === "paused" ? <Button variant="outline" size="sm" disabled={status.isPending} onClick={() => status.mutate(program.status === "active" ? "paused" : "active")}>{program.status === "active" ? "Pause" : "Resume"}</Button> : null}
          {program.status !== "archived" ? <Button variant="outline" size="sm" disabled={status.isPending} onClick={() => status.mutate("archived")}>Archive</Button> : null}
        </div>
        {status.error ? <p role="alert" className="text-sm text-destructive">{status.error.message}</p> : null}
        {expanded ? (
          <div id={`program-days-${program.id}`} className="flex flex-col gap-2 border-t pt-4">
            {detail.isPending ? <p className="text-sm text-muted-foreground">Loading curriculum…</p> : null}
            {detail.error ? <p role="alert" className="text-sm text-destructive">{detail.error.message}</p> : null}
            {detail.data?.program.days?.map((day) => (
              <Button key={day.id} variant="ghost" className="h-auto justify-start whitespace-normal text-left" asChild>
                <Link href={`/learning/programs/${program.id}/days/${day.day_number}`}>
                  Day {day.day_number}: {day.title}{day.day_number === program.current_day ? " · Current" : ""}
                </Link>
              </Button>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function LearningProgramsDashboard() {
  const client = useQueryClient();
  const programs = useQuery({ queryKey: ["learning-programs"], queryFn: fetchLearningPrograms });
  const fileInput = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const upload = useMutation({
    mutationFn: importLearningProgram,
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["learning-programs"] }),
        client.invalidateQueries({ queryKey: ["digest", "preview"] }),
      ]);
    },
  });

  async function uploadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setFileError(null);
    upload.reset();
    try {
      upload.mutate(JSON.parse(await file.text()) as unknown);
    } catch {
      setFileError("File must contain valid JSON");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6">
      <section aria-labelledby="programs-heading" className="flex flex-col gap-3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 id="programs-heading" className="text-xl font-semibold">Manage learning programs</h1>
            <p className="max-w-prose text-sm text-muted-foreground">Import curricula, browse every lesson, and control which programs appear in your daily learning.</p>
          </div>
          <Button variant="outline" asChild><Link href="/learning">Back to today’s learning</Link></Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <LearningPromptDialog />
          <Button type="button" variant="outline" asChild><a href="/templates/learning-program.json" download>JSON template</a></Button>
          <Button type="button" disabled={upload.isPending} onClick={() => fileInput.current?.click()}>{upload.isPending ? "Importing…" : "Upload program"}</Button>
          <input ref={fileInput} type="file" accept="application/json,.json" className="sr-only" aria-label="Upload learning program JSON" tabIndex={-1} onChange={uploadFile} disabled={upload.isPending} />
        </div>
        <p className="text-sm text-muted-foreground">Copy the AI prompt to prepare a complete 1–365 day curriculum, then upload the JSON file.</p>
        {fileError || upload.error ? <p role="alert" className="text-sm text-destructive">{fileError ?? upload.error?.message}</p> : null}
        {upload.data ? <p role="status" className="text-sm">Imported {upload.data.program.title}: {upload.data.days_imported} days.</p> : null}
      </section>

      <section aria-labelledby="program-list-heading" className="flex flex-col gap-4">
        <h2 id="program-list-heading" className="text-base font-semibold">Your programs{programs.data ? <span className="ml-2 text-sm font-normal text-muted-foreground">({programs.data.programs.length})</span> : null}</h2>
        {programs.isPending ? <p className="text-sm text-muted-foreground">Loading programs…</p> : null}
        {programs.error ? <p role="alert" className="text-sm text-destructive">{programs.error.message}</p> : null}
        {programs.data?.programs.length === 0 ? <p className="text-sm italic text-muted-foreground">No programs yet. Upload your first curriculum to begin.</p> : null}
        {programs.data?.programs.map((program) => <ProgramCard key={program.id} program={program} />)}
      </section>
    </main>
  );
}
