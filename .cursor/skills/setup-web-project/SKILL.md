---
name: setup-web-project
description: Scaffolds a new web project with the standard stack (Next.js, Supabase, shadcn/ui, TanStack Query, TypeScript). Use when creating a new web app, dashboard, or web-based tool from scratch.
---

# Web Project Setup

Standard setup for web projects. Follow this skill when scaffolding a new web app from scratch.

## Stack

| Layer | Tool | Notes |
|-------|------|-------|
| Framework | Next.js (App Router) | Latest stable version |
| Language | TypeScript | Strict mode enabled |
| Styling | Tailwind CSS v4 + shadcn/ui | Use shadcn CLI to add components |
| Data fetching | TanStack Query | Wrap app in QueryProvider |
| Database | Supabase (PostgreSQL) | Auth + RLS + migrations |
| Deployment | Vercel | Connect via GitHub repo |

## Scaffold Steps

### 1. Create the Next.js app

```bash
npx create-next-app@latest <app-name> \
  --typescript --tailwind --eslint --app --src-dir \
  --import-alias "@/*"
```

### 2. Initialize shadcn/ui

```bash
cd <app-name>
npx shadcn@latest init
```

Add commonly used components upfront:

```bash
npx shadcn@latest add button card input tabs badge
```

### 3. Install core dependencies

```bash
npm install @tanstack/react-query @supabase/supabase-js @supabase/ssr
```

### 4. Project structure

```
<app-name>/
├── src/
│   ├── app/                     # Next.js App Router pages + API routes
│   │   ├── layout.tsx           # Root layout (wraps QueryProvider)
│   │   ├── page.tsx             # Home page
│   │   ├── login/page.tsx       # Auth page
│   │   └── api/                 # API route handlers
│   ├── components/
│   │   ├── ui/                  # shadcn/ui primitives (button, card, etc.)
│   │   ├── providers/
│   │   │   └── query-provider.tsx  # TanStack QueryClientProvider
│   │   └── <feature>/           # Feature-specific components
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts        # Browser Supabase client
│   │   │   ├── server.ts        # Server Supabase client (cookies)
│   │   │   ├── middleware.ts    # Session refresh logic
│   │   │   └── env.ts           # Environment variable reader
│   │   ├── api.ts               # Shared API helpers (getAuthedSupabase, errorResponse)
│   │   └── utils.ts             # General utilities (cn, etc.)
│   └── types/
│       └── database.ts          # Shared TypeScript types for DB entities
├── supabase/
│   └── migrations/              # Numbered SQL migration files
├── .env.local                   # NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
└── .env.local.example           # Template for required env vars
```

### 5. Configure TypeScript strict mode

Ensure `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### 6. Set up Supabase auth

Create the Supabase client files under `src/lib/supabase/`:
- `client.ts` — browser client using `createBrowserClient`
- `server.ts` — server client using `createServerClient` with cookie handling (wrap `setAll` in try/catch for Server Component compatibility)
- `middleware.ts` — session refresh in Next.js middleware
- `env.ts` — read `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 7. Set up TanStack Query provider

Create `src/components/providers/query-provider.tsx`:
- Client component (`"use client"`)
- Initialize `QueryClient` with `useState` (prevents SSR re-creation)
- Default `staleTime: 30s`, `refetchOnWindowFocus: false`

Wrap children in root `layout.tsx`:
```tsx
<QueryProvider>{children}</QueryProvider>
```

### 8. Create .env.local.example

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 9. Set up docs structure

Follow the [organize-documents](../.cursor/skills/organize-documents/SKILL.md) skill:
- Create `docs/SPEC.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/DECISIONS.md`
- Replace boilerplate README with project-specific content
- Create `docs/phases/01-<first-phase>/SCOPE.md`

## Conventions

### API routes

- Place under `src/app/api/<resource>/route.ts`
- Use `getAuthedSupabase()` helper for authenticated endpoints
- Return `{ error: string }` on failure, typed response on success
- Validate all input before database operations

### Data fetching in components

- Use `useQuery` for reads, `useMutation` for writes
- Define `queryFn` as standalone async functions outside the component
- Invalidate related queries in mutation `onSuccess`

### Database

- One migration file per feature: `supabase/migrations/NNN_<name>.sql`
- Enable RLS on every new table
- Define types in `src/types/database.ts`

### Styling

- Mobile-first: design for 375px, scale up with `md:` / `lg:` breakpoints
- Touch targets: `min-h-11` on all interactive elements
- Use shadcn/ui components before building custom ones

## Pre-flight Checklist

Before first deploy, verify:

- [ ] `npm run build` succeeds with no errors
- [ ] `npx tsc --noEmit` passes
- [ ] `.env.local.example` documents all required variables
- [ ] README has project-specific quick start (not boilerplate)
- [ ] Supabase migrations are committed and applied
- [ ] RLS is enabled on all tables
