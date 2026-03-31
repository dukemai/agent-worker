/**
 * Shared types for growing ingest / sources (worker + dashboard).
 */

export type GrowingSourceStatus = "queued" | "processing" | "done" | "failed";

export interface GrowingSourceRow {
  id: string;
  url: string;
  title: string | null;
  channel: string | null;
  description: string | null;
  source_type: string | null;
  status: GrowingSourceStatus;
  transcript: string | null;
  source_language: string | null;
}

export interface GrowingProfile {
  id: string;
  city: string;
  country_code: string;
  space_type: string;
  experience_level: string;
  interests: string[];
}
