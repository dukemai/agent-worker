import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase, parseIsoDate } from "@/lib/api";
import { BUCKET_TABLES } from "@/lib/buckets";
import type { Bucket } from "@/types/database";

type ReminderType = "passport" | "subscription" | "membership" | "permit" | "insurance" | "other";
type Recurrence = "none" | "yearly" | "monthly";

type ReminderTask = {
  id: string;
  title: string;
  due_date: string | null;
  status: "pending" | "done";
  metadata: Record<string, unknown> | null;
};

function isReminderType(value: unknown): value is ReminderType {
  return (
    value === "passport" ||
    value === "subscription" ||
    value === "membership" ||
    value === "permit" ||
    value === "insurance" ||
    value === "other"
  );
}

function isRecurrence(value: unknown): value is Recurrence {
  return value === "none" || value === "yearly" || value === "monthly";
}

function getBucketForDueDate(dueDateIso: string): Bucket {
  const now = Date.now();
  const due = new Date(dueDateIso).getTime();
  const days = Math.floor((due - now) / (1000 * 60 * 60 * 24));
  if (days <= 1) return "today";
  if (days <= 7) return "this_week";
  return "later";
}

function getReminderGroup(dueDateIso: string): "critical" | "urgent" | "soon" {
  const now = Date.now();
  const due = new Date(dueDateIso).getTime();
  const days = Math.floor((due - now) / (1000 * 60 * 60 * 24));
  if (days <= 1) return "critical";
  if (days <= 7) return "urgent";
  return "soon";
}

export async function GET() {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const { data, error } = await auth.supabase
    .from("tasks")
    .select("id, title, due_date, status, metadata")
    .eq("status", "pending")
    .eq("source", "manual")
    .contains("metadata", { item_type: "renewal" })
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(100);

  if (error) {
    return errorResponse(error.message, 500);
  }

  const reminders = ((data ?? []) as ReminderTask[])
    .filter((task) => task.due_date)
    .map((task) => {
      const due = task.due_date as string;
      const daysLeft = Math.floor((new Date(due).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return {
        ...task,
        due_date: due,
        days_left: daysLeft,
        group: getReminderGroup(due),
      };
    })
    .filter((task) => task.days_left <= 30);

  return NextResponse.json({
    reminders,
    groups: {
      critical: reminders.filter((r) => r.group === "critical"),
      urgent: reminders.filter((r) => r.group === "urgent"),
      soon: reminders.filter((r) => r.group === "soon"),
    },
  });
}

export async function POST(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const payload = (await request.json()) as {
    title?: unknown;
    reminder_type?: unknown;
    owner?: unknown;
    expires_on?: unknown;
    lead_days?: unknown;
    recurrence?: unknown;
    link?: unknown;
    next_action?: unknown;
  };

  if (typeof payload.title !== "string" || payload.title.trim().length === 0) {
    return errorResponse("title is required");
  }
  if (!isReminderType(payload.reminder_type)) {
    return errorResponse("Invalid reminder_type");
  }

  const expiresOn = parseIsoDate(payload.expires_on);
  if (!expiresOn) {
    return errorResponse("expires_on is required and must be a valid ISO date");
  }

  const leadDays =
    typeof payload.lead_days === "number" && Number.isInteger(payload.lead_days) && payload.lead_days >= 0
      ? payload.lead_days
      : 30;
  const recurrence = isRecurrence(payload.recurrence) ? payload.recurrence : "none";
  const owner = typeof payload.owner === "string" ? payload.owner.trim().slice(0, 80) : "";
  const link = typeof payload.link === "string" ? payload.link.trim().slice(0, 500) : "";
  const nextAction =
    typeof payload.next_action === "string" ? payload.next_action.trim().slice(0, 240) : "Review and renew";

  const renewByDate = new Date(expiresOn);
  renewByDate.setDate(renewByDate.getDate() - leadDays);
  const renewByIso = renewByDate.toISOString();
  const bucket = getBucketForDueDate(renewByIso);

  const metadata = {
    item_type: "renewal",
    reminder_type: payload.reminder_type,
    owner,
    expires_on: expiresOn,
    renew_by: renewByIso,
    lead_days: leadDays,
    recurrence,
    link,
    next_action: nextAction,
  };

  const { data: task, error: taskError } = await auth.supabase
    .from("tasks")
    .insert({
      title: payload.title.trim().slice(0, 200),
      due_date: renewByIso,
      status: "pending",
      source: "manual",
      metadata,
      original_body: link
        ? `${nextAction}\nOwner: ${owner || "N/A"}\nExpires: ${new Date(expiresOn).toLocaleDateString("sv-SE")}\nLink: ${link}`
        : `${nextAction}\nOwner: ${owner || "N/A"}\nExpires: ${new Date(expiresOn).toLocaleDateString("sv-SE")}`,
    })
    .select("*")
    .single();

  if (taskError || !task) {
    return errorResponse(taskError?.message ?? "Failed to create reminder", 500);
  }

  const { error: bucketError } = await auth.supabase
    .from(BUCKET_TABLES[bucket])
    .insert({ task_id: task.id });

  if (bucketError) {
    return errorResponse(bucketError.message, 500);
  }

  return NextResponse.json({ reminder: task, bucket }, { status: 201 });
}
