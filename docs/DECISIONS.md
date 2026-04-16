# Dad-Ops Agent — Decision Log

## 2026-04-09: [Shared shopping list] Phase A — opaque URL, dedicated tables, read-only public

**Context:** Need a shippable “mini buy list” share link before full weekly ICA crawl + promotions DB.
**Decision:** Spec in [requirements/shared-shopping-list.md](requirements/shared-shopping-list.md). **Primary flow:** **saved recipes** → **plan to cook** → **prepare** (ingredient lines: at home / need) → **shopping list** → share. Tables include **`cook_plans` / `cook_plan_items`** plus **`shared_shopping_lists` / `shared_shopping_list_items`**. **Anonymous read** via **unguessable `public_slug`** (no recipient login). Public route **`/shop/[slug]`** (exact path TBD). Recipients **read-only** in MVP.
**Alternatives considered:** Store lists only in `family_context` JSON (rejected: weak RLS, hard to share by opaque id cleanly); JWT in every URL (deferred: slug-only capability is enough for MVP); manual-only list without recipes (superseded by recipe-first plan).
**Status:** accepted (spec); implementation pending.

## 2026-04-08: [Roadmap] Phase 09 — Swedish recipe sources; renumber YouTube → 10, learning agents → 11

**Context**: Meal planning from promos benefits from a deliberate recipe corpus for Sweden; YouTube extraction and learning agents were already numbered 9 and 10.
**Decision**: Insert **Phase 9: Swedish recipe sources & grounding** (`docs/phases/09-recipe-sources-sweden/`). Renumber **YouTube knowledge extraction** to **Phase 10** (`docs/phases/10-youtube-knowledge-extraction/`) and **Learning agent specialization** to **Phase 11** (`docs/phases/11-learning-agents/`). Earlier decisions that refer to “Phase 9 = YouTube” and “Phase 10 = learning agents” describe the pre-2026-04-08 numbering.
**Alternatives considered**: Fold recipe work into Phase 8 (rejected: Phase 8 is watchlist + promo import + meal-plan v1); defer recipe phase without a number (rejected: you want it scheduled explicitly).
**Status**: accepted

## 2026-04-03: [Phase 8] Prioritize 10 meal suggestions over a 7-day meal plan (near-term)

**Context**: A full weekly calendar meal plan is a larger UX and model surface; promotions-based value can start with a scannable list of ideas.
**Decision**: Specify [**10 meal suggestions**](requirements/promo-meal-suggestions.md) from the imported offer list as the near-term direction (UI **mockup** with static data first, **Gemini API** afterward). The existing **[7-day meal sketch](requirements/promo-meal-plan.md)** and `POST /api/promo-matches/meal-plan` stay in the codebase but are **deferred** in product priority.
**Alternatives considered**: Delete the week-plan UI and API now (rejected: still useful later); ship only docs without a visual (rejected: need to validate density and layout).
**Status**: accepted

## 2026-04-03: [Roadmap] Phase 10 — learning agent specialization after Phase 9

**Context**: After re-scoping phases 8–9, learning agent specialization no longer had a numbered phase.
**Decision**: Schedule **Phase 10: Learning Agent Specialization** (per-topic agents, cadence, progression) **after Phase 9** (YouTube knowledge extraction). Documented in `docs/phases/10-learning-agents/SCOPE.md` and `docs/ROADMAP.md`.
**Alternatives considered**: Keep learning agents only in a vague “deferred” bucket (rejected: you still want it on the roadmap); merge agents into Phase 9 (rejected: different scope—ingestion vs agent behavior).
**Status**: accepted

## 2026-04-03: [Roadmap] Phases 8–9 — meal/shopping from promotions, YouTube knowledge extraction

**Context**: Phase 7 (stability & polish) is complete. Former planned work included a state-tracker mobile app (`08-state-tracker`) and learning-agent specialization (`09-learning-agents`).
**Decision**: Numbered phases **8** and **9** are now **meal & shopping plan from promotion letters** and **YouTube → growing knowledge extraction**, respectively. State-tracker remains **deferred** (listed in `docs/ROADMAP.md`). Learning agents are **Phase 10** (see decision above).
**Alternatives considered**: Keep old phase folders and insert new phases as 10/11 (rejected: would desync mental model and ROADMAP numbering); merge both new ideas into one phase (rejected: different domains and delivery paths).
**Status**: accepted

## 2026-02-25: [Phase 5] Growing suggestions: generate Sun/Wed, show in digest Mon/Fri

