"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { FamilyContext } from "@/types/database";

export function ContextDashboard() {
  const [items, setItems] = useState<FamilyContext[]>([]);
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void reload();
  }, []);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/context", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to fetch context");
      }
      const json = (await response.json()) as { context: FamilyContext[] };
      setItems(json.context);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function onUpsert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch(`/api/context/${encodeURIComponent(key)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    if (!response.ok) {
      const json = (await response.json()) as { error?: string };
      setError(json.error ?? "Failed to save context");
      return;
    }
    setKey("");
    setValue("");
    await reload();
  }

  async function onDelete(itemKey: string) {
    const response = await fetch(`/api/context/${encodeURIComponent(itemKey)}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const json = (await response.json()) as { error?: string };
      setError(json.error ?? "Failed to delete context");
      return;
    }
    await reload();
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <Card>
        <CardHeader>
          <CardTitle>Upsert Context</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={onUpsert}>
            <Input
              placeholder="Key (shopping_list, seasonal_interests, plants_at_home)"
              value={key}
              onChange={(event) => setKey(event.target.value)}
              required
            />
            <Textarea
              placeholder="Value"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              required
            />
            <Button type="submit">Save</Button>
          </form>
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Context</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? <p>Loading context...</p> : null}
          {!loading && items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No context values yet.</p>
          ) : null}
          {items.map((item) => (
            <article key={item.key} className="rounded-md border p-3">
              <p className="font-medium">{item.key}</p>
              <p className="mb-2 whitespace-pre-wrap text-sm">{item.value}</p>
              <p className="mb-2 text-xs text-muted-foreground">
                Updated: {new Date(item.last_updated).toLocaleString()}
              </p>
              <Button size="sm" variant="outline" onClick={() => onDelete(item.key)}>
                Delete
              </Button>
            </article>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
