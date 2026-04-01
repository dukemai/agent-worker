import { createClient } from "@supabase/supabase-js";
import { ensureGrowingProfile, generateWeeklySuggestions } from "@agent/shared";

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
}

export async function runGrowingSuggestions(env: Env): Promise<void> {
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

  const profile = await ensureGrowingProfile(supabase);
  
  try {
    const suggestions = await generateWeeklySuggestions(supabase, profile);
    console.log(`[Worker] Weekly suggestions generated: ${suggestions.length} items.`);
  } catch (err: any) {
    console.error(`[Worker] Error generating weekly suggestions: ${err.message}`);
  }
}
