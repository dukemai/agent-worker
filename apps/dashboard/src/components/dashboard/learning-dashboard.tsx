"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { advanceLearningProgram, fetchLearningProgram, fetchLearningPrograms, importLearningProgram, updateLearningProgramStatus } from "@/lib/learning-api";
import { LearningPromptDialog } from "@/components/dashboard/learning-prompt-dialog";
import type { LearningProgram } from "@/types/database";

function ProgramCard({ program }: { program: LearningProgram }) {
  const client = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const detail = useQuery({ queryKey: ["learning-programs", program.id], queryFn: () => fetchLearningProgram(program.id), enabled: expanded });
  const refresh = async () => { await Promise.all([client.invalidateQueries({ queryKey: ["learning-programs"] }), client.invalidateQueries({ queryKey: ["digest", "preview"] })]); };
  const status = useMutation({ mutationFn: (value: "active" | "paused" | "archived") => updateLearningProgramStatus(program.id, value), onSuccess: refresh });
  const advance = useMutation({ mutationFn: () => advanceLearningProgram(program.id, program.current_day), onSuccess: async () => { setSelectedDay(null); await refresh(); }, onError: refresh });
  const day = detail.data?.program.days?.find(d => d.day_number === (selectedDay ?? program.current_day));
  const busy = status.isPending || advance.isPending;
  return <Card className="min-w-0">
    <CardHeader>
      <div className="flex flex-wrap items-center justify-between gap-2"><CardTitle className="min-w-0 break-words">{program.title}</CardTitle><Badge variant="outline" className="capitalize">{program.status}</Badge></div>
      <CardDescription className="break-words">{program.topic} · Day {program.current_day} of {program.total_days}</CardDescription>
    </CardHeader>
    <CardContent className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" aria-expanded={expanded} aria-controls={`program-days-${program.id}`} onClick={() => setExpanded(!expanded)}>{expanded ? "Hide days" : "Browse days"}</Button>
        {program.status === "active" || program.status === "paused" ? <Button variant="outline" size="sm" disabled={busy} onClick={() => status.mutate(program.status === "active" ? "paused" : "active")}>{program.status === "active" ? "Pause" : "Resume"}</Button> : null}
        {program.status !== "archived" ? <Button variant="outline" size="sm" disabled={busy} onClick={() => status.mutate("archived")}>Archive</Button> : null}
      </div>
      {status.error || advance.error ? <p role="alert" className="text-sm text-destructive">{(status.error ?? advance.error)?.message}</p> : null}
      {expanded ? <div id={`program-days-${program.id}`} className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(12rem,16rem)_minmax(0,1fr)]">
        {detail.isPending ? <p className="text-sm text-muted-foreground">Loading days…</p> : null}
        {detail.error ? <p role="alert" className="text-destructive">{detail.error.message}</p> : null}
        <nav className="flex max-h-64 min-w-0 flex-col gap-1 overflow-y-auto rounded-lg bg-muted/30 p-2 md:max-h-[32rem]" aria-label={`${program.title} days`}>
          {detail.data?.program.days?.map(d => <Button key={d.id} variant={d.day_number === day?.day_number ? "secondary" : "ghost"} className="h-auto justify-start whitespace-normal text-left" onClick={() => setSelectedDay(d.day_number)} aria-pressed={d.day_number === day?.day_number}>
            Day {d.day_number}: {d.title}{d.day_number === program.current_day && program.status === "active" ? " · Today" : ""}
          </Button>)}
        </nav>
        {day ? <section className="flex min-w-0 flex-col items-start gap-4 md:px-2" aria-label={`Day ${day.day_number} content`}>
          <h3 className="break-words font-semibold">Day {day.day_number}: {day.title}</h3>
          <p className="max-w-prose whitespace-pre-wrap break-words text-sm leading-7">{day.content}</p>
          {day.resources.length > 0 ? <ul className="list-disc pl-5 text-sm">{day.resources.map((r, i) => <li key={i} className="break-words">{/^https?:\/\//i.test(r) ? <a href={r} target="_blank" rel="noopener noreferrer" className="underline">{r}</a> : r}</li>)}</ul> : null}
          {program.status === "active" && day.day_number === program.current_day ? <Button className="self-start" disabled={busy} onClick={() => advance.mutate()}>{advance.isPending ? "Saving…" : "Mark day done"}</Button> : null}
        </section> : null}
      </div> : null}
    </CardContent>
  </Card>;
}

export function LearningDashboard() {
  const client = useQueryClient();
  const programs = useQuery({ queryKey: ["learning-programs"], queryFn: fetchLearningPrograms });
  const fileInput = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const upload = useMutation({ mutationFn: importLearningProgram, onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: ["learning-programs"] }), client.invalidateQueries({ queryKey: ["digest", "preview"] })]); } });
  async function uploadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setFileError(null); upload.reset();
    try { upload.mutate(JSON.parse(await file.text()) as unknown); } catch { setFileError("File must contain valid JSON"); }
  }
  return <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6">
    <section aria-labelledby="learning-heading" className="flex flex-col gap-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id="learning-heading" className="text-xl font-semibold">Learning programs</h2>
          <p className="max-w-prose text-sm text-muted-foreground">Learn at your own pace. Your current day stays in the daily digest until you mark it done.</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <LearningPromptDialog />
          <Button type="button" variant="outline" asChild><a href="/templates/learning-program.json" download>JSON template</a></Button>
          <Button type="button" disabled={upload.isPending} onClick={() => fileInput.current?.click()}>{upload.isPending ? "Importing…" : "Upload program"}</Button>
          <input ref={fileInput} type="file" accept="application/json,.json" className="sr-only" aria-label="Upload learning program JSON" tabIndex={-1} onChange={uploadFile} disabled={upload.isPending} />
        </div>
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
      {programs.data?.programs.map(program => <ProgramCard key={program.id} program={program} />)}
    </section>
  </main>;
}
