# Phase 3: Dashboard UI — Retrospective

## What went well

- shadcn/ui + Tailwind CSS provides a clean, accessible UI with minimal custom styling.
- Supabase Auth with `@supabase/ssr` handles session management across server/client components.
- API routes pattern (Next.js Route Handlers) keeps data fetching clean.

## What could be better

- Initial data fetching used manual `useEffect` + `fetch` patterns — became verbose as features grew (fixed in Phase 5 with TanStack Query).
- Supabase SSR cookie handling in Server Components required a try/catch workaround for `setAll`.

## Lessons for future phases

- Use TanStack Query from the start for any new dashboard feature.
- Wrap Supabase `setAll` in try/catch in Server Components — the middleware handles actual cookie writes.
