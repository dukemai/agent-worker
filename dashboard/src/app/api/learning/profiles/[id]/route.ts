import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

function isLearningStatus(value: unknown): value is "active" | "paused" {
  return value === "active" || value === "paused";
}

function isLearningProfileType(value: unknown): value is "topic" | "category" {
  return value === "topic" || value === "category";
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const { id } = await params;
  const payload = (await request.json()) as {
    topic?: unknown;
    profile_type?: unknown;
    current_level?: unknown;
    daily_goal?: unknown;
    target_duration_minutes?: unknown;
    status?: unknown;
    curriculum_outline?: unknown;
  };

  const updates: Record<string, unknown> = {};

  if (payload.topic !== undefined) {
    if (typeof payload.topic !== "string" || payload.topic.trim().length === 0) {
      return errorResponse("topic must be a non-empty string");
    }
    updates.topic = payload.topic.trim();
  }
  if (payload.current_level !== undefined) {
    updates.current_level = typeof payload.current_level === "string" ? payload.current_level : null;
  }
  if (payload.profile_type !== undefined) {
    if (!isLearningProfileType(payload.profile_type)) {
      return errorResponse("profile_type must be topic or category");
    }
    updates.profile_type = payload.profile_type;
  }
  if (payload.daily_goal !== undefined) {
    updates.daily_goal = typeof payload.daily_goal === "string" ? payload.daily_goal : null;
  }
  if (payload.target_duration_minutes !== undefined) {
    if (typeof payload.target_duration_minutes !== "number" || payload.target_duration_minutes <= 0) {
      return errorResponse("target_duration_minutes must be a positive number");
    }
    updates.target_duration_minutes = payload.target_duration_minutes;
  }
  if (payload.status !== undefined) {
    if (!isLearningStatus(payload.status)) {
      return errorResponse("status must be active or paused");
    }
    updates.status = payload.status;
  }
  if (payload.curriculum_outline !== undefined) {
    updates.curriculum_outline = payload.curriculum_outline;
  }

  if (Object.keys(updates).length === 0) {
    return errorResponse("No valid fields to update");
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await auth.supabase
    .from("learning_profile")
    .update(updates)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    return errorResponse(error.message, 500);
  }
  if (!data) {
    return errorResponse("Profile not found", 404);
  }

  return NextResponse.json({ profile: data });
}

export async function DELETE(_: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const { id } = await params;
  const { data, error } = await auth.supabase
    .from("learning_profile")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return errorResponse(error.message, 500);
  }
  if (!data) {
    return errorResponse("Profile not found", 404);
  }

  return NextResponse.json({ success: true });
}
