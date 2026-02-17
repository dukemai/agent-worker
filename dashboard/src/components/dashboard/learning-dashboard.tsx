"use client";

import { FormEvent, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { LearningLogEntry, LearningProfile } from "@/types/database";

const FEEDBACK_OPTIONS = ["1", "2", "3", "4", "5", "Too easy", "Too hard", "Irrelevant"] as const;

export function LearningDashboard() {
  const [profiles, setProfiles] = useState<LearningProfile[]>([]);
  const [entries, setEntries] = useState<LearningLogEntry[]>([]);
  const [topic, setTopic] = useState("");
  const [currentLevel, setCurrentLevel] = useState("Beginner");
  const [error, setError] = useState<string | null>(null);
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

  async function createProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/learning/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic,
        current_level: currentLevel,
        daily_goal: "Bite-sized (2 min read)",
        target_duration_minutes: 2,
        status: "active",
      }),
    });
    if (!response.ok) {
      const json = (await response.json()) as { error?: string };
      setError(json.error ?? "Failed to create profile");
      return;
    }
    setTopic("");
    await reload();
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
          <CardTitle>Add Learning Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-3" onSubmit={createProfile}>
            <Input
              placeholder="Topic (e.g., Distributed Systems)"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              required
            />
            <Input
              placeholder="Current level"
              value={currentLevel}
              onChange={(event) => setCurrentLevel(event.target.value)}
            />
            <Button type="submit">Create Profile</Button>
          </form>
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
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
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-medium">{profile.topic}</h3>
                    <Badge variant={profile.status === "active" ? "default" : "secondary"}>
                      {profile.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Level: {profile.current_level ?? "N/A"} | Goal: {profile.daily_goal ?? "N/A"}
                  </p>
                  <div className="mt-2 flex gap-2">
                    {profile.status === "active" ? (
                      <Button size="sm" variant="outline" onClick={() => setProfileStatus(profile, "paused")}>
                        Pause
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => setProfileStatus(profile, "active")}>
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
