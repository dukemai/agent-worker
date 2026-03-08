"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchRenewals, readApiError } from "./api";
import type { ReminderGroup } from "./types";

function getGroupLabel(group: ReminderGroup) {
  if (group === "critical") return "Critical (<=1d)";
  if (group === "urgent") return "Urgent (<=7d)";
  return "Soon (<=30d)";
}

export function RenewalsCard() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const renewalsQuery = useQuery({ queryKey: ["renewals"], queryFn: fetchRenewals });
  const renewals = renewalsQuery.data ?? [];
  const loading = renewalsQuery.isLoading;
  const displayError = error ?? (renewalsQuery.error instanceof Error ? renewalsQuery.error.message : null);

  const reminderActionMutation = useMutation({
    mutationFn: async ({ reminderId, action }: { reminderId: string; action: "complete" | "snooze" }) => {
      const response = await fetch(`/api/reminders/${reminderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "snooze" ? { action, days: 7 } : { action }),
      });
      if (!response.ok) {
        await readApiError(response, `Failed to ${action} reminder`);
      }
      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["renewals"] }),
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
      ]);
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "Failed to update reminder");
    },
  });

  async function onReminderAction(reminderId: string, action: "complete" | "snooze") {
    setError(null);
    await reminderActionMutation.mutateAsync({ reminderId, action });
  }

  const groups: ReminderGroup[] = ["critical", "urgent", "soon"];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Renewals</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-sm text-muted-foreground">Loading renewals...</p> : null}
        {displayError ? <p className="text-sm text-red-600">{displayError}</p> : null}
        {!loading && renewals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming renewals in the next 30 days.</p>
        ) : null}
        {!loading && renewals.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-3">
            {groups.map((group) => {
              const items = renewals.filter((r) => r.group === group);
              return (
                <section key={group} className="rounded-md border p-3">
                  <h3 className="mb-2 text-sm font-medium">{getGroupLabel(group)}</h3>
                  {items.length === 0 ? (
                    <p className="text-xs text-muted-foreground">None</p>
                  ) : (
                    <div className="space-y-2">
                      {items.map((item) => {
                        const link = typeof item.metadata?.link === "string" ? item.metadata.link : "";
                        const nextAction =
                          typeof item.metadata?.next_action === "string" ? item.metadata.next_action : "";
                        return (
                          <article key={item.id} className="rounded-md border p-2">
                            <p className="text-sm font-medium">{item.title}</p>
                            <p className="text-xs text-muted-foreground">
                              Due in {item.days_left} days · {new Date(item.due_date).toLocaleDateString()}
                            </p>
                            {nextAction ? (
                              <p className="mt-1 text-xs text-muted-foreground">Next: {nextAction}</p>
                            ) : null}
                            <div className="mt-2 flex flex-wrap gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="min-h-11"
                                onClick={() => onReminderAction(item.id, "complete")}
                              >
                                Done
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="min-h-11"
                                onClick={() => onReminderAction(item.id, "snooze")}
                              >
                                Snooze 7d
                              </Button>
                              {link ? (
                                <Button
                                  size="sm"
                                  className="min-h-11"
                                  onClick={() => window.open(link, "_blank", "noopener,noreferrer")}
                                >
                                  Open
                                </Button>
                              ) : null}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
