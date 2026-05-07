# Phase 09: Recipe generator & library — Implementation tasks

**Total estimate**: ~9–11 hours (spread across tasks below)

## Prerequisites

- [x] Read [`SCOPE.md`](./SCOPE.md) and [`recipe-generator.md`](../../requirements/recipe-generator.md).
- [x] Confirm `GEMINI_API_KEY` available in dashboard env for local dev.

## Tasks

### Task 1: Lock requirements & data shape — 30m

**Goal**: Single source of truth for UX copy, field names, and API payloads before coding.

**Steps**:

1. [x] Confirm [`recipe-generator.md`](../../requirements/recipe-generator.md): ICA catalog for ingredients, [`recipe-food-types.json`](../../apps/dashboard/public/data/recipe-food-types.json) for food type, **Vegetarian** checkbox, optional **`excludeMealTitles`** for regeneration, max **8** meals.
2. [x] Reuse shared catalog validation for ICA JSON (same as promo picker).

**Files**:

- [`docs/requirements/recipe-generator.md`](../../requirements/recipe-generator.md)

**Done when**: Acceptance criteria and API sketch match implementation; meal cap explicit.

---

### Task 2: Supabase migration — `saved_recipes` + RLS — 1h

**Goal**: Persist saved recipes per user with `tested` default `false`.

**Steps**:

1. [x] Add migration: `saved_recipes` with `user_id` → `auth.users`, `title`, `food_type_id` (text), `vegetarian` (boolean), `ingredient_picks` JSONB (ICA strings used at generation), recipe body `ingredients` JSONB (`[{ text, ingredient_label, amount }]`) + `steps` JSONB, `tested` boolean NOT NULL DEFAULT false, `source` text default `'ai_generator'`, timestamps.
2. [x] Enable RLS; policy **authenticated** full CRUD on own rows (`auth.uid() = user_id`) — mirror style from `promo_match_*` or `family_context` as appropriate.
3. [x] Add indexes: `(user_id, created_at desc)`.

**Files**:

- `supabase/migrations/0XX_saved_recipes.sql` (next free number)

**Done when**: `supabase db push` (or local) applies cleanly; policy allows only owner access.

---

### Task 3: Shared Gemini — generate recipe list — 1h 30m

**Goal**: Typed JSON output for “ICA ingredient strings + food type label + vegetarian + optional excluded meal titles → meals[]”.

**Steps**:

1. [x] Define types + response schema (aligned with [`recipe-generator.md`](../../requirements/recipe-generator.md)).
2. [x] Implement `generateRecipeIdeasFromIngredients(...)` in `packages/shared/src/gemini.ts` using structured JSON + Swedish/metric instructions (reuse tone from promo meal plan); when `vegetarian` is true, hard-exclude meat/fish/shellfish in the prompt; when `excludeMealTitles` is non-empty, add prompt block listing titles to avoid (no duplicates in output).
3. [x] Export from `@agent/shared` package index if needed.

**Files**:

- [`packages/shared/src/gemini.ts`](../../packages/shared/src/gemini.ts)
- [`packages/shared/src/index.ts`](../../packages/shared/src/index.ts) (exports, if applicable)

**Done when**: Unit or manual call returns valid parsed meals; count capped to spec.

---

### Task 4: API — `POST /api/recipes/generate` — 45m

**Goal**: Authenticated endpoint that calls shared Gemini and returns JSON to the client (no DB write).

**Steps**:

1. [x] Validate body: non-empty `ingredientTexts[]`, valid `foodTypeId` against `recipe-food-types.json`, boolean `vegetarian`, optional `excludeMealTitles` (trim, dedupe, enforce caps per [`recipe-generator.md`](../../requirements/recipe-generator.md)).
2. [x] Return **502/503** with clear messages if model fails or key missing.

**Files**:

- `apps/dashboard/src/app/api/recipes/generate/route.ts` (new)
- Reuse `@/lib/api` helpers (`getAuthedSupabase` only if needed for auth; generation may not need DB)

**Done when**: Signed-in user gets structured meals; invalid body → 400.

---

### Task 5: API — CRUD for saved recipes — 1h 30m

**Goal**: List, create, patch `tested`, delete.

**Steps**:

1. [x] `GET /api/recipes` — return user’s rows, newest first.
2. [x] `POST /api/recipes` — body from “add” action (subset of AI meal + normalized shape).
3. [x] `PATCH /api/recipes/[id]` — partial update; **must** support `tested`.
4. [x] `DELETE /api/recipes/[id]` — owner only.

**Files**:

- `apps/dashboard/src/app/api/recipes/route.ts`
- `apps/dashboard/src/app/api/recipes/[id]/route.ts`

