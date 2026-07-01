import { NextResponse } from "next/server";
import { normalizeActivitySourceDomain, reclassifyActivitySourcesFromMappings } from "@/lib/activity-source-classifier";
import { isActivitySourceScope } from "@/lib/activity-source-scopes";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import type { ActivitySourceCategory, ActivitySourceLanguage, ActivitySourceMapping, ActivitySourceTrust } from "@/types/database";

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

function parseMappingPayload(payload: {
  source_domain?: unknown;
  source_name?: unknown;
  homepage_url?: unknown;
  activity_listing_url?: unknown;
  gathering_notes?: unknown;
  collection_focus?: unknown;
  collection_instructions?: unknown;
  check_frequency?: unknown;
  last_checked_at?: unknown;
  season_target?: unknown;
  is_core?: unknown;
  source_category?: unknown;
  source_scope?: unknown;
  source_trust?: unknown;
  source_language?: unknown;
}): {
  value: Pick<
    ActivitySourceMapping,
    | "source_domain"
    | "source_name"
    | "homepage_url"
    | "activity_listing_url"
    | "gathering_notes"
    | "collection_focus"
    | "collection_instructions"
    | "check_frequency"
    | "last_checked_at"
    | "season_target"
    | "is_core"
    | "source_category"
    | "source_scope"
    | "source_trust"
    | "source_language"
  >;
} | { error: string } {
  if (typeof payload.source_domain !== "string" || payload.source_domain.trim().length === 0) {
    return { error: "source_domain is required" };
  }
  const sourceDomain = normalizeActivitySourceDomain(payload.source_domain.trim());
  if (!sourceDomain) return { error: "source_domain must be a valid domain" };

  if (payload.source_name !== undefined && payload.source_name !== null && typeof payload.source_name !== "string") {
    return { error: "source_name must be a string or null" };
  }
  for (const field of ["homepage_url", "activity_listing_url"] as const) {
    const value = payload[field];
    if (value !== undefined && value !== null && typeof value !== "string") return { error: `${field} must be a URL or null` };
    if (typeof value === "string" && value.trim()) {
      try {
        const url = new URL(value.trim());
        if (!['http:', 'https:'].includes(url.protocol)) return { error: `${field} must use http or https` };
      } catch {
        return { error: `${field} must be a valid URL` };
      }
    }
  }
  if (payload.gathering_notes !== undefined && payload.gathering_notes !== null && typeof payload.gathering_notes !== "string") {
    return { error: "gathering_notes must be a string or null" };
  }
  for (const field of ["collection_focus", "collection_instructions"] as const) {
    if (payload[field] !== undefined && payload[field] !== null && typeof payload[field] !== "string") {
      return { error: `${field} must be a string or null` };
    }
  }
  if (typeof payload.check_frequency !== "string" || !VALID_FREQUENCIES.has(payload.check_frequency)) {
    return { error: "check_frequency is invalid" };
  }
  if (payload.last_checked_at !== undefined && payload.last_checked_at !== null && typeof payload.last_checked_at !== "string") {
    return { error: "last_checked_at must be a timestamp or null" };
  }
  if (typeof payload.season_target !== "string" || !payload.season_target.trim()) return { error: "season_target is required" };
  if (typeof payload.is_core !== "boolean") return { error: "is_core must be a boolean" };
  if (typeof payload.source_category !== "string" || !VALID_CATEGORIES.has(payload.source_category as ActivitySourceCategory)) {
    return { error: "source_category is invalid" };
  }
  if (typeof payload.source_scope !== "string" || !isActivitySourceScope(payload.source_scope)) {
    return { error: "source_scope is invalid" };
  }
  if (typeof payload.source_trust !== "string" || !VALID_TRUST.has(payload.source_trust as ActivitySourceTrust)) {
    return { error: "source_trust is invalid" };
  }
  if (typeof payload.source_language !== "string" || !VALID_LANGUAGES.has(payload.source_language as ActivitySourceLanguage)) {
    return { error: "source_language is invalid" };
  }

  return {
    value: {
      source_domain: sourceDomain,
      source_name: typeof payload.source_name === "string" && payload.source_name.trim() ? payload.source_name.trim() : null,
      homepage_url: typeof payload.homepage_url === "string" && payload.homepage_url.trim() ? payload.homepage_url.trim() : null,
      activity_listing_url:
        typeof payload.activity_listing_url === "string" && payload.activity_listing_url.trim()
          ? payload.activity_listing_url.trim()
          : null,
      gathering_notes:
        typeof payload.gathering_notes === "string" && payload.gathering_notes.trim() ? payload.gathering_notes.trim() : null,
      collection_focus:
        typeof payload.collection_focus === "string" && payload.collection_focus.trim() ? payload.collection_focus.trim() : null,
      collection_instructions:
        typeof payload.collection_instructions === "string" && payload.collection_instructions.trim()
          ? payload.collection_instructions.trim()
          : null,
      check_frequency: payload.check_frequency as ActivitySourceMapping["check_frequency"],
      last_checked_at: typeof payload.last_checked_at === "string" ? payload.last_checked_at : null,
      season_target: payload.season_target.trim(),
      is_core: payload.is_core,
      source_category: payload.source_category as ActivitySourceCategory,
      source_scope: payload.source_scope,
      source_trust: payload.source_trust as ActivitySourceTrust,
      source_language: payload.source_language as ActivitySourceLanguage,
    },
  };
}

export async function GET() {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) return auth.error;

  const { data, error } = await auth.supabase
    .from("activity_source_mappings")
    .select(MAPPING_SELECT)
    .order("source_name", { ascending: true, nullsFirst: false })
    .order("source_domain", { ascending: true });

  if (error) return errorResponse(error.message, 500);
  return NextResponse.json({ mappings: (data ?? []) as ActivitySourceMapping[] });
}

export async function POST(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) return auth.error;

  const parsed = parseMappingPayload((await request.json()) as Record<string, unknown>);
  if ("error" in parsed) return errorResponse(parsed.error);

  const { data, error } = await auth.supabase
    .from("activity_source_mappings")
    .insert(parsed.value)
    .select(MAPPING_SELECT)
    .single();

  if (error) return errorResponse(error.message, 500);

  const reclassifyResult = await reclassifyActivitySourcesFromMappings(auth.supabase);
  if (reclassifyResult.error) return errorResponse(reclassifyResult.error.message, 500);

  return NextResponse.json({ mapping: data as ActivitySourceMapping }, { status: 201 });
}
