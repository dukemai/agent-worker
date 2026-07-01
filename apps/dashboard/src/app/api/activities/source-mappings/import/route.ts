import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { normalizeActivitySourceDomain, reclassifyActivitySourcesFromMappings } from "@/lib/activity-source-classifier";
import { isActivitySourceScope } from "@/lib/activity-source-scopes";

const CATEGORIES = new Set(["official_city", "municipality", "museum", "library", "event_platform", "venue", "blog", "community", "unknown"]);
const TRUST = new Set(["official", "partner", "community", "unknown"]);
const LANGUAGES = new Set(["sv", "en", "mixed", "unknown"]);
const FREQUENCIES = new Set(["weekly", "monthly", "seasonal"]);

function optionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function optionalUrl(value: unknown, field: string): { value: string | null } | { error: string } {
  const text = optionalText(value);
  if (!text) return { value: null };
  try {
    const url = new URL(text);
    if (url.protocol !== "http:" && url.protocol !== "https:") return { error: `${field} must use http or https` };
    return { value: text };
  } catch {
    return { error: `${field} must be a valid URL` };
  }
}

function parseRow(
  value: unknown,
  index: number,
  defaultSeason: string
): { value: Record<string, unknown> } | { error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { error: `sources[${index}] must be an object` };
  const row = value as Record<string, unknown>;
  const homepage = optionalUrl(row.homepage_url, `sources[${index}].homepage_url`);
  if ("error" in homepage) return homepage;
  const listing = optionalUrl(row.activity_listing_url, `sources[${index}].activity_listing_url`);
  if ("error" in listing) return listing;
  const domainInput = optionalText(row.source_domain) ?? homepage.value ?? listing.value;
  const domain = domainInput ? normalizeActivitySourceDomain(domainInput) : null;
  if (!domain) return { error: `sources[${index}].source_domain or a valid URL is required` };

  const category = optionalText(row.source_category) ?? "unknown";
  const trust = optionalText(row.source_trust) ?? "official";
  const language = optionalText(row.source_language) ?? "sv";
  const frequency = optionalText(row.check_frequency) ?? "weekly";
  const scope = optionalText(row.source_scope) ?? "unknown";
  if (!CATEGORIES.has(category)) return { error: `sources[${index}].source_category is invalid` };
  if (!TRUST.has(trust)) return { error: `sources[${index}].source_trust is invalid` };
  if (!LANGUAGES.has(language)) return { error: `sources[${index}].source_language is invalid` };
  if (!FREQUENCIES.has(frequency)) return { error: `sources[${index}].check_frequency is invalid` };
  if (!isActivitySourceScope(scope)) return { error: `sources[${index}].source_scope is invalid` };

  return {
    value: {
      source_domain: domain,
      source_name: optionalText(row.source_name),
      homepage_url: homepage.value,
      activity_listing_url: listing.value,
      gathering_notes: optionalText(row.gathering_notes),
      collection_focus: optionalText(row.collection_focus),
      collection_instructions: optionalText(row.collection_instructions),
      check_frequency: frequency,
      last_checked_at: null,
      season_target: optionalText(row.season_target) ?? defaultSeason,
      is_core: typeof row.is_core === "boolean" ? row.is_core : true,
      source_category: category,
      source_scope: scope,
      source_trust: trust,
      source_language: language,
    },
  };
}

export async function POST(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) return auth.error;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return errorResponse("File must contain valid JSON");
  }
  const wrapper = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : null;
  const rows = Array.isArray(payload) ? payload : wrapper?.sources;
  if (!Array.isArray(rows) || rows.length === 0) return errorResponse("JSON must be an array or an object with a non-empty sources array");
  if (rows.length > 100) return errorResponse("A maximum of 100 directory sources can be imported at once");
  const defaultSeason = optionalText(wrapper?.season_target) ?? "summer_2026";

  const parsedRows: Array<Record<string, unknown>> = [];
  for (let index = 0; index < rows.length; index += 1) {
    const parsed = parseRow(rows[index], index, defaultSeason);
    if ("error" in parsed) return errorResponse(parsed.error);
    parsedRows.push(parsed.value);
  }

  const { data, error } = await auth.supabase
    .from("activity_source_mappings")
    .upsert(parsedRows, { onConflict: "source_domain" })
    .select("id, source_domain");
  if (error) return errorResponse(error.message, 500);

  const reclassifyResult = await reclassifyActivitySourcesFromMappings(auth.supabase);
  if (reclassifyResult.error) return errorResponse(reclassifyResult.error.message, 500);
  return NextResponse.json({ imported: data?.length ?? parsedRows.length, domains: parsedRows.map((row) => row.source_domain) });
}
