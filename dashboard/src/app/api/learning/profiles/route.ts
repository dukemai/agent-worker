import { NextRequest, NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";

function isLearningStatus(value: unknown): value is "active" | "paused" {
  return value === "active" || value === "paused";
}

function isLearningProfileType(value: unknown): value is "topic" | "category" {
  return value === "topic" || value === "category";
}

export async function GET(request: NextRequest) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const status = request.nextUrl.searchParams.get("status");
  if (status && !isLearningStatus(status)) {
    return errorResponse("status must be active or paused");
  }

  let query = auth.supabase.from("learning_profile").select("*").order("updated_at", { ascending: false });
  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    return errorResponse(error.message, 500);
  }

  return NextResponse.json({ profiles: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const payload = (await request.json()) as {
    topic?: unknown;
    profile_type?: unknown;
    current_level?: unknown;
    daily_goal?: unknown;
    target_duration_minutes?: unknown;
    status?: unknown;
    curriculum_outline?: unknown;
  };

  if (typeof payload.topic !== "string" || payload.topic.trim().length === 0) {
    return errorResponse("topic is required");
  }
  if (payload.profile_type !== undefined && !isLearningProfileType(payload.profile_type)) {
    return errorResponse("profile_type must be topic or category");
  }

  if (payload.status !== undefined && !isLearningStatus(payload.status)) {
    return errorResponse("status must be active or paused");
  }

  if (
    payload.target_duration_minutes !== undefined &&
    (typeof payload.target_duration_minutes !== "number" || payload.target_duration_minutes <= 0)
  ) {
    return errorResponse("target_duration_minutes must be a positive number");
  }

  const { data, error } = await auth.supabase
    .from("learning_profile")
    .insert({
      topic: payload.topic.trim(),
      profile_type: isLearningProfileType(payload.profile_type) ? payload.profile_type : "topic",
      current_level: typeof payload.current_level === "string" ? payload.current_level : null,
      daily_goal: typeof payload.daily_goal === "string" ? payload.daily_goal : null,
      target_duration_minutes:
        typeof payload.target_duration_minutes === "number" ? payload.target_duration_minutes : 2,
      status: isLearningStatus(payload.status) ? payload.status : "active",
      curriculum_outline: payload.curriculum_outline ?? null,
    })
    .select("*")
    .single();

  if (error) {
    return errorResponse(error.message, 500);
  }

  return NextResponse.json({ profile: data }, { status: 201 });
}
