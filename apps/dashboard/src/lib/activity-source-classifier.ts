import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ActivitySourceCategory,
  ActivitySourceLanguage,
  ActivitySourceTrust,
} from "@/types/database";

export type ActivitySourceClassification = {
  source_domain: string | null;
  source_name: string | null;
  source_category: ActivitySourceCategory;
  source_scope: string;
  source_trust: ActivitySourceTrust;
  source_language: ActivitySourceLanguage;
};

type KnownSource = Omit<ActivitySourceClassification, "source_domain">;
export type ActivitySourceMapping = ActivitySourceClassification & {
  source_domain: string;
};

const KNOWN_SOURCES: Record<string, KnownSource> = {
  "visitstockholm.se": {
    source_name: "Visit Stockholm",
    source_category: "official_city",
    source_scope: "stockholm_city",
    source_trust: "official",
    source_language: "mixed",
  },
  "upplevjarfalla.se": {
    source_name: "Upplev Järfälla",
    source_category: "municipality",
    source_scope: "jarfalla",
    source_trust: "official",
    source_language: "sv",
  },
};

export function getKnownActivitySourceMappings(): ActivitySourceMapping[] {
  return Object.entries(KNOWN_SOURCES)
    .map(([source_domain, source]) => ({ source_domain, ...source }))
    .sort((a, b) => (a.source_name ?? a.source_domain).localeCompare(b.source_name ?? b.source_domain));
}

export function normalizeActivitySourceDomain(value: string): string | null {
  try {
    const url = value.includes("://") ? value : `https://${value}`;
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function lookupKnownSource(domain: string | null): KnownSource | null {
  if (!domain) return null;
  if (KNOWN_SOURCES[domain]) return KNOWN_SOURCES[domain];

  const match = Object.entries(KNOWN_SOURCES).find(([knownDomain]) => domain === knownDomain || domain.endsWith(`.${knownDomain}`));
  return match?.[1] ?? null;
}

function humanizeDomain(domain: string | null): string | null {
  if (!domain) return null;
  const stem = domain.split(".")[0];
  return stem
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function classifyActivitySource(sourceUrl: string | null): ActivitySourceClassification {
  const domain = sourceUrl ? normalizeActivitySourceDomain(sourceUrl) : null;
  const known = lookupKnownSource(domain);
  if (known) {
    return { source_domain: domain, ...known };
  }

  return {
    source_domain: domain,
    source_name: humanizeDomain(domain),
    source_category: "unknown",
    source_scope: "unknown",
    source_trust: "unknown",
    source_language: "unknown",
  };
}

function lookupMapping(domain: string | null, mappings: ActivitySourceMapping[]): ActivitySourceMapping | null {
  if (!domain) return null;
  return mappings.find((mapping) => domain === mapping.source_domain || domain.endsWith(`.${mapping.source_domain}`)) ?? null;
}

export function classifyActivitySourceWithMappings(
  sourceUrl: string | null,
  mappings: ActivitySourceMapping[]
): ActivitySourceClassification {
  const domain = sourceUrl ? normalizeActivitySourceDomain(sourceUrl) : null;
  const mapping = lookupMapping(domain, mappings);
  if (mapping) {
    return {
      source_domain: domain,
      source_name: mapping.source_name,
      source_category: mapping.source_category,
      source_scope: mapping.source_scope,
      source_trust: mapping.source_trust,
      source_language: mapping.source_language,
    };
  }

  return {
    source_domain: domain,
    source_name: humanizeDomain(domain),
    source_category: "unknown",
    source_scope: "unknown",
    source_trust: "unknown",
    source_language: "unknown",
  };
}

export async function fetchActivitySourceMappingsForClassification(
  supabase: SupabaseClient
): Promise<ActivitySourceMapping[]> {
  const { data, error } = await supabase
    .from("activity_source_mappings")
    .select("source_domain, source_name, source_category, source_scope, source_trust, source_language")
    .order("source_name", { ascending: true, nullsFirst: false });

  if (error) return getKnownActivitySourceMappings();
  return (data ?? []) as ActivitySourceMapping[];
}

export async function classifyActivitySourceFromDatabase(
  supabase: SupabaseClient,
  sourceUrl: string | null
): Promise<ActivitySourceClassification> {
  const mappings = await fetchActivitySourceMappingsForClassification(supabase);
  return classifyActivitySourceWithMappings(sourceUrl, mappings);
}

export async function reclassifyActivitySourcesFromMappings(supabase: SupabaseClient) {
  const mappings = await fetchActivitySourceMappingsForClassification(supabase);
  const { data, error } = await supabase.from("activity_sources").select("id, source_url");
  if (error) return { error };

  for (const source of data ?? []) {
    await supabase
      .from("activity_sources")
      .update(classifyActivitySourceWithMappings(source.source_url, mappings))
      .eq("id", source.id);
  }

  return { error: null };
}