**Done when**: CRUD works against Supabase with RLS; `tested` toggles persist.

---

### Task 6: Dashboard UI — generate form + results — 2h

**Goal**: ICA catalog ingredient picker (reuse patterns from [`promo-watchlist-dashboard.tsx`](../../apps/dashboard/src/components/dashboard/promo-watchlist-dashboard.tsx)), food-type `<Select>` from `recipe-food-types.json`, **Vegetarian** checkbox, Generate; render AI meals with **Add** per row.

**Steps**:

1. [x] New route `app/recipe-generator/page.tsx` (or `app/recipes/page.tsx` — match nav later).
2. [x] Load `ica-maxi-promo-picker-catalog.json` with existing validation helper; cap max picks (e.g. 15).
3. [x] TanStack Query mutation for generate; show loading/error.
4. [x] Card or row per suggested meal; **Add** calls `POST /api/recipes` and invalidates list query.
5. [x] **Exclude list UX**: e.g. multi-line input or chips for excluded titles; **“Use titles from last result”** to pre-fill `excludeMealTitles` for a second **Generate** (same ingredients/type/vegetarian).

**Files**:

- `apps/dashboard/src/app/recipe-generator/page.tsx` (or chosen path)
- New client component(s) under `components/dashboard/`

**Done when**: Full flow generate → add without page refresh bugs.

---

### Task 7: Dashboard UI — library table + **Tested** column — 1h

**Goal**: Table (or responsive list) of saved recipes with **Tested** toggle and columns for **food type** + **Vegetarian** (saved flag).

**Steps**:

1. [x] `useQuery` for `GET /api/recipes`.
2. [x] Column **Tested**: checkbox or Switch bound to `PATCH` mutation (optimistic optional).
3. [x] Show **food type** label (resolve `food_type_id` via `recipe-food-types.json` or store snapshot label on save).
4. [x] Delete action; optional link to expand steps inline.

**Files**:

- Same feature folder as Task 6

**Done when**: Toggling tested survives reload; matches acceptance criteria in [`recipe-generator.md`](../../requirements/recipe-generator.md).

---

### Task 8: Shell — nav + requirements index — 30m

**Goal**: Discoverability and doc routing.

**Steps**:

1. [x] Add header + mobile nav link: **Recipe generator** (or agreed label).
2. [x] Update [`dashboard.md`](../../requirements/dashboard.md) sections list.
3. [x] [`INDEX.md`](../../requirements/INDEX.md) already links Phase 09; add row for [`recipe-generator.md`](../../requirements/recipe-generator.md) if not present.

### Task 9: Frontend quality pass — ongoing

**Goal**: Bring Phase 9 frontend implementation closer to foundation quality rules.

**Steps**:

1. [x] Move feature server communication helpers from `recipe-generator-dashboard.tsx` into feature-local `recipe-generator-api.ts`.
2. [ ] Continue splitting `recipe-generator-dashboard.tsx` by responsibility; it is currently over the 400-line threshold.

**Files**:

- [`apps/dashboard/src/components/dashboard/header.tsx`](../../apps/dashboard/src/components/dashboard/header.tsx)
- [`docs/requirements/dashboard.md`](../../requirements/dashboard.md)
- [`docs/requirements/INDEX.md`](../../requirements/INDEX.md)

**Done when**: Link works; docs list the new page.

---

### Task 9.5: Async import queue + Worker extraction — 2h

**Goal**: Let the import tab enqueue source URL/markdown and let the Worker create saved recipes later.

**Steps**:

1. [x] Add `recipe_import_queue` table with owner RLS, status, retry metadata, raw markdown, and `created_recipe_id`.
2. [x] Add dashboard queue APIs: list, create, delete non-processing items.
3. [x] Add `/recipe-generator?tab=import` queue panel with add form, status list, errors, and created recipe link.
4. [x] Add Worker `runRecipeImportQueue` processor using the existing new-dish markdown parser.
5. [x] Add daily cron and protected manual trigger `POST /run-recipe-import-queue`.
6. [x] Add import-tab buttons to run the whole queue or a single pending/failed item through the dashboard proxy.
7. [ ] Verify against a real Supabase/Gemini environment.

**Files**:

