import { NextResponse } from "next/server";
import { normalizeActivitySourceDomain, reclassifyActivitySourcesFromMappings } from "@/lib/activity-source-classifier";
import { isActivitySourceScope } from "@/lib/activity-source-scopes";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import type { ActivitySourceCategory, ActivitySourceLanguage, ActivitySourceMapping, ActivitySourceTrust } from "@/types/database";

type Params = { params: Promise<{ id: string }> };

const MAPPING_SELECT =
  "id, source_domain, source_name, source_category, source_scope, source_trust, source_language, created_at, updated_at";
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
