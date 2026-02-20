"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { LearningLogEntry, LearningProfile, LearningProfileType } from "@/types/database";

const FEEDBACK_OPTIONS = ["Too easy", "Too hard", "More like this", "Less like this"] as const;

export function LearningDashboard() {
  const [profiles, setProfiles] = useState<LearningProfile[]>([]);
  const [entries, setEntries] = useState<LearningLogEntry[]>([]);

  const [directIntentType, setDirectIntentType] = useState<LearningProfileType>("topic");
  const [directIntent, setDirectIntent] = useState("");
  const [directWhy, setDirectWhy] = useState("");
  const [directDepth, setDirectDepth] = useState<"overview" | "practical" | "deep_dive">("practical");
  const [directCadence, setDirectCadence] = useState<"daily" | "few_times_week">("daily");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void reload();
  }, []);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const [profilesRes, logRes] = await Promise.all([
        fetch("/api/learning/profiles", { cache: "no-store" }),
        fetch("/api/learning/log?limit=20", { cache: "no-store" }),
      ]);
      if (!profilesRes.ok || !logRes.ok) {
        throw new Error("Failed to load learning data");
      }
      const profilesJson = (await profilesRes.json()) as { profiles: LearningProfile[] };
      const logJson = (await logRes.json()) as { entries: LearningLogEntry[] };
      setProfiles(profilesJson.profiles);
      setEntries(logJson.entries);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function createProfile(payload: {
    topic: string;
    profile_type: LearningProfileType;
    current_level: string;
    daily_goal: string;
    target_duration_minutes: number;
  }) {
    setError(null);
    setSuccess(null);
    const response = await fetch("/api/learning/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        status: "active",
      }),
    });
    if (!response.ok) {
      const json = (await response.json()) as { error?: string };
      setError(json.error ?? "Failed to create profile");
      return;
    }
    setSuccess("Learning profile created.");
    await reload();
  }

  async function submitDirectProfile() {
    if (!directIntent.trim()) {
      setError("Please enter what you want to learn.");
      return;
    }

    const currentLevel =
      directDepth === "overview" ? "Beginner" : directDepth === "practical" ? "Intermediate" : "Advanced";
    const cadenceText = directCadence === "daily" ? "Daily" : "3x/week";
    const topic =
      directIntentType === "category" ? `Surprise me in ${directIntent.trim()}` : directIntent.trim();
    const dailyGoal = `${cadenceText} ${directDepth.replace("_", " ")} lessons${directWhy.trim() ? ` — ${directWhy.trim()}` : ""}`;

    await createProfile({
      topic,
      profile_type: directIntentType,
      current_level: currentLevel,
      daily_goal: dailyGoal,
      target_duration_minutes: directCadence === "daily" ? 2 : 4,
    });
    setDirectIntent("");
    setDirectWhy("");
    setDirectIntentType("topic");
    setDirectDepth("practical");
    setDirectCadence("daily");
  }

  async function setProfileStatus(profile: LearningProfile, status: "active" | "paused") {
    const response = await fetch(`/api/learning/profiles/${profile.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      const json = (await response.json()) as { error?: string };
      setError(json.error ?? "Failed to update profile");
      return;
    }
    await reload();
  }

  async function submitFeedback(logId: string, feedback: string) {
    const response = await fetch("/api/learning/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ log_id: logId, feedback }),
    });
    if (!response.ok) {
      const json = (await response.json()) as { error?: string };
      setError(json.error ?? "Failed to submit feedback");
      return;
    }
    await reload();
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
      <Card>
        <CardHeader>
          <CardTitle>I know what I want to learn</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 rounded-md border p-3">
            <p className="text-sm font-medium">Direct goal setup</p>
            <div className="grid gap-3 md:grid-cols-2">
              <select
                className="rounded-md border px-3 py-2 text-sm"
                value={directIntentType}
                onChange={(event) => setDirectIntentType(event.target.value as LearningProfileType)}
              >
                <option value="topic">Specific topic</option>
                <option value="category">Broad category</option>
              </select>
              <Input
                placeholder={
                  directIntentType === "category"
                    ? "Category (e.g., ai, culture)"
                    : "Topic (e.g., distributed systems)"
                }
                value={directIntent}
                onChange={(event) => setDirectIntent(event.target.value)}
              />
              <select
                className="rounded-md border px-3 py-2 text-sm"
                value={directDepth}
                onChange={(event) => setDirectDepth(event.target.value as "overview" | "practical" | "deep_dive")}
              >
                <option value="overview">Overview</option>
                <option value="practical">Practical</option>
                <option value="deep_dive">Deep dive</option>
              </select>
              <select
                className="rounded-md border px-3 py-2 text-sm"
                value={directCadence}
                onChange={(event) => setDirectCadence(event.target.value as "daily" | "few_times_week")}
              >
                <option value="daily">Daily</option>
                <option value="few_times_week">Few times/week</option>
              </select>
            </div>
            <Input
              placeholder="Why this matters to you (optional)"
              value={directWhy}
              onChange={(event) => setDirectWhy(event.target.value)}
            />

            <article className="rounded-md border bg-muted/30 p-3 text-sm">
              <p className="font-medium">Draft preview</p>
              <p>Type: {directIntentType}</p>
              <p>Focus: {directIntent || "—"}</p>
              <p>Depth: {directDepth.replace("_", " ")}</p>
              <p>Cadence: {directCadence === "daily" ? "daily" : "few times/week"}</p>
            </article>

            <Button type="button" className="min-h-11 w-full md:w-auto" onClick={() => void submitDirectProfile()}>
              Create learning profile
            </Button>
          </div>

          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
          {success ? <p className="mt-3 text-sm text-green-600">{success}</p> : null}
        </CardContent>
      </Card>

      {loading ? <p>Loading learning data...</p> : null}

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profiles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {profiles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No profiles yet.</p>
            ) : (
              profiles.map((profile) => (
                <article key={profile.id} className="rounded-md border p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="font-medium">{profile.topic}</h3>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline">{profile.profile_type === "category" ? "category" : "topic"}</Badge>
                      <Badge variant={profile.status === "active" ? "default" : "secondary"}>
                        {profile.status}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Level: {profile.current_level ?? "N/A"} | Goal: {profile.daily_goal ?? "N/A"}
                  </p>
                  <div className="mt-2 flex gap-2">
                    {profile.status === "active" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-h-11"
                        onClick={() => setProfileStatus(profile, "paused")}
                      >
                        Pause
                      </Button>
                    ) : (
                      <Button size="sm" className="min-h-11" onClick={() => setProfileStatus(profile, "active")}>
                        Activate
                      </Button>
                    )}
                  </div>
                </article>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Lessons</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No lessons yet.</p>
            ) : (
              entries.map((entry) => (
                <article key={entry.id} className="rounded-md border p-3">
                  {entry.profile ? (
                    <p className="mb-2 text-xs text-muted-foreground">
                      {entry.profile.profile_type === "category" ? "Category" : "Topic"}: {entry.profile.topic}
                    </p>
                  ) : null}
                  <p className="mb-2 whitespace-pre-wrap text-sm">{entry.content}</p>
                  <p className="mb-2 text-xs text-muted-foreground">
                    {new Date(entry.created_at).toLocaleString()}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {FEEDBACK_OPTIONS.map((option) => (
                      <Button
                        key={option}
                        size="sm"
                        variant={entry.feedback === option ? "default" : "outline"}
                        className="min-h-11"
                        onClick={() => submitFeedback(entry.id, option)}
                      >
                        {option}
                      </Button>
                    ))}
                  </div>
                </article>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
