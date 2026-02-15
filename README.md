# Dad-Ops Agent

A personal executive assistant that receives emails from Gmail, extracts tasks, and persists them to Supabase. Built with Cloudflare Workers and TypeScript.

## Phase 2: Intelligence (Current)

Gemini 2.5 Flash extracts tasks from email content and classifies them into today/this_week/later. Without `GEMINI_API_KEY`, tasks default to `later_tasks` (Phase 1 behavior).

## Phase 1: Ingestion MVP

### Setup

1. **Supabase**
   - Create a project at [supabase.com](https://supabase.com)
   - Run the migration: `supabase/migrations/001_initial.sql` (via Supabase SQL Editor or CLI)
   - Copy Project URL and `service_role` key from Settings → API

2. **Local secrets**
   ```bash
   cp .dev.vars.example .dev.vars
   # Edit .dev.vars with SUPABASE_URL, SUPABASE_SERVICE_KEY, GEMINI_API_KEY
   # Get GEMINI_API_KEY from https://aistudio.google.com/apikey
   ```

3. **Deploy secrets** (for production)
   ```bash
   npx wrangler secret put SUPABASE_URL
   npx wrangler secret put SUPABASE_SERVICE_KEY
   npx wrangler secret put GEMINI_API_KEY
   ```

### Run locally

```bash
npm run dev
```

### Test

```bash
# With fixture (Vklass school email)
./scripts/test-fixture.sh vklass-utvecklingssamtal

# Or with curl directly
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -d @fixtures/emails/vklass-utvecklingssamtal.json
```

Verify in Supabase Table Editor: new row in `tasks` and in the bucket table (today/this_week/later) based on Gemini's classification.

**Promotion filtering:** Set `family_context` to match promotions:
```sql
INSERT INTO family_context (key, value) VALUES
  ('shopping_list', 'helmet for kid, winter boots'),
  ('seasonal_interests', 'garden, outdoor')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, last_updated = NOW();
```
Promotions from XXL, Stadium, Clas Ohlson are only saved when they match these interests.

### Deploy

```bash
npm run deploy
```

Then in Cloudflare Dashboard → Email Routing: create custom address `agent@yourdomain.com` → Action: "Send to a Worker" → select this Worker.

## Project structure

- `src/index.ts` – Worker entry (email + fetch handlers)
- `src/prompts/` – System prompts for Phase 2+ (Gemini)
- `supabase/migrations/` – SQL schema
- `plan/` – Project spec
- `.cursor/plans/` – Implementation plan
