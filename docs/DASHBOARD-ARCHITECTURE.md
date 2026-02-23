# Dashboard App — Architecture

The dashboard is the main UI for Dad-Ops: tasks, renewals, learning, family context, and growing season suggestions. It talks to Supabase only; the Cloudflare Worker is a separate service (email, cron, optional HTTP for manual triggers).

See the [top-level architecture](ARCHITECTURE.md) for how the dashboard fits into the full system.

## Stack

| Concern | Choice |
|--------|--------|
| Framework | Next.js 16 (App Router) on Vercel |
| UI | shadcn/ui + Tailwind CSS v4 |
| Data & cache | TanStack Query (`useQuery` / `useMutation`) |
| Auth & DB | Supabase (anon key, RLS) |

## Directory Layout

```
dashboard/src/
├── app/                    # App Router: pages + API routes
│   ├── api/                 # API routes (server-side, auth-aware)
│   │   ├── auth/            # Auth callback
│   │   ├── context/         # Family context CRUD
│   │   ├── growing/         # Growing: sources, knowledge, weekly, profile, convert
│   │   ├── learning/        # Learning profiles, feedback, log
│   │   ├── reminders/      # Renewal reminders
│   │   └── tasks/          # Tasks + bucket moves
│   ├── auth/                # Auth confirm/callback pages
│   ├── context/             # Context page
│   ├── growing/             # Growing page
│   ├── learning/            # Learning page
│   ├── login/               # Login page
│   ├── layout.tsx           # Root layout (QueryClientProvider, etc.)
│   └── page.tsx             # Home = tasks dashboard
├── components/
│   ├── dashboard/           # Feature dashboards + shared (header, sign-out)
│   └── ui/                  # shadcn primitives
├── lib/
│   ├── api.ts               # getAuthedSupabase, errorResponse, parseIsoDate
│   ├── growing-api.ts       # Client-side growing API (fetch wrappers)
│   ├── buckets.ts           # Bucket helpers
│   └── supabase/            # Server client, browser client, middleware, env
└── types/
    └── database.ts          # Supabase/DB types
```

## Routing

- **Pages**: File-based under `app/`. Each main feature has a page (`page.tsx`) that renders a dashboard component.
- **API**: Same App Router; routes live under `app/api/`. Method is determined by the exported handler (`GET`, `POST`, `PATCH`, `DELETE`). Dynamic segments use `[id]` or `[key]` folders.

| Route | Page | Main API surface |
|-------|------|------------------|
| `/` | Tasks | `GET/POST /api/tasks`, `POST /api/tasks/[id]/move` |
| `/learning` | Learning | `GET/POST /api/learning/profiles`, feedback, log |
| `/context` | Context | `GET/PUT /api/context`, `GET/PUT /api/context/[key]` |
| `/growing` | Growing | `GET/POST /api/growing/sources`, `GET /api/growing/knowledge`, `GET /api/growing/weekly`, profile, convert, process |

## Auth

- **Supabase Auth** with anon key; RLS restricts rows by authenticated user.
- **Server-side**: `getAuthedSupabase()` in `lib/api.ts` creates a Supabase client and calls `getUser()`. API routes use it and return 401 when unauthenticated.
- **Middleware**: `lib/supabase/middleware.ts` refreshes the session and protects routes (e.g. redirect unauthenticated users from `/` to `/login`).
- **Client**: Supabase browser client for client components; server client for API routes and server components.

## Data Flow

1. **UI** → TanStack Query (`useQuery` / `useMutation`) in dashboard components.
2. **Query/Mutation** → `fetch("/api/...")` (relative; same origin). Feature-specific helpers live in `lib/growing-api.ts` for growing; other features call API routes directly or via small wrappers.
3. **API route** → `getAuthedSupabase()` then Supabase client (`.from(...).select()`, `.insert()`, etc.). No direct DB URL/keys in the client.
4. **Supabase** → PostgreSQL with RLS; only rows allowed by policies are returned.

Manual “process” flows (e.g. growing extract) go Dashboard → API route → HTTP call to Worker (`GROWING_WORKER_URL`) → Worker → Supabase.

## Feature Areas

- **Tasks**: Buckets (today / this week / later), renewals; move between buckets via `/api/tasks/[id]/move`.
- **Learning**: Profiles, lesson log, feedback; stored in Supabase with RLS.
- **Context**: Key-value store for family context; CRUD via `/api/context` and `/api/context/[key]`.
- **Growing**: Sources (YouTube URLs), knowledge library, weekly suggestions, profile; optional `GROWING_WORKER_URL` for manual extraction.

## Environment

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full list. Dashboard-specific:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — required for auth and data.
- `GROWING_WORKER_URL` — optional; base URL of the Worker for “Extract now” (growing sources).

Setup and run instructions: [Dashboard README](../dashboard/README.md).
