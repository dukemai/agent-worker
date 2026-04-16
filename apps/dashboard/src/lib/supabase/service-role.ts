import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/env";

/** True when the env accidentally reuses the anon/publishable key as the service role key. */
export function isServiceRoleKeySameAsAnonKey(): boolean {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const a = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return Boolean(k && a && k === a);
}

/**
 * Server-only client with elevated access. Never import from client components.
 * Used for scoped public reads (e.g. shared cookbook) when RLS would block anon.
 */
export function createServiceRoleClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) {
    return null;
  }
  if (isServiceRoleKeySameAsAnonKey()) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[supabase] SUPABASE_SERVICE_ROLE_KEY matches the anon key. " +
          "Use the service_role secret from Supabase Dashboard → Project Settings → API (not publishable/anon).",
      );
    }
    return null;
  }
  const { url } = getSupabaseEnv();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
