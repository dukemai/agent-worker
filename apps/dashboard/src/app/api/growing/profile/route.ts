import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import type { GrowingProfile } from "@/types/database";

const SPACE_TYPES = ["balcony", "indoor", "yard", "mixed"] as const;
const EXPERIENCE_LEVELS = ["beginner", "intermediate", "advanced"] as const;

export async function GET() {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const { data: rows, error } = await auth.supabase
    .from("growing_profiles")
    .select("id, city, country_code, space_type, experience_level, interests")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    return errorResponse(error.message, 500);
  }

  const profile = (rows?.[0] as GrowingProfile | undefined) ?? null;
  if (!profile) {
    return errorResponse("No growing profile found", 404);
  }

  return NextResponse.json({ profile });
}

export async function POST(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const { data: rows, error: existingError } = await auth.supabase
    .from("growing_profiles")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1);

  if (existingError) {
    return errorResponse(existingError.message, 500);
  }

  if ((rows ?? []).length > 0) {
    return errorResponse("Growing profile already exists", 409);
  }

  const body = (await request.json().catch(() => ({}))) as {
    city?: unknown;
    country_code?: unknown;
    space_type?: unknown;
    experience_level?: unknown;
    interests?: unknown;
  };

  const city = typeof body.city === "string" && body.city.trim().length > 0
    ? body.city.trim().slice(0, 100)
    : "Stockholm";
  const countryCode = typeof body.country_code === "string" && body.country_code.trim().length > 0
    ? body.country_code.trim().slice(0, 10).toUpperCase()
    : "SE";

  const spaceTypeRaw = body.space_type;
  if (spaceTypeRaw !== undefined && !SPACE_TYPES.includes(spaceTypeRaw as (typeof SPACE_TYPES)[number])) {
    return errorResponse("Invalid space_type");
  }
  const spaceType = (spaceTypeRaw as (typeof SPACE_TYPES)[number] | undefined) ?? "balcony";

  const experienceRaw = body.experience_level;
  if (experienceRaw !== undefined && !EXPERIENCE_LEVELS.includes(experienceRaw as (typeof EXPERIENCE_LEVELS)[number])) {
    return errorResponse("Invalid experience_level");
  }
  const experience = (experienceRaw as (typeof EXPERIENCE_LEVELS)[number] | undefined) ?? "beginner";

  const interests = Array.isArray(body.interests)
    ? body.interests.slice(0, 20).map((s) => String(s).slice(0, 50))
    : typeof body.interests === "string"
      ? body.interests.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20).map((s) => s.slice(0, 50))
      : ["herb", "tomato", "berry"];

  const { data: created, error: createError } = await auth.supabase
    .from("growing_profiles")
    .insert({
      city,
      country_code: countryCode,
      space_type: spaceType,
      experience_level: experience,
      interests,
    })
    .select("id, city, country_code, space_type, experience_level, interests")
    .single();

  if (createError || !created) {
    return errorResponse(createError?.message ?? "Failed to create growing profile", 500);
  }

  return NextResponse.json({ profile: created as GrowingProfile }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const body = (await request.json()) as {
    city?: unknown;
    country_code?: unknown;
    space_type?: unknown;
    experience_level?: unknown;
    interests?: unknown;
  };

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof body.city === "string" && body.city.trim().length > 0) {
    updates.city = body.city.trim().slice(0, 100);
  }
  if (typeof body.country_code === "string" && body.country_code.trim().length > 0) {
    updates.country_code = body.country_code.trim().slice(0, 10).toUpperCase();
  }
  if (body.space_type !== undefined) {
    if (!SPACE_TYPES.includes(body.space_type as (typeof SPACE_TYPES)[number])) {
      return errorResponse("Invalid space_type");
    }
    updates.space_type = body.space_type;
  }
  if (body.experience_level !== undefined) {
    if (!EXPERIENCE_LEVELS.includes(body.experience_level as (typeof EXPERIENCE_LEVELS)[number])) {
      return errorResponse("Invalid experience_level");
    }
    updates.experience_level = body.experience_level;
  }
  if (body.interests !== undefined) {
    const raw = Array.isArray(body.interests)
      ? body.interests
      : typeof body.interests === "string"
        ? body.interests.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
    updates.interests = raw.slice(0, 20).map((s) => String(s).slice(0, 50));
  }

  if (Object.keys(updates).length <= 1) {
    return errorResponse("No valid fields to update");
  }

  const { data: existing } = await auth.supabase
    .from("growing_profiles")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1);

  const profileId = (existing?.[0] as { id: string } | undefined)?.id;
  if (!profileId) {
    return errorResponse("No growing profile found", 404);
  }

  const { data: updated, error } = await auth.supabase
    .from("growing_profiles")
    .update(updates)
    .eq("id", profileId)
    .select("id, city, country_code, space_type, experience_level, interests")
    .single();

  if (error) {
    return errorResponse(error.message, 500);
  }

  return NextResponse.json({ profile: updated as GrowingProfile });
}
