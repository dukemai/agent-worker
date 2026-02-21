# Dad-Ops Agent

Personal executive assistant that captures emails, extracts tasks, and delivers a daily digest. Built for a busy dad in Stockholm.

**Stack**: Cloudflare Workers · Gemini 2.5 Flash · Supabase · Next.js · Resend

## Quick Start

### Worker (email processing + daily digest)

```bash
cp .dev.vars.example .dev.vars
# Fill in: SUPABASE_URL, SUPABASE_SERVICE_KEY, GEMINI_API_KEY, RESEND_API_KEY, OPENWEATHER_API_KEY
npm install
npm run dev
```

Test with a fixture:

```bash
./scripts/test-fixture.sh vklass-utvecklingssamtal
```

Deploy:

```bash
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_KEY
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put OPENWEATHER_API_KEY
npm run deploy
```

### Dashboard (Next.js)

```bash
cd dashboard
cp env.local.example .env.local
# Fill in: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev
```

### Database

Run migrations in order via Supabase SQL Editor or CLI:

```
supabase/migrations/001_initial.sql
supabase/migrations/002_family_context.sql
supabase/migrations/003_rls_policies.sql
supabase/migrations/004_learning_profile_type.sql
supabase/migrations/005_growing_ops.sql
```

## Project Structure

```
src/              Worker source (email + cron handlers)
src/prompts/      Gemini system prompts
dashboard/        Next.js dashboard app
supabase/         Database migrations
fixtures/         Test email fixtures
docs/             Project documentation
  SPEC.md         Product specification
  ARCHITECTURE.md System design and tech stack
  ROADMAP.md      Phase status overview
  DECISIONS.md    Decision log
  phases/         Per-phase scope and retrospectives
```

## Docs

Full documentation lives in [`docs/`](docs/):
- [Spec](docs/SPEC.md) — what this project does and why
- [Architecture](docs/ARCHITECTURE.md) — how it's built
- [Roadmap](docs/ROADMAP.md) — what's done and what's next
- [Decisions](docs/DECISIONS.md) — why we chose X over Y
