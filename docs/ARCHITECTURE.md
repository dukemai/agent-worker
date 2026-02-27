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

## System Diagram

```
Gmail
  ├─ Filters ──────────────┐
  └─ Label → Apps Script ──┤
                           ▼
                  Cloudflare Email Routing
                           │
                           ▼
                  Cloudflare Worker (src/index.ts)
                    ├─ email handler (SMTP parse)
                    ├─ fetch handler (POST for testing)
                    └─ scheduled handler (cron)
                           │
               ┌───────────┼───────────┐
               ▼           ▼           ▼
          postal-mime   Gemini AI   OpenWeather
          (parse)      (extract)    (forecast)
               │           │           │
               └─────┬─────┘           │
                     ▼                 │
                  Supabase             │
              (tasks, buckets,         │
               learning, context,      │
               growing)                │
                     │                 │
          ┌──────────┴──────────┐      │
          ▼                     ▼      ▼
    Next.js Dashboard      Daily Digest Email
    (Vercel)               (Resend)
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

### Dashboard (`.env.local`)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (RLS-aware) |

## Dashboard App

For the dashboard’s architecture (directory layout, routing, auth, data flow, feature areas), see **[Dashboard architecture](DASHBOARD-ARCHITECTURE.md)**. For setup and run instructions, see [Dashboard README](../dashboard/README.md).

## Key Design Decisions

- **Stateless Worker**: No in-memory state between requests. All persistence via Supabase.
- **Bucket tables**: Separate `today_tasks` / `this_week_tasks` / `later_tasks` tables with FK to `tasks`, not a column. Enables fast bucket queries without filtering.
- **Metadata convention**: Features like renewals and growing use `tasks.metadata` JSONB instead of separate tables. Reduces schema surface while keeping task-centric ops.
- **RLS everywhere**: All tables have Row Level Security enabled with authenticated full-access policies.

For the full decision log, see [DECISIONS.md](DECISIONS.md).
