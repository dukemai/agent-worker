# Dad-Ops Agent — Architecture

## Tech Stack

| Layer | Tool | Rationale |
|-------|------|-----------|
| Worker / Backend | Cloudflare Workers (ESM) | Serverless, handles email routing natively, cron triggers built-in |
| Intelligence | Google Gemini 2.5 Flash | Massive context window, JSON mode, high speed, low cost |
| Database | Supabase (PostgreSQL + JSONB) | Managed Postgres, built-in auth with RLS, real-time capable |
| Dashboard | Next.js 16 (App Router) + Vercel | SSR/SSG, file-based routing, deploys via Git push |
| UI Components | shadcn/ui + Tailwind CSS v4 | Accessible primitives, mobile-first utility classes |
| Data Fetching | TanStack Query | Cache, invalidation, mutations with consistent patterns |
| Email Delivery | Resend | Simple API, good deliverability, no SMTP setup |
| Weather | OpenWeather API | Free tier covers daily forecast for single city |

## Monorepo and shared package

The repo is an npm workspace monorepo. Shared types and logic live in a single internal package so the Worker and the Dashboard stay in sync and can reuse the same prompts, Gemini helpers, and task/digest types.

### Repo layout

```
agent-worker/
├── apps/
│   ├── worker/          # Cloudflare Worker (wrangler, cron, email, fetch)
│   └── dashboard/       # Next.js app (Vercel)
├── packages/
│   └── shared/          # @agent/shared — types, prompts, Gemini, email/task logic
├── supabase/            # Migrations
├── docs/                 # This doc, decisions, requirements
├── package.json          # Workspace root, dev/deploy scripts
├── tsconfig.json         # Paths: @agent/shared → packages/shared/src
├── turbo.json
└── wrangler.toml
```

### Shared package (`@agent/shared`)

Consumed by both the Worker and the Dashboard via the workspace dependency and TypeScript path `@agent/shared` → `packages/shared/src`.

