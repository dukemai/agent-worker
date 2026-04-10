# Phase 09: Recipe generator & library — Implementation tasks

**Total estimate**: ~9–11 hours (spread across tasks below)

## Prerequisites

- [ ] Read [`SCOPE.md`](./SCOPE.md) and [`recipe-generator.md`](../../requirements/recipe-generator.md).
- [ ] Confirm `GEMINI_API_KEY` available in dashboard env for local dev.

## Tasks

### Task 1: Lock requirements & data shape — 30m

**Goal**: Single source of truth for UX copy, field names, and API payloads before coding.

**Steps**:

1. Confirm [`recipe-generator.md`](../../requirements/recipe-generator.md): ICA catalog for ingredients, [`recipe-food-types.json`](../../apps/dashboard/public/data/recipe-food-types.json) for food type, **Vegetarian** checkbox, optional **`excludeMealTitles`** for regeneration, max **8** meals.
2. Reuse shared catalog validation for ICA JSON (same as promo picker).

**Files**:

- [`docs/requirements/recipe-generator.md`](../../requirements/recipe-generator.md)

**Done when**: Acceptance criteria and API sketch match implementation; meal cap explicit.

---

### Task 2: Supabase migration — `saved_recipes` + RLS — 1h

**Goal**: Persist saved recipes per user with `tested` default `false`.

**Steps**:

1. Add migration: `saved_recipes` with `user_id` → `auth.users`, `title`, `food_type_id` (text), `vegetarian` (boolean), `ingredient_picks` JSONB (ICA strings used at generation), recipe body `ingredients` JSONB (`[{ text, ingredient_label, amount }]`) + `steps` JSONB, `tested` boolean NOT NULL DEFAULT false, `source` text default `'ai_generator'`, timestamps.
2. Enable RLS; policy **authenticated** full CRUD on own rows (`auth.uid() = user_id`) — mirror style from `promo_match_*` or `family_context` as appropriate.
3. Add indexes: `(user_id, created_at desc)`.

**Files**:

- `supabase/migrations/0XX_saved_recipes.sql` (next free number)

**Done when**: `supabase db push` (or local) applies cleanly; policy allows only owner access.

---

### Task 3: Shared Gemini — generate recipe list — 1h 30m

**Goal**: Typed JSON output for “ICA ingredient strings + food type label + vegetarian + optional excluded meal titles → meals[]”.

**Steps**:

1. Define types + response schema (aligned with [`recipe-generator.md`](../../requirements/recipe-generator.md)).
2. Implement `generateRecipeIdeasFromIngredients(...)` in `packages/shared/src/gemini.ts` using structured JSON + Swedish/metric instructions (reuse tone from promo meal plan); when `vegetarian` is true, hard-exclude meat/fish/shellfish in the prompt; when `excludeMealTitles` is non-empty, add prompt block listing titles to avoid (no duplicates in output).
3. Export from `@agent/shared` package index if needed.

**Files**:

- [`packages/shared/src/gemini.ts`](../../packages/shared/src/gemini.ts)
- [`packages/shared/src/index.ts`](../../packages/shared/src/index.ts) (exports, if applicable)

**Done when**: Unit or manual call returns valid parsed meals; count capped to spec.

---

### Task 4: API — `POST /api/recipes/generate` — 45m

**Goal**: Authenticated endpoint that calls shared Gemini and returns JSON to the client (no DB write).

**Steps**:

1. Validate body: non-empty `ingredientTexts[]`, valid `foodTypeId` against `recipe-food-types.json`, boolean `vegetarian`, optional `excludeMealTitles` (trim, dedupe, enforce caps per [`recipe-generator.md`](../../requirements/recipe-generator.md)).
2. Return **502/503** with clear messages if model fails or key missing.

**Files**:

- `apps/dashboard/src/app/api/recipes/generate/route.ts` (new)
- Reuse `@/lib/api` helpers (`getAuthedSupabase` only if needed for auth; generation may not need DB)