**Context**: Growing suggestions were generated on-demand when the weekly API was first called. With frequent knowledge updates, we needed a predictable schedule and fresh generation.
**Decision**: Cron generates suggestions on **Sundays** and **Wednesdays**. Daily digest includes the growing section only on **Mondays** and **Fridays** (Monday shows Sunday's generation, Friday shows Wednesday's).
**Alternatives considered**: Daily generation (too frequent), on-demand only (stale when digest runs before user opens dashboard), separate growing email (rejected: prefer single digest with conditional sections).
**Status**: accepted

## 2026-02-17: [Phase 5] Use tasks metadata for renewals instead of new table

**Context**: Needed to store renewal reminders (passport, subscriptions) without a schema migration for a new table.
**Decision**: Store renewals as `tasks` with `metadata.item_type = "renewal"` and additional fields (`expires_on`, `renew_by`, `lead_days`, `recurrence`) in the JSONB metadata.
**Alternatives considered**: Dedicated `renewals` table (rejected: extra migration, RLS setup, API surface, and bucket wiring for minimal benefit over metadata convention).
**Status**: accepted

## 2026-02-17: [Phase 5] Use tasks metadata for growing suggestions conversion

**Context**: Growing suggestions can be converted to planner tasks. Needed a way to identify growing-originated tasks.
**Decision**: Converted tasks use `metadata.item_type = "growing"` with `suggestion_id` reference.
**Alternatives considered**: Foreign key from tasks to growing_suggestions_log (rejected: tight coupling, growing is a separate domain).
**Status**: accepted

## 2026-02-17: [Phase 5] TanStack Query over manual fetch+useEffect

**Context**: All dashboard pages used manual `fetch` + `useEffect` + `reload()` patterns. This led to duplicated loading/error state management.
**Decision**: Refactored all dashboards (tasks, context, learning) to TanStack Query with `useQuery` + `useMutation` + `invalidateQueries`.
**Alternatives considered**: SWR (lighter but less mutation support), RTK Query (requires Redux), keep manual (rejected: too much boilerplate).
**Status**: accepted

## 2026-02-17: [Phase 5] Growing windows as seed data catalog

**Context**: Needed Stockholm-specific seasonal growing advice. Could generate dynamically with AI or use a curated catalog.
**Decision**: Static `growing_windows` table seeded with 14 Stockholm-specific entries. Weekly suggestions are generated by filtering windows by current month and scoring by user interests.
**Alternatives considered**: AI-generated suggestions per week (rejected for v1: unpredictable quality, unnecessary API cost for well-known seasonal patterns).
**Status**: accepted

## 2026-02-17: [Phase 4] Resend for email delivery

**Context**: Daily digest needs outbound email delivery.
**Decision**: Resend — simple REST API, good deliverability, no SMTP server setup required.
**Alternatives considered**: Postmark (better analytics but pricier), SES (complex setup), Mailgun (overkill for single-recipient digest).
**Status**: accepted

## 2026-02-17: [Phase 2] Gemini 2.5 Flash for AI tasks

**Context**: Need an LLM for task extraction, lesson generation, and narrative briefing.
**Decision**: Google Gemini 2.5 Flash via `@google/generative-ai` SDK.
**Alternatives considered**: OpenAI GPT-4o (higher cost, no native JSON mode at the time), Claude (no structured output guarantee), local LLM (too slow for Worker cold starts).
**Status**: accepted

## 2026-02-17: [Phase 1] Bucket tables instead of status column

**Context**: Tasks need to belong to today/this_week/later buckets. Could use a column on tasks or separate join tables.
**Decision**: Separate `today_tasks`, `this_week_tasks`, `later_tasks` tables with FK to `tasks.id`.
**Alternatives considered**: `bucket` column on tasks (rejected: requires filtered queries on every read, separate tables allow direct fast lookups).
**Status**: accepted

## 2026-03-05: [Phase 5] Component size and refactor guardrails

**Context**: Phase 5 involved substantial dashboard refactors (tasks, growing, learning). Some components had grown very large, making refactors risky and hard to review.
**Decision**: Introduce informal guardrails for UI complexity:
- Prefer React components under ~400 lines of code.
- When a component grows beyond this, treat it as a signal to break it into smaller, focused pieces (subcomponents, hooks, or modules).
- Time-box refactors to avoid open-ended, multi-phase rewrites.
**Alternatives considered**: Relying only on subjective “too big” judgment (rejected: hard to enforce and reason about in reviews).
**Status**: accepted
