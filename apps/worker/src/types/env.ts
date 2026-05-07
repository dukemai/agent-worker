import type { Fetcher } from "@cloudflare/workers-types";

export interface Env {
  EMAIL: Fetcher;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  GEMINI_API_KEY?: string;
  RESEND_API_KEY?: string;
  DIGEST_RECIPIENT_EMAIL?: string;
  OPENWEATHER_API_KEY?: string;
  WORKER_ADMIN_TOKEN?: string;
}
