"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { readApiError } from "./api";
import type { CreateReminderPayload, Recurrence, ReminderType } from "./types";

export function AddRenewalReminderCard() {
  const queryClient = useQueryClient();
  const [newReminderTitle, setNewReminderTitle] = useState("");
  const [newReminderType, setNewReminderType] = useState<ReminderType>("passport");
  const [newReminderOwner, setNewReminderOwner] = useState("");
  const [newReminderExpiry, setNewReminderExpiry] = useState("");
  const [newReminderLeadDays, setNewReminderLeadDays] = useState("30");
  const [newReminderRecurrence, setNewReminderRecurrence] = useState<Recurrence>("none");
  const [newReminderLink, setNewReminderLink] = useState("");
  const [newReminderAction, setNewReminderAction] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createReminderMutation = useMutation({
    mutationFn: async (payload: CreateReminderPayload) => {
      const response = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        await readApiError(response, "Failed to create reminder");
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
      setError(mutationError instanceof Error ? mutationError.message : "Failed to create reminder");
    },
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const leadDaysNum = Number(newReminderLeadDays);
    try {
      await createReminderMutation.mutateAsync({
        title: newReminderTitle,
        reminder_type: newReminderType,
        owner: newReminderOwner,
        expires_on: newReminderExpiry ? new Date(newReminderExpiry).toISOString() : null,
        lead_days: Number.isFinite(leadDaysNum) ? leadDaysNum : 30,
        recurrence: newReminderRecurrence,
        link: newReminderLink,
        next_action: newReminderAction || "Review and renew",
      });

      setNewReminderTitle("");
      setNewReminderType("passport");
      setNewReminderOwner("");
      setNewReminderExpiry("");
      setNewReminderLeadDays("30");
      setNewReminderRecurrence("none");
      setNewReminderLink("");
      setNewReminderAction("");
    } catch {
      return;
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Renewal Reminder</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-3 md:grid-cols-4" onSubmit={handleSubmit}>
          <Input
            className="md:col-span-2"
            placeholder="Title (e.g., Renew Anna passport)"
            value={newReminderTitle}
            onChange={(event) => setNewReminderTitle(event.target.value)}
            required
          />
          <select
            className="rounded-md border px-3 py-2 text-sm"
            value={newReminderType}
            onChange={(event) => setNewReminderType(event.target.value as ReminderType)}
          >
            <option value="passport">Passport</option>
            <option value="subscription">Subscription</option>
            <option value="membership">Membership</option>
            <option value="permit">Permit</option>
            <option value="insurance">Insurance</option>
            <option value="other">Other</option>
          </select>
          <Input
            placeholder="Owner (optional)"
            value={newReminderOwner}
            onChange={(event) => setNewReminderOwner(event.target.value)}
          />
          <Input
            type="date"
            value={newReminderExpiry}
            onChange={(event) => setNewReminderExpiry(event.target.value)}
            required
          />
          <Input
            type="number"
            min={0}
            placeholder="Lead days"
            value={newReminderLeadDays}
            onChange={(event) => setNewReminderLeadDays(event.target.value)}
          />
          <select
            className="rounded-md border px-3 py-2 text-sm"
            value={newReminderRecurrence}
            onChange={(event) => setNewReminderRecurrence(event.target.value as Recurrence)}
          >
            <option value="none">No recurrence</option>
            <option value="yearly">Yearly</option>
            <option value="monthly">Monthly</option>
          </select>
          <Input
            className="md:col-span-2"
            placeholder="Link (optional)"
            value={newReminderLink}
            onChange={(event) => setNewReminderLink(event.target.value)}
          />
          <Input
            className="md:col-span-2"
            placeholder="Next action (optional)"
            value={newReminderAction}
            onChange={(event) => setNewReminderAction(event.target.value)}
          />
          <Button className="min-h-11 md:col-start-4" type="submit">
            Add Renewal
          </Button>
        </form>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