| Area | Contents | Used by |
|------|----------|---------|
| **types/** | `digest`, `growing`, `email-content` — Task, BucketRow, PromotionDigestItem, GrowingSourceRow, BuiltEmailContent, etc. | Worker crons/handlers, Dashboard (when building digest/growing UI or email preview) |
| **prompts/** | `TASK_EXTRACTION`, `DAILY_BRIEFING`, `LEARNING_LESSON`, `GROWING_KNOWLEDGE_EXTRACTION` | Worker (process-email-task, daily-digest, learning-loop, growing-ingest) |
| **email/** | `promotion-content` — `buildTaskContentFromExtraction`, `buildFallbackTaskContent` (promotion vs normal task from extraction) | Worker process-email-task; Dashboard (e.g. email preview) |
| **gemini.ts** | `getTaskExtractionFromEmail`, `extractGrowingKnowledge` + extraction result types | Worker process-email-task, growing-ingest |
| **fetch-pending-tasks.ts** | `fetchPendingTasksForBucket(supabase, bucketTable)` | Worker daily-digest; Dashboard (e.g. digest preview) |

All of the above are re-exported from `packages/shared/src/index.ts`. The Worker imports from `@agent/shared`; the Dashboard can do the same once wired (e.g. for email-preview or digest helpers).

### Worker app layout

```
apps/worker/src/
├── index.ts              # Entry: scheduled, email, fetch → delegates to handlers
├── handlers/
│   ├── scheduled.ts      # Cron: growing suggestions (Sun/Wed) or ingest + digest (daily)
│   ├── email.ts          # Parse incoming email → processEmailTask
│   └── fetch/
│       ├── index.ts       # Route by path/method
│       ├── run-growing-suggestions.ts
│       ├── run-digest.ts
│       ├── run-recipe-import-queue.ts
│       ├── run-activity-source-queue.ts
│       ├── process-growing.ts
│       └── post-task.ts   # Generic POST { subject, body, from } → processEmailTask
├── crons/
│   ├── daily-digest.ts   # Fetch tasks, weather, runLearningLoop, build email, Resend
│   ├── growing-ingest.ts # Queued growing_sources → Gemini → growing_knowledge + windows
│   ├── growing-suggestions.ts
│   ├── recipe-import-queue.ts # Queued recipe markdown → saved_recipes
│   ├── activity-source-queue.ts # Queued activity Markdown → local + seasonal activities
│   └── learning-loop.ts
├── lib/
│   ├── process-email-task.ts  # Orchestrates Gemini extraction + @agent/shared promotion-content + Supabase insert
│   ├── weather.ts
│   ├── resend.ts
│   └── youtube.ts
└── types/
    ├── env.ts            # Env (EMAIL, Supabase, Gemini, Resend, etc.)
    └── database.ts       # Supabase table types for worker-only tables
```

Routing is split by handler (scheduled, email, fetch); fetch routes live in `handlers/fetch/` and are dispatched from `handlers/fetch/index.ts`.

## System Diagram

```
Gmail
  ├─ Filters ──────────────┐
  └─ Label → Apps Script ──┤
                           ▼
                  Cloudflare Email Routing
                           │
                           ▼
                  Cloudflare Worker (apps/worker)
                    ├─ handlers/scheduled  (cron)
                    ├─ handlers/email      (SMTP parse → processEmailTask)
                    └─ handlers/fetch      (POST routes: digest, growing, task)
                           │
               ┌───────────┼───────────┐
               ▼           ▼           ▼
     @agent/shared      postal-mime   OpenWeather
     (prompts, gemini,  (parse)       (forecast)
      email, types)
               │           │           │
               └─────┬─────┘           │
                     ▼                 │
                  Supabase             │
              (tasks, buckets,         │
               learning, context,     │
               growing)                │
                     │                 │
          ┌──────────┴──────────┐      │
          ▼                     ▼      ▼
    Next.js Dashboard      Daily Digest Email
    (apps/dashboard)       (Resend)
```

## Integration Points

| Integration | Trigger | Direction |
|-------------|---------|-----------|
| Gmail → Worker | Email forwarding / Apps Script | Inbound |
| Worker → Supabase | Every email processed | Write |
| Worker → Gemini | Task extraction, lesson generation, digest narrative | Request/Response |
| Worker → OpenWeather | Daily digest cron | Request/Response |
| Worker → Resend | Daily digest cron | Outbound email |
| Worker → Supabase | Growing suggestions cron (Sun, Wed) | Write `growing_suggestions_log` |
| Worker → Supabase | Recipe import queue cron/manual trigger | Read `recipe_import_queue`, write `saved_recipes` |
| Worker → Supabase | Daily activity source queue/manual trigger | Read `activity_sources`, write `local_activities` + `seasonal_activity_instances` |
| Dashboard → Supabase | Every API route | Read/Write |

## Environment Variables

### Worker (`.dev.vars`)

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Service role key (bypasses RLS) |
| `GEMINI_API_KEY` | Google AI Studio API key |
| `RESEND_API_KEY` | Resend email delivery |
| `DIGEST_RECIPIENT_EMAIL` | Daily digest recipient |
| `OPENWEATHER_API_KEY` | Weather forecast for Stockholm |
| `WORKER_ADMIN_TOKEN` | Bearer token for protected manual worker routes such as `/run-recipe-import-queue` and `/run-activity-source-queue` |

### Dashboard (`.env.local`)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (RLS-aware) |

## Dashboard App

For the dashboard’s architecture (directory layout, routing, auth, data flow, feature areas), see **[Dashboard architecture](DASHBOARD-ARCHITECTURE.md)**. For setup and run instructions, see [Dashboard README](../dashboard/README.md).

## Key Design Decisions

- **Stateless Worker**: No in-memory state between requests. All persistence via Supabase.
- **Single shared package**: All cross-app types, prompts, Gemini calls, and email/task content logic live in `@agent/shared`. Worker and Dashboard depend on it; no separate “tasks” package.
- **Bucket tables**: Separate `today_tasks` / `this_week_tasks` / `later_tasks` tables with FK to `tasks`, not a column. Enables fast bucket queries without filtering.
- **Metadata convention**: Features like renewals and growing use `tasks.metadata` JSONB instead of separate tables. Reduces schema surface while keeping task-centric ops.
- **RLS everywhere**: All tables have Row Level Security enabled with authenticated full-access policies.

For the full decision log, see [DECISIONS.md](DECISIONS.md).
