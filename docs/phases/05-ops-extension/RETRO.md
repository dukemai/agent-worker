# Phase 5: Ops Extension — Retrospective

## What went well

- TanStack Query refactor dramatically reduced boilerplate — loading, error, and cache states are handled consistently.
- Metadata convention (`tasks.metadata.item_type`) let us add renewals and growing-task conversion without schema migrations.
- Growing seed data approach (static windows table) provides reliable, predictable suggestions without AI cost.
- Mobile-first responsive design works well with Tailwind `md:` breakpoints.

## What could be better

- Phase scope was large — could have been split into 5a (mobile + TanStack) and 5b (renewals + growing).
- No automated tests for API routes or mutations.
- Growing suggestions lack personalization beyond interest keywords — future phases could use AI to tailor advice.

## Lessons for future phases

- Keep phase scope to 1-2 features maximum to maintain focus.
- Metadata convention works well for up to ~3 item types; beyond that, consider dedicated tables.
- Write phase SCOPE.md before starting implementation (not after).
