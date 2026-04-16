# Dad-Ops Dashboard

Next.js app for managing daily tasks, renewal reminders, learning profiles, family context, and growing season suggestions.

## Setup

```bash
cp env.local.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Stack

- **Next.js 16** (App Router) on Vercel
- **shadcn/ui** + Tailwind CSS v4
- **TanStack Query** for data fetching and mutations
- **Supabase** Auth (anon key, RLS-aware)

## Pages

| Route | Description |
|-------|-------------|
| `/` | Tasks dashboard (Today / This Week / Later + Renewals) |
| `/learning` | Learning profiles and lesson log |
| `/context` | Family context key-value editor |
| `/growing` | Stockholm growing season suggestions |
| `/login` | Supabase Auth login |
| `/cookbook` | **Public** read-only recipe list (search, filters, recipe view, cooking mode) — requires env (see below) |

### Shared cookbook (friends)

1. Set `COOKBOOK_PUBLIC_USER_ID` to your Supabase `auth.users` UUID and `SUPABASE_SERVICE_ROLE_KEY` (server-only).
2. Optional: `NEXT_PUBLIC_COOKBOOK_TITLE`, `NEXT_PUBLIC_COOKBOOK_SUBTITLE`, `NEXT_PUBLIC_COOKBOOK_FEEDBACK_EMAIL` for branding and a mailto link in the footer.
3. Share the site URL + `/cookbook`. Anyone with the link can browse; raw `source_markdown` is not exposed in the public API.

## Key Patterns

- API routes in `src/app/api/` proxy to Supabase with server-side auth
- All data fetching uses `useQuery` / `useMutation` from TanStack Query
- Mobile-first layout: tabs on small screens, grid on desktop
- Supabase SSR client wraps `setAll` in try/catch for Server Component compatibility
