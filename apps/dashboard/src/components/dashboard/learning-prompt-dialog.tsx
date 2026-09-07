"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import template from "../../../public/templates/learning-program.json";

const PROMPT = `Create a complete learning curriculum that I can upload to my learning dashboard.

My preferences (replace these before generating):
- Topic: [what I want to learn]
- Current level: [beginner / intermediate / advanced]
- Goal: [what I want to be able to do]
- Number of days: [1–365]
- Time per day: [e.g. 15 minutes]
- Language: [e.g. English]

If any preferences are still unfilled, ask me for them first.

Curriculum requirements:
- Build progressively toward my goal with practical examples, short exercises, and periodic review.
- Write the full lesson content for every day, not just an outline or instructions to generate it later.
- Each day should be self-contained and fit my available time. Include an explanation, example, practice task, and a way to check my understanding.
- Progress is manual: I mark each day done before moving on. Do not use calendar dates or a start_date.
- Include useful resource URLs only when you know they are real; otherwise use an empty resources array. Do not invent links.

Output requirements:
- Return only valid JSON, with no Markdown fences or commentary. If possible, provide it as a downloadable learning-program.json file.
- Use exactly the structure shown below. Keep schema and version unchanged; replace the example topic and lessons with my curriculum.
- title and topic must be non-empty strings, each at most 200 characters.
- total_days must be an integer from 1 to 365 matching my requested duration.
- days must contain the ENTIRE curriculum: exactly total_days entries, numbered consecutively from 1 to total_days, with no duplicates, gaps, placeholders, or ellipses.
- Every day needs a non-empty title (at most 200 characters), non-empty content (at most 20,000 characters), and a resources array (at most 20 strings, each at most 500 characters).
- Encode line breaks inside JSON strings as escaped newline characters and escape quotation marks correctly.
- Validate the JSON and check that every requested day is present before returning it. If the full curriculum will not fit in one response or file, ask me to choose a shorter duration before generating; do not silently truncate it.

Example of a complete, valid three-day file (adapt the day count to my request):
${JSON.stringify(template, null, 2)}`;

export function LearningPromptDialog() {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const promptRef = useRef<HTMLTextAreaElement>(null);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(PROMPT);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
      promptRef.current?.focus();
      promptRef.current?.select();
    }
  }

  return <Dialog onOpenChange={() => setCopyState("idle")}>
    <DialogTrigger asChild><Button type="button" variant="outline">AI prompt</Button></DialogTrigger>
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>Prepare a learning program with AI</DialogTitle>
        <DialogDescription>Copy this prompt into another AI, replace the preferences, then save its JSON response and upload it here. The JSON template is included.</DialogDescription>
      </DialogHeader>
      <textarea ref={promptRef} aria-label="Learning curriculum prompt and JSON template" readOnly value={PROMPT} className="h-80 w-full resize-y rounded-md border border-input bg-transparent p-3 font-mono text-sm leading-relaxed outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50" />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={copyPrompt}>{copyState === "copied" ? "Copied!" : "Copy prompt + JSON template"}</Button>
        <p role="status" className="text-sm text-muted-foreground">{copyState === "failed" ? "Couldn’t copy automatically. The prompt is selected—copy it manually." : copyState === "copied" ? "Ready to paste into your AI chat." : ""}</p>
      </div>
    </DialogContent>
  </Dialog>;
}