- [`supabase/migrations/037_recipe_import_queue.sql`](../../../supabase/migrations/037_recipe_import_queue.sql)
- [`apps/dashboard/src/app/api/recipes/import-queue/route.ts`](../../../apps/dashboard/src/app/api/recipes/import-queue/route.ts)
- [`apps/dashboard/src/components/dashboard/recipe-import-queue-panel.tsx`](../../../apps/dashboard/src/components/dashboard/recipe-import-queue-panel.tsx)
- [`apps/worker/src/crons/recipe-import-queue.ts`](../../../apps/worker/src/crons/recipe-import-queue.ts)
- [`apps/worker/src/handlers/fetch/run-recipe-import-queue.ts`](../../../apps/worker/src/handlers/fetch/run-recipe-import-queue.ts)

**Done when**: A queued import can be manually triggered into a saved recipe, and the queue row moves to `completed`.

---

### Task 10: Collaboration search + shared plan entry — 1h 30m

**Goal**: Make the family recipe workspace useful for collaborators who need to find recipes and add them to their own cook plan.

**Steps**:

1. [x] Add a household-aware search API for shared recipes by name/summary, ingredients, and food style.
2. [x] Add `/family/recipes/search` as a collaborator-visible search page.
3. [x] Allow household-visible recipes to be added to **Plan to cook**, including recipes owned by another household member.
4. [x] Add **Add to plan** from the focused food-style recipe review page.
5. [x] Replace free-text ingredient search with ICA ingredient source autocomplete and selected ingredient chips.
6. [x] Add `/recipe-generator/ingredients` read-only recipe-library admin overview for ICA rows and EN/VI alias coverage.
7. [x] Add Review Queue action menu, appended ingredient/recipe/cooking notes, candidate image uploads, and AI-complete handoff to saved recipe edit.

**Files**:

- [`apps/dashboard/src/app/api/recipe-collaboration/search/route.ts`](../../apps/dashboard/src/app/api/recipe-collaboration/search/route.ts)
- [`apps/dashboard/src/app/api/recipes/ingredient-sources/route.ts`](../../apps/dashboard/src/app/api/recipes/ingredient-sources/route.ts)
- [`apps/dashboard/src/components/dashboard/family-recipe-search-page.tsx`](../../apps/dashboard/src/components/dashboard/family-recipe-search-page.tsx)
- [`apps/dashboard/src/components/dashboard/family-ingredient-sources-page.tsx`](../../apps/dashboard/src/components/dashboard/family-ingredient-sources-page.tsx)
- [`apps/dashboard/src/app/api/cook-plan/items/route.ts`](../../apps/dashboard/src/app/api/cook-plan/items/route.ts)
- [`apps/dashboard/src/components/dashboard/family-recipe-style-page.tsx`](../../apps/dashboard/src/components/dashboard/family-recipe-style-page.tsx)

**Done when**: Collaborators can search shared recipes and add a visible recipe to their plan without using the owner account.

---

### Task 11: Recipes hub + read-only recipe sharing — 2h 30m

**Goal**: Organize recipe work under `/recipes` and let the owner share public,
read-only recipe/style links.

**Steps**:

1. [x] Add `/recipes` hub with **Cook**, **Manage**, **Collect**, and **Share** sections.
2. [x] Redirect old top-level recipe routes into the matching hub sections.
3. [x] Add `recipe_share_links` with owner RLS, opaque slug, active-link reuse,
   disable support, and anon read RPC.
4. [x] Add owner share-link APIs and Share UI.
5. [x] Add public `/recipes/shared/[slug]` page for single recipe and food-style shares.

**Done when**: Owner can copy a read-only recipe/style link, anonymous visitors
can open it, disabled links return not found, and food-style shares support
match-any ingredient filtering.

---

### Task 12: Focused recipe cooking view — 1h 30m

**Goal**: Give each recipe a stable kitchen-friendly URL separate from the
library and plan-management screens.

**Steps**:

1. [x] Add authenticated `/recipes/[id]/cook` page.
2. [x] Add `GET /api/recipes/[id]/cook` using existing household-visible recipe
   access rules.
3. [x] Add focused cooking UI with ingredients, large steps, local step
   progress, recipe language toolbar, optional screen wake lock, and owner-only
   **Mark tested** action.
4. [x] Link to the cooking view from plan-to-cook, the plan cooking overview,
   family recipe search, and saved recipe detail.
5. [ ] Verify in a real authenticated browser session with owner and
   collaborator recipes.

**Done when**: Opening a recipe cooking URL loads the recipe without the full
library UI, step progress survives refresh in the same browser, and
collaborator-visible recipes can open through the same route.

---

## Order

Execute **Task 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8**. Tasks 4 and 5 can overlap in development only after Task 3 exports a stable function signature.

## Verify (manual)

- Generate → add two recipes → both appear in library → toggle **Tested** on one → refresh → state persists.
- Second browser session (same user): library still there.
- Sign-out: no access to APIs (existing auth behavior).
