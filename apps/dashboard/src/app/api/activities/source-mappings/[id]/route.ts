import { NextResponse } from "next/server";
import { normalizeActivitySourceDomain, reclassifyActivitySourcesFromMappings } from "@/lib/activity-source-classifier";
import { isActivitySourceScope } from "@/lib/activity-source-scopes";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import type { ActivitySourceCategory, ActivitySourceLanguage, ActivitySourceMapping, ActivitySourceTrust } from "@/types/database";

type Params = { params: Promise<{ id: string }> };

const MAPPING_SELECT =
  "id, source_domain, source_name, homepage_url, activity_listing_url, gathering_notes, collection_focus, collection_instructions, check_frequency, last_checked_at, season_target, is_core, source_category, source_scope, source_trust, source_language, created_at, updated_at";
const VALID_CATEGORIES = new Set<ActivitySourceCategory>([
  "official_city",
  "municipality",
  "museum",
  "library",
  "event_platform",
  "venue",
  "blog",
  "community",
  "unknown",
]);
const VALID_TRUST = new Set<ActivitySourceTrust>(["official", "partner", "community", "unknown"]);
const VALID_LANGUAGES = new Set<ActivitySourceLanguage>(["sv", "en", "mixed", "unknown"]);
const VALID_FREQUENCIES = new Set(["weekly", "monthly", "seasonal"]);

function parseUpdates(
  payload: Record<string, unknown>
): { updates: Partial<ActivitySourceMapping> } | { error: string } {
  const updates: Partial<ActivitySourceMapping> = {};

  if ("source_domain" in payload) {
    if (typeof payload.source_domain !== "string" || payload.source_domain.trim().length === 0) {
      return { error: "source_domain must be a valid domain" };
    }
    const sourceDomain = normalizeActivitySourceDomain(payload.source_domain.trim());
    if (!sourceDomain) return { error: "source_domain must be a valid domain" };
    updates.source_domain = sourceDomain;
  }
  if ("source_name" in payload) {
    if (payload.source_name !== null && typeof payload.source_name !== "string") {
      return { error: "source_name must be a string or null" };
    }
    updates.source_name = typeof payload.source_name === "string" && payload.source_name.trim() ? payload.source_name.trim() : null;
  }
  for (const field of ["homepage_url", "activity_listing_url"] as const) {
    if (!(field in payload)) continue;
    const value = payload[field];
    if (value !== null && typeof value !== "string") return { error: `${field} must be a URL or null` };
    if (typeof value === "string" && value.trim()) {
      try {
        const url = new URL(value.trim());
        if (!['http:', 'https:'].includes(url.protocol)) return { error: `${field} must use http or https` };
      } catch {
        return { error: `${field} must be a valid URL` };
      }
    }
    updates[field] = typeof value === "string" && value.trim() ? value.trim() : null;
  }
  if ("gathering_notes" in payload) {
    if (payload.gathering_notes !== null && typeof payload.gathering_notes !== "string") {
      return { error: "gathering_notes must be a string or null" };
    }
    updates.gathering_notes =
      typeof payload.gathering_notes === "string" && payload.gathering_notes.trim() ? payload.gathering_notes.trim() : null;
  }
  for (const field of ["collection_focus", "collection_instructions"] as const) {
    if (!(field in payload)) continue;
    const value = payload[field];
    if (value !== null && typeof value !== "string") return { error: `${field} must be a string or null` };
    updates[field] = typeof value === "string" && value.trim() ? value.trim() : null;
  }
  if ("check_frequency" in payload) {
    if (typeof payload.check_frequency !== "string" || !VALID_FREQUENCIES.has(payload.check_frequency)) {
      return { error: "check_frequency is invalid" };
    }
    updates.check_frequency = payload.check_frequency as ActivitySourceMapping["check_frequency"];
  }
  if ("last_checked_at" in payload) {
    if (payload.last_checked_at !== null && typeof payload.last_checked_at !== "string") {
      return { error: "last_checked_at must be a timestamp or null" };
    }
    updates.last_checked_at = payload.last_checked_at as string | null;
  }
  if ("season_target" in payload) {
    if (typeof payload.season_target !== "string" || !payload.season_target.trim()) return { error: "season_target is required" };
    updates.season_target = payload.season_target.trim();
  }
  if ("is_core" in payload) {
    if (typeof payload.is_core !== "boolean") return { error: "is_core must be a boolean" };
    updates.is_core = payload.is_core;
  }
  if ("source_category" in payload) {
    if (typeof payload.source_category !== "string" || !VALID_CATEGORIES.has(payload.source_category as ActivitySourceCategory)) {
      return { error: "source_category is invalid" };
    }
    updates.source_category = payload.source_category as ActivitySourceCategory;
  }
  if ("source_scope" in payload) {
    if (typeof payload.source_scope !== "string" || !isActivitySourceScope(payload.source_scope)) {
      return { error: "source_scope is invalid" };
    }
    updates.source_scope = payload.source_scope;
  }
  if ("source_trust" in payload) {
    if (typeof payload.source_trust !== "string" || !VALID_TRUST.has(payload.source_trust as ActivitySourceTrust)) {
      return { error: "source_trust is invalid" };
    }
    updates.source_trust = payload.source_trust as ActivitySourceTrust;
  }
  if ("source_language" in payload) {
    if (typeof payload.source_language !== "string" || !VALID_LANGUAGES.has(payload.source_language as ActivitySourceLanguage)) {
      return { error: "source_language is invalid" };
    }
    updates.source_language = payload.source_language as ActivitySourceLanguage;
  }

  if (Object.keys(updates).length === 0) return { error: "At least one field is required" };
  return { updates };
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) return auth.error;

  const { id } = await params;
  if (!id) return errorResponse("Mapping id is required");

  const parsed = parseUpdates((await request.json()) as Record<string, unknown>);
  if ("error" in parsed) return errorResponse(parsed.error);

  const { data, error } = await auth.supabase
    .from("activity_source_mappings")
    .update(parsed.updates)
    .eq("id", id)
    .select(MAPPING_SELECT)
    .maybeSingle();

  if (error) return errorResponse(error.message, 500);
  if (!data) return errorResponse("Source mapping not found", 404);

  const reclassifyResult = await reclassifyActivitySourcesFromMappings(auth.supabase);
  if (reclassifyResult.error) return errorResponse(reclassifyResult.error.message, 500);

  return NextResponse.json({ mapping: data as ActivitySourceMapping });
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) return auth.error;

  const { id } = await params;
  if (!id) return errorResponse("Mapping id is required");

  const { error } = await auth.supabase.from("activity_source_mappings").delete().eq("id", id);
  if (error) return errorResponse(error.message, 500);

  const reclassifyResult = await reclassifyActivitySourcesFromMappings(auth.supabase);
  if (reclassifyResult.error) return errorResponse(reclassifyResult.error.message, 500);

  return NextResponse.json({ success: true });
}
