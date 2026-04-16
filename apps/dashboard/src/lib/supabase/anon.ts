import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env";

/** Server-only anon client (no cookies). Use for SECURITY DEFINER RPCs safe for anonymous callers. */
export function createAnonSupabase() {
  const { url, anonKey } = getSupabaseEnv();
  return createClient(url, anonKey);
}
