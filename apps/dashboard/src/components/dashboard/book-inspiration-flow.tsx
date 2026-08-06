"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Brief = { audience: string; mood: string; genre: string; format: string; language: string; constraints: string };
type Session = { id: string; intention: string; brief: Partial<Brief>; status: string; updated_at: string };
type Candidate = { id: string; title: string; author: string | null; source_url: string | null; source_name: string | null; factual_summary: string | null };
type Shortlist = { id: string; candidate_id: string; rank: number; fit_reason: string; caveats: string | null; match_tags: string[] };
type Detail = { session: Session; candidates: Candidate[]; shortlist: Shortlist[] };

const EMPTY_BRIEF: Brief = { audience: "", mood: "", genre: "", format: "Book", language: "Swedish", constraints: "" };
const QUICK_INTENTIONS = ["Ett roligt äventyr för en åttaåring", "En lugn svensk berättelse för läggdags", "En spännande mysteriebok för sommarlovet", "En ljudbok för hela familjen på bilresan"];

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Request failed");
  return body as T;
}

export function BookInspirationFlow() {
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [intention, setIntention] = useState("");
  const [brief, setBrief] = useState<Brief>(EMPTY_BRIEF);
  const [candidate, setCandidate] = useState({ title: "", author: "", source_url: "", source_name: "", factual_summary: "" });
  const [message, setMessage] = useState("");
  const sessions = useQuery({ queryKey: ["book-inspiration-sessions"], queryFn: () => api<{ sessions: Session[] }>("/api/inspirations/sessions") });
  const detail = useQuery({ queryKey: ["book-inspiration-session", activeId], queryFn: () => api<Detail>(`/api/inspirations/sessions/${activeId}`), enabled: Boolean(activeId) });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["book-inspiration-sessions"] }),
      queryClient.invalidateQueries({ queryKey: ["book-inspiration-session", activeId] }),
    ]);
  };
  const createSession = useMutation({
    mutationFn: () => api<{ session: Session }>("/api/inspirations/sessions", { method: "POST", body: JSON.stringify({ intention, brief }) }),
    onSuccess: async ({ session }) => { setActiveId(session.id); setMessage("Session started. Search, then add promising books below."); await refresh(); },
    onError: (error) => setMessage(error.message),
  });
  const saveBrief = useMutation({
    mutationFn: () => api(`/api/inspirations/sessions/${activeId}`, { method: "PATCH", body: JSON.stringify({ intention, brief }) }),
    onSuccess: async () => { setMessage("Discovery brief saved."); await refresh(); },
    onError: (error) => setMessage(error.message),
  });
  const addCandidate = useMutation({
    mutationFn: () => api(`/api/inspirations/sessions/${activeId}/candidates`, { method: "POST", body: JSON.stringify(candidate) }),
    onSuccess: async () => { setCandidate({ title: "", author: "", source_url: "", source_name: "", factual_summary: "" }); setMessage("Candidate added."); await refresh(); },
    onError: (error) => setMessage(error.message),
  });
  const removeCandidate = useMutation({
    mutationFn: (id: string) => api(`/api/inspirations/candidates/${id}`, { method: "DELETE" }),
    onSuccess: refresh,
    onError: (error) => setMessage(error.message),
  });
  const organize = useMutation({
    mutationFn: () => api(`/api/inspirations/sessions/${activeId}/organize`, { method: "POST" }),
    onSuccess: async () => { setMessage("Shortlist organized from the saved candidate facts."); await refresh(); },
    onError: (error) => setMessage(error.message),
  });

  function submitSession(event: FormEvent) { event.preventDefault(); setMessage(""); createSession.mutate(); }
  function submitCandidate(event: FormEvent) { event.preventDefault(); setMessage(""); addCandidate.mutate(); }
  function selectSession(session: Session) {
    setActiveId(session.id);
    setIntention(session.intention);
    setBrief({ ...EMPTY_BRIEF, ...session.brief });
    setMessage("");
  }
  const candidates = detail.data?.candidates ?? [];
  const candidateById = new Map(candidates.map((item) => [item.id, item]));

  return (
    <section className="space-y-4" aria-labelledby="book-flow-title">
      <Card className="border-indigo-200/70 bg-indigo-50/40 dark:border-indigo-900/50 dark:bg-indigo-950/20">
        <CardHeader><CardTitle id="book-flow-title">Book inspiration flow</CardTitle><CardDescription>Describe the moment, search the web, capture candidates, then let the organizer compare only the facts you saved.</CardDescription></CardHeader>
        <CardContent className="space-y-5">
          <form className="space-y-3" onSubmit={activeId ? (event) => { event.preventDefault(); saveBrief.mutate(); } : submitSession}>
            <Textarea value={intention} onChange={(event) => setIntention(event.target.value)} placeholder="What would fit right now?" required />
            <div className="flex flex-wrap gap-2">{QUICK_INTENTIONS.map((item) => <Button key={item} type="button" size="sm" variant="outline" onClick={() => setIntention(item)}>{item}</Button>)}</div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Input value={brief.audience} onChange={(event) => setBrief({ ...brief, audience: event.target.value })} placeholder="Audience or age" />
              <Input value={brief.mood} onChange={(event) => setBrief({ ...brief, mood: event.target.value })} placeholder="Mood" />
              <Input value={brief.genre} onChange={(event) => setBrief({ ...brief, genre: event.target.value })} placeholder="Genre or themes" />
              <Input value={brief.format} onChange={(event) => setBrief({ ...brief, format: event.target.value })} placeholder="Book, audiobook…" />
              <Input value={brief.language} onChange={(event) => setBrief({ ...brief, language: event.target.value })} placeholder="Language" />
              <Input value={brief.constraints} onChange={(event) => setBrief({ ...brief, constraints: event.target.value })} placeholder="Length, reading level, avoid…" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={!intention.trim() || createSession.isPending || saveBrief.isPending}>{activeId ? "Save brief" : "Start session"}</Button>
              {activeId ? <Button type="button" variant="outline" asChild><a href={`https://www.google.com/search?q=${encodeURIComponent(intention)}`} target="_blank" rel="noreferrer"><Search aria-hidden /> Search Google</a></Button> : null}
              {activeId ? <Button type="button" variant="ghost" onClick={() => { setActiveId(null); setIntention(""); setBrief(EMPTY_BRIEF); setMessage(""); }}><Plus aria-hidden /> New session</Button> : null}
            </div>
          </form>
          {sessions.data?.sessions.length ? <div className="flex flex-wrap items-center gap-2"><span className="text-xs text-muted-foreground">Recent:</span>{sessions.data.sessions.slice(0, 5).map((session) => <Button key={session.id} size="sm" variant={activeId === session.id ? "secondary" : "ghost"} onClick={() => selectSession(session)}>{session.intention.slice(0, 42)}</Button>)}</div> : null}
          {message ? <p className="text-sm text-muted-foreground" role="status">{message}</p> : null}
        </CardContent>
      </Card>

      {activeId ? <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card><CardHeader><CardTitle>Capture promising books</CardTitle><CardDescription>Copy factual information from the page you found. Keep opinions for the organizer.</CardDescription></CardHeader><CardContent className="space-y-4">
          <form className="space-y-3" onSubmit={submitCandidate}>
            <div className="grid gap-3 sm:grid-cols-2"><Input value={candidate.title} onChange={(e) => setCandidate({ ...candidate, title: e.target.value })} placeholder="Book title" required /><Input value={candidate.author} onChange={(e) => setCandidate({ ...candidate, author: e.target.value })} placeholder="Author" /></div>
            <div className="grid gap-3 sm:grid-cols-2"><Input type="url" value={candidate.source_url} onChange={(e) => setCandidate({ ...candidate, source_url: e.target.value })} placeholder="Source URL" /><Input value={candidate.source_name} onChange={(e) => setCandidate({ ...candidate, source_name: e.target.value })} placeholder="Source name" /></div>
            <Textarea value={candidate.factual_summary} onChange={(e) => setCandidate({ ...candidate, factual_summary: e.target.value })} placeholder="Publisher or library summary, age guidance, format, length, or other stated facts" />
            <Button type="submit" size="sm" disabled={!candidate.title.trim() || addCandidate.isPending}><Plus aria-hidden /> Add candidate</Button>
          </form>
          <div className="space-y-2">{candidates.map((item) => <div key={item.id} className="rounded-lg border p-3"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{item.title}</p>{item.author ? <p className="text-sm text-muted-foreground">{item.author}</p> : null}</div><Button type="button" size="icon-xs" variant="ghost" aria-label={`Remove ${item.title}`} onClick={() => removeCandidate.mutate(item.id)}><Trash2 aria-hidden /></Button></div>{item.factual_summary ? <p className="mt-2 text-sm">{item.factual_summary}</p> : null}{item.source_url ? <a className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline" href={item.source_url} target="_blank" rel="noreferrer">{item.source_name || "Source"} <ExternalLink className="size-3" /></a> : null}</div>)}{!candidates.length ? <p className="text-sm italic text-muted-foreground">No candidates yet.</p> : null}</div>
        </CardContent></Card>

        <Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div className="space-y-1"><CardTitle>Organized shortlist</CardTitle><CardDescription>LLM interpretation, grounded only in your candidate facts.</CardDescription></div><Button type="button" size="sm" onClick={() => organize.mutate()} disabled={candidates.length < 2 || organize.isPending}><Sparkles aria-hidden /> {organize.isPending ? "Organizing…" : "Organize candidates"}</Button></div></CardHeader><CardContent className="space-y-3">
          {(detail.data?.shortlist ?? []).map((entry) => { const item = candidateById.get(entry.candidate_id); if (!item) return null; return <div key={entry.id} className="rounded-lg border p-4"><div className="flex items-start gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{entry.rank}</span><div className="space-y-2"><div><p className="font-medium">{item.title}</p>{item.author ? <p className="text-xs text-muted-foreground">{item.author}</p> : null}</div><p className="text-sm">{entry.fit_reason}</p>{entry.caveats ? <p className="text-xs text-amber-700 dark:text-amber-300">Check: {entry.caveats}</p> : null}<div className="flex flex-wrap gap-1">{entry.match_tags.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}</div></div></div></div>; })}
          {!detail.data?.shortlist.length ? <p className="text-sm italic text-muted-foreground">Add at least two candidates, then organize them into a shortlist.</p> : null}
        </CardContent></Card>
      </div> : null}
    </section>
  );
}
