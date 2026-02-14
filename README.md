# Dad-Ops Agent

A personal executive assistant that receives emails from Gmail, extracts tasks, and persists them to Supabase. Built with Cloudflare Workers and TypeScript.

## Phase 1: Ingestion MVP (Current)

### Setup

1. **Supabase**
   - Create a project at [supabase.com](https://supabase.com)
   - Run the migration: `supabase/migrations/001_initial.sql` (via Supabase SQL Editor or CLI)
   - Copy Project URL and `service_role` key from Settings → API

2. **Local secrets**
   ```bash
   cp .dev.vars.example .dev.vars
   # Edit .dev.vars with your SUPABASE_URL and SUPABASE_SERVICE_KEY
   ```

3. **Deploy secrets** (for production)
   ```bash
   npx wrangler secret put SUPABASE_URL
   npx wrangler secret put SUPABASE_SERVICE_KEY
   ```

### Run locally

```bash
npm run dev
```

### Test

```bash
# HTTP (fetch handler)
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -d '{"subject":"Test task","body":"Hello","from":"test@example.com"}'
```

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