**Done when**: Signed-in user gets structured meals; invalid body → 400.

---

### Task 5: API — CRUD for saved recipes — 1h 30m

**Goal**: List, create, patch `tested`, delete.

**Steps**:

1. `GET /api/recipes` — return user’s rows, newest first.
2. `POST /api/recipes` — body from “add” action (subset of AI meal + normalized shape).
3. `PATCH /api/recipes/[id]` — partial update; **must** support `tested`.
4. `DELETE /api/recipes/[id]` — owner only.

**Files**:

- `apps/dashboard/src/app/api/recipes/route.ts`
- `apps/dashboard/src/app/api/recipes/[id]/route.ts`

**Done when**: CRUD works against Supabase with RLS; `tested` toggles persist.

---

### Task 6: Dashboard UI — generate form + results — 2h

**Goal**: ICA catalog ingredient picker (reuse patterns from [`promo-watchlist-dashboard.tsx`](../../apps/dashboard/src/components/dashboard/promo-watchlist-dashboard.tsx)), food-type `<Select>` from `recipe-food-types.json`, **Vegetarian** checkbox, Generate; render AI meals with **Add** per row.

**Steps**:

1. New route `app/recipe-generator/page.tsx` (or `app/recipes/page.tsx` — match nav later).
2. Load `ica-maxi-promo-picker-catalog.json` with existing validation helper; cap max picks (e.g. 15).
3. TanStack Query mutation for generate; show loading/error.
4. Card or row per suggested meal; **Add** calls `POST /api/recipes` and invalidates list query.
5. **Exclude list UX**: e.g. multi-line input or chips for excluded titles; **“Use titles from last result”** to pre-fill `excludeMealTitles` for a second **Generate** (same ingredients/type/vegetarian).

**Files**:

- `apps/dashboard/src/app/recipe-generator/page.tsx` (or chosen path)
- New client component(s) under `components/dashboard/`

**Done when**: Full flow generate → add without page refresh bugs.

---

### Task 7: Dashboard UI — library table + **Tested** column — 1h

**Goal**: Table (or responsive list) of saved recipes with **Tested** toggle and columns for **food type** + **Vegetarian** (saved flag).

**Steps**:

1. `useQuery` for `GET /api/recipes`.
2. Column **Tested**: checkbox or Switch bound to `PATCH` mutation (optimistic optional).
3. Show **food type** label (resolve `food_type_id` via `recipe-food-types.json` or store snapshot label on save).
4. Delete action; optional link to expand steps inline.

**Files**:

- Same feature folder as Task 6

**Done when**: Toggling tested survives reload; matches acceptance criteria in [`recipe-generator.md`](../../requirements/recipe-generator.md).

---

### Task 8: Shell — nav + requirements index — 30m

**Goal**: Discoverability and doc routing.

**Steps**:

1. Add header + mobile nav link: **Recipe generator** (or agreed label).
2. Update [`dashboard.md`](../../requirements/dashboard.md) sections list.
3. [`INDEX.md`](../../requirements/INDEX.md) already links Phase 09; add row for [`recipe-generator.md`](../../requirements/recipe-generator.md) if not present.

**Files**:

- [`apps/dashboard/src/components/dashboard/header.tsx`](../../apps/dashboard/src/components/dashboard/header.tsx)
- [`docs/requirements/dashboard.md`](../../requirements/dashboard.md)
- [`docs/requirements/INDEX.md`](../../requirements/INDEX.md)

**Done when**: Link works; docs list the new page.

---

## Order

Execute **Task 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8**. Tasks 4 and 5 can overlap in development only after Task 3 exports a stable function signature.

## Verify (manual)

- Generate → add two recipes → both appear in library → toggle **Tested** on one → refresh → state persists.
- Second browser session (same user): library still there.
- Sign-out: no access to APIs (existing auth behavior).
