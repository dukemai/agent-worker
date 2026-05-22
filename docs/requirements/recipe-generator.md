# Recipe library & generator (Sweden-oriented)

## Status

Planned — [Phase 9](../phases/09-recipe-sources-sweden/SCOPE.md).

## Purpose

Give the user a **recipe library** as the primary workspace, with linked flows to generate new recipe ideas or import from trusted sources. Generation starts from a **type of food** suited to cooking in Sweden, can optionally use **ingredients from the ICA Maxi Handla interest catalog** as focus ingredients, can require **vegetarian** meals, and can pass **meal titles to exclude** so repeated generations return **fresh** ideas. Saved recipes can be searched, reviewed, edited, planned, and marked **tested**.

This is **assistive cooking**, not medical or nutrition advice.

## User flow

1. Open **Recipes** (`/recipes`). The hub defaults to **Cook** and groups recipe
   work into **Manage**, **Cook**, **Collect**, and **Share**. The old
   `/recipe-generator`, `/plan-to-cook`, and `/family/recipes` entrypoints
   redirect into the matching hub sections.
2. **Library** is the default view: search by recipe name/summary, filter by style/tested status, view/edit/delete, mark **Want to try**, mark **Tested**, and open linked standalone flows for **Generate recipe ideas** (`/recipe-generator/generate`) or **Import from source** (`/recipe-generator/import`).
2a. **Import queue** — on `/recipe-generator/import`, the user can paste a source URL/label and markdown into a queue. A scheduled Worker extracts queued items into `saved_recipes` daily. The queue UI can also manually trigger the same Worker processor for testing.
3. **Type of food** — single choice from the preset list below (loaded from [`recipe-food-types.json`](../../apps/dashboard/public/data/recipe-food-types.json)). This is the primary input for generation.
4. **Focus ingredients (optional)** — pick zero or more items through two source modes: **Food-style mapping**, which uses the ingredients configured in Manage food-style mapping (`food_style_favorite_suggestions`) for the selected style, and **Browse ICA catalog**, which keeps the previous free-pick behavior across the **ICA Maxi promo picker catalog** (`apps/dashboard/public/data/ica-maxi-promo-picker-catalog.json`). The recipe UI lists **food departments only** in catalog mode (see [`recipe-picker-food-departments.ts`](../../apps/dashboard/src/lib/recipe-picker-food-departments.ts)); the promo watchlist still uses the full catalog. Each selection stores a **`watchlistText`** string (or equivalent) so labels match what Swedes see in stores.
4a. **Food-style ingredient mapping** lives under `/recipe-generator/mapping`, linked from the Recipes → Manage library header.
It is the admin home for `food_style_favorite_suggestions`, which is reused by
recipe generation, recipe search ingredient picking, and promo grocery watchlist
helpers.
5. **Vegetarian** — **checkbox** (off by default). When checked, the AI must suggest **only vegetarian** meals (no meat, fish, or shellfish); eggs and dairy are allowed unless you later add a separate vegan option.
6. **Exclude meals (optional)** — list of **meal titles** the model must **not** reproduce or closely imitate. Used to get **fresh suggestions** on a second (or third) generation with the same food type: e.g. titles from the **previous batch**, dishes they dislike, or meals already in the **saved library**. The UI can offer **Exclude recipes already saved in this food style** plus **Use titles from last result** and manual add/remove rows.
7. **Difficulty** — recipes store a simple cooking difficulty: `easy`, `medium`, or `hard`. AI generation/import proposes it; edit/import screens let the user adjust it. Existing recipes default to `medium`.
8. **Generate** → structured **meal ideas** (title, ingredient list, estimated time, difficulty, optional short summary; cooking steps come from trusted source import or manual editing).
9. User **adds** selected recipes to the library (not auto-save all).
10. **Library** table: title, type of food, estimated cook time, **Difficulty**, **Vegetarian** (whether the request was vegetarian—see data model), **Tested**, actions.
11. **Cooking view** — each saved or household-visible recipe has a focused
    cooking URL at `/recipes/[id]/cook`. This view is authenticated, optimized
    for standing in the kitchen, supports the shared recipe language selector,
    keeps step check-off progress locally per browser, and can keep the screen
    awake when the browser supports the Wake Lock API.
12. **Plan to cook → prepare → shopping list** (Phase A — [shared-shopping-list.md](shared-shopping-list.md)): from the library, user adds **several saved recipes** to a **plan to cook**; opens **prepare** to mark ingredients **at home** vs **need**; generates a **shared shopping list** with a link for someone else to shop. Implementation order may start with **one recipe** before multi-recipe plans.
13. **Share read-only recipe knowledge** — from the **Share** section, the owner
    can create opaque public links for either a single saved recipe or all saved
    recipes in one food style. Food-style links auto-update as recipes are added
    to that style and expose a read-only filter page at `/recipes/shared/[slug]`.

## Import language handling

Recipe import still stores Swedish as the primary library body (`summary`,
`ingredients`, `steps`) so the owner’s library stays consistent. When pasted
source markdown is detected as English or Vietnamese, extraction also returns
the original-language title/body and saves it into the cached recipe `i18n`
column (`en` or `vi`). This lets the family/cooking views switch language
immediately when the source was already in that language. For English and
Vietnamese sources, import also runs a Swedish normalization pass from the
original-language body so copied source text does not become the primary saved
recipe body.

Translation and import prompts use a small Vietnamese ingredient glossary for
culturally specific ingredients so Swedish labels stay useful for shopping
without collapsing distinct products into generic Swedish terms. Example:
`hạt nêm` should become `vietnamesiskt buljongpulver`, not plain
`buljongpulver`.

## Family collaboration

Recipe sourcing can be shared through a focused family recipe workspace rather
than the full personal dashboard. The owner creates a household invite link;
the collaborator signs in or creates an account, accepts the invite, and joins
as `collaborator`.

Initial scope:

- Route: `/family/recipes`.
- Owner can create a collaborator invite link.
- Household members can add recipe candidates from a modal with title, source
  URL, ingredient notes, cooking notes, family notes, and optional pasted recipe
  text/markdown/transcript. They can also upload reference images for the recipe
  while creating or reviewing the candidate. This supports sources such as
  YouTube or TikTok where the app may have a link but no reliable extractor.
- Household members can ask AI to complete a candidate from those manual notes.
  The result is saved as a shared `saved_recipes` row, the reviewer is sent to
  the saved recipe edit page, and the completed candidate is removed from the
  Review Queue.
- Household members can use `/family/recipes/search` to search shared recipes
  by recipe name/summary, selected ICA ingredient source rows, and food style.
  The ingredient control should autocomplete from the ICA ingredient source index
  instead of accepting unconstrained free text. The page uses the shared recipe
  language selector (`sv`, `en`, `vi`) so search results show translated recipe
  titles/summaries/ingredients when cached and the ingredient picker displays
  ICA source labels in the selected language.
- Admin/owner can use `/recipe-generator/ingredients` from the Recipe library to
  inspect the ingredient source index: ICA Swedish labels, departments, catalog
  product counts, and missing English/Vietnamese translation or alias coverage.
  Swedish ICA labels are the initial source of truth; EN/VI aliases are expected
  follow-on data.
- Household members can add visible shared recipes to their own **Plan to cook**
  from search results or the focused food-style review page.
- Household members can see an overview of shared saved recipe counts by food
  style, showing only styles that currently have recipes.
- Selecting a food style opens a focused style page where household members
  review one recipe card at a time, move next/previous, filter by verified and
  want-to-cook status, and give lightweight recipe feedback such as verified,
  looks good, or needs changes.
- Household members can review candidates by status:
  `new`, `want_to_try`, `looks_good`, `needs_changes`, `accepted`, `rejected`,
  `done`. Candidates marked `done` are hidden from the default review queue.
- Canonical saved recipes remain separate from recipe candidates; AI completion
  is the handoff point into `saved_recipes`, after which the candidate leaves
  the queue.

Data tables:

- `households`, `household_members`, `household_invites`.
- `recipe_candidates` for shared incoming ideas.
- `recipe_reviews` for future review/comment history on candidates or saved
  recipes.

Follow-on: attach birthdays and saved recipes to `household_id` so shared
domains use the same family membership model.

Collaborator dashboard boundary:

- Collaborators are account-backed users, but they should not see the full
  owner dashboard.
- Allowed starting surfaces: family recipes, plan to cook, and birthdays.
- The consolidated `/recipes` hub is allowed for collaborators, while owner-only
  admin pieces remain guarded by API and middleware boundaries.
- Owner-only operational areas such as tasks, renewals, learning, growing,
  context, digest preview, and promo watchlist remain hidden/blocked for
  collaborators.

## Read-only recipe sharing

The owner can create **anyone-with-link** read-only shares from
`/recipes?tab=share`.

- **Single recipe share**: shows one recipe detail and steps.
- **Food-style share**: shows all current owner recipes with that `food_type_id`
  (for example `brunch-breakfast-light` = “Brunch / frukost / lätt lunch”).
- Public visitors can filter food-style shares by search text, vegetarian,
  difficulty, and selected “ingredients at home.”
- Ingredient filtering uses **match any** semantics so family members get useful
  suggestions even when only one selected ingredient matches.
- Public shares expose only safe recipe fields and never raw source markdown,
  admin notes, planning actions, feedback, or mutations.

## Why ICA catalog for ingredients

- Aligns with **real products and naming** in Swedish supermarkets (ICA Maxi Handla tree).
- Avoids free-text ingredients that do not exist locally or are oddly translated.
- Reuses **validated** catalog loading (same runtime validation idea as the promo picker).

Optional later: allow **one custom phrase** in addition to catalog picks (same pattern as promo watchlist “Add my own text”) if users need a gap-fill.

## Type of food (presets)

Single-select dropdown. **`id`** values are **English** (stable API keys); **`label`** values are **Swedish** for the UI. Resolve `id` → `label` when building the Gemini prompt.

Committed file: [`apps/dashboard/public/data/recipe-food-types.json`](../../apps/dashboard/public/data/recipe-food-types.json).

| id (English) | Label (UI, Swedish) |
|----|------------|
| `swedish-nordic` | Svensk / nordisk husman |
| `fish-seafood` | Fisk & skaldjur |
| `italian` | Italienskt |
| `asian-mixed` | Asiatiskt (blandat) |
| `thai` | Thailändskt |
| `vietnamese` | Vietnamesiskt |
| `japanese` | Japanskt |
| `korean` | Koreanskt |
| `indian` | Indiskt |
| `middle-eastern` | Mellanöstern / meze |
| `mexican` | Mexikanskt / tex-mex |
| `american-bbq` | Amerikanskt / BBQ |
| `french-mediterranean` | Fransk / medelhavs |
| `greek` | Grekiskt |
| `spanish-tapas` | Spanskt / tapas |
| `brunch-breakfast-light` | Brunch / frukost / lätt lunch |
| `soup-stew` | Soppa / gryta / mustigt |
| `fest-weekend` | Fest / helg |
| `grill-summer` | Grill / sommar |

**Rationale (Sweden):** Covers **husman** and **fisk/skaldjur** (very common home and store focus), **major restaurant cuisines** available in most Swedish cities (Italian, various Asian, Indian, Middle Eastern, American, Mexican), **Mediterranean** cluster, **brunch/light lunch**, **fest/weekend**, **soup/stew**, and **grill** (strong seasonal pattern).

**Vegetarian** is **not** a row in this list — it is only the **checkbox** so it can combine with any food type (e.g. `italian` + vegetarian).

## Data

| Concern | Mechanism (v1) |
|--------|------------------|
| Ingredient picks | Optional array of strings from ICA catalog (`watchlistText`), max reasonable cap (e.g. 15) to match promo watchlist spirit. Empty means style-only generation. |
| Food type | Single English `food_type_id` from `recipe-food-types.json` (e.g. `thai`, `swedish-nordic`). |
| Vegetarian request | Boolean `vegetarian` on the generate request and stored on saved recipes for display. |
| Difficulty | Text enum `difficulty`: `easy`, `medium`, `hard`; default `medium`. |
| Excluded meal titles | Optional `excludeMealTitles: string[]` on **generate** only (not stored as a column unless you want audit); trim, dedupe, cap count/length server-side so prompts stay bounded. |
| Recipe ingredient item | Structured object: `{ text, ingredient_label, amount }` for each ingredient in a generated/saved recipe. |
| Saved recipes | Supabase `saved_recipes` (or equivalent), RLS per user. |
| **Tested** | Boolean `tested`, default `false`. |

**Suggested columns** (implementation detail):

- `title`, `food_type_id` (text), `vegetarian` (boolean — *generation was vegetarian*), `difficulty` (`easy`/`medium`/`hard`), `ingredient_picks` (JSONB array of strings — optional ICA labels), `ingredients` (JSONB array of `{ text, ingredient_label, amount }`), `steps`, `tested`, `source`, timestamps.

## Recipe data shapes

Below is a **concrete suggestion** for JSON/API/DB so implementation stays consistent. Align `@agent/shared` types and Gemini response schema with this.

### 1. `POST /api/recipes/generate` (request body)

```json
{
  "ingredientTexts": ["Kycklingfilé", "Grädde", "Lök gul"],
  "foodTypeId": "italian",
  "vegetarian": false,
  "excludeMealTitles": ["Kyckling parmigiana"]
}
```

| Field | Type | Notes |
|--------|------|--------|
| `ingredientTexts` | `string[]` | Optional ICA `watchlistText` focus values; empty array is allowed for style-only generation; max ~15. |
| `foodTypeId` | `string` | English id from `recipe-food-types.json`. |
| `vegetarian` | `boolean` | |
| `excludeMealTitles` | `string[]` | Optional; caps per [AI contract](#ai-contract). |

---

### 2. AI response (ephemeral — not stored as a single blob)

Wrapper object returned by Gemini and by `POST /api/recipes/generate`:

```typescript
/** Max 8 items in `meals` (sanitized server-side). */
interface RecipeGenerateResult {
  /** Short Swedish intro (optional; can be empty). */
  intro: string;
  meals: GeneratedRecipeMeal[];
}

type GeneratedMealKind = "lunch" | "dinner" | "either" | "snack" | "other";

interface RecipeIngredient {
  /** Full display text, e.g. "Kycklingfilé ca 400 g, tärnad" */
  text: string;
  /** Ingredient label aligned with selected/store terminology. */
  ingredient_label: string;
  /** Amount text, e.g. "400 g", "2 dl", "1 st". */
  amount: string;
}

/** One suggested recipe (Swedish copy; metric-friendly). */
interface GeneratedRecipeMeal {
  /** Dish name — also used in exclude lists on the next run. */
  title: string;
  /** 1–2 sentences: what it is and how it uses the picked ingredients. */
  summary: string;
  meal_kind: GeneratedMealKind;
  /** Structured ingredient rows for clearer UI and shopping actions. */
  ingredients: RecipeIngredient[];
  /**
   * Ordered steps (Swedish). Prefer one short sentence per element.
   * Alternatively a single `cooking_note` string is enough for v1 if the schema is simpler;
   * arrays are better for future “step N of M” UI.
   */
  steps: string[];
  /**
   * Which of the user’s `ingredientTexts` this meal leans on (subset; fuzzy OK).
   * Helps UI show “uses: …” and debugging; optional if you want a slimmer schema.
   */
  uses_ingredient_picks?: string[];
}
```

**Example** (`RecipeGenerateResult`):

```json
{
  "intro": "Här är varierade idéer med dina ingredienser, i italiensk stil.",
  "meals": [
    {
      "title": "Krämig kycklinggryta med grädde och lök",
      "summary": "En enkel gryta där grädden binder såsen och löken ger sötma.",
      "meal_kind": "dinner",
      "ingredients": [
        {
          "text": "Kycklingfilé ca 400 g, tärnad",
          "ingredient_label": "Kycklingfilé",
          "amount": "400 g"
        },
        {
          "text": "Gul lök 1 st, hackad",
          "ingredient_label": "Lök gul",
          "amount": "1 st"
        },
        {
          "text": "Grädde 2 dl",
          "ingredient_label": "Grädde",
          "amount": "2 dl"
        },
        {
          "text": "Salt, peppar, olivolja",
          "ingredient_label": "Kryddor / basvaror",
          "amount": "efter smak"
        }
      ],
      "steps": [
        "Fräs kycklingen i olja tills den fått färg.",
        "Tillsätt lök och stek tills den mjuknat.",
        "Häll i grädde, krydda, låt sjuda 10–15 minuter."
      ],
      "uses_ingredient_picks": ["Kycklingfilé", "Grädde", "Lök gul"]
    }
  ]
}
```

This mirrors the spirit of [`PromoMealPlanMeal`](../../packages/shared/src/gemini.ts) (`title`, `summary`, `meal_kind`) but uses structured **`ingredients[]`** with `text` + `ingredient_label` + `amount`, plus **`steps[]`** for clearer recipe structure than a single `cooking_note` alone.

---

### 3. Saved recipe (`saved_recipes` row — API + DB)

What you persist when the user clicks **Add** on one generated meal (plus metadata for the library):

| Column / field | Type | Example |
|----------------|------|---------|
| `id` | `uuid` | Server-generated |
| `user_id` | `uuid` | `auth.uid()` |
| `title` | `text` | Same as `GeneratedRecipeMeal.title` |
| `summary` | `text` | Same as `summary` |
| `meal_kind` | `text` | `dinner`, etc. |
| `ingredients` | `jsonb` | `RecipeIngredient[]` — copy of `ingredients` (`text`, `ingredient_label`, `amount`) |
| `steps` | `jsonb` | `string[]` — copy of `steps` |
| `food_type_id` | `text` | e.g. `italian` |
| `vegetarian` | `boolean` | From the **generate** request (not re-inferred) |
| `ingredient_picks` | `jsonb` | `string[]` — ICA strings from that generate call |
| `difficulty` | `text` | `easy`, `medium`, or `hard`; default `medium` |
| `tested` | `boolean` | Default `false`; user toggles |
| `source` | `text` | `'ai_generator'` |
| `created_at` / `updated_at` | `timestamptz` | |

**`POST /api/recipes` body** (one object — matches row minus `id`/`user_id`/`timestamps`):

```json
{
  "title": "Krämig kycklinggryta med grädde och lök",
  "summary": "En enkel gryta där grädden binder såsen och löken ger sötma.",
  "meal_kind": "dinner",
  "ingredients": [
    {
      "text": "Kycklingfilé ca 400 g, tärnad",
      "ingredient_label": "Kycklingfilé",
      "amount": "400 g"
    }
  ],
  "steps": ["Fräs kycklingen …", "…"],
  "food_type_id": "italian",
  "vegetarian": false,
  "ingredient_picks": ["Kycklingfilé", "Grädde", "Lök gul"]
}
```

**`PATCH /api/recipes/[id]`** for testing: `{ "tested": true }`.

---

### 4. `GET /api/recipes` (list item)

Array of saved rows; each item includes `id`, `title`, `food_type_id`, `vegetarian`, `tested`, `created_at`, and optionally full `ingredients` / `steps` for table + detail views.

## API (sketch)

| Method | Path | Role |
|--------|------|------|
| POST | `/api/recipes/generate` | Body: `{ "ingredientTexts": string[], "foodTypeId": string, "vegetarian": boolean, "excludeMealTitles"?: string[] }` → AI list, not persisted. Empty `ingredientTexts` means style-only generation. Empty or omitted `excludeMealTitles` means no exclusions. |
| GET | `/api/recipes` | List saved recipes. |
| POST | `/api/recipes` | Save one recipe (+ metadata above). |
| PATCH | `/api/recipes/[id]` | Includes `{ "tested": boolean }`. |
| DELETE | `/api/recipes/[id]` | Remove. |
| GET | `/api/recipes/[id]/cook` | Authenticated cooking payload for owner or household-visible recipes; returns safe recipe fields plus whether the current user can edit/mark tested. |
| GET | `/api/recipes/import-queue` | List the user’s queued source imports, newest first, with markdown preview only. |
| POST | `/api/recipes/import-queue` | Add `{ source_url?, source_label?, source_markdown }` for scheduled extraction. |
| DELETE | `/api/recipes/import-queue/[id]` | Delete a non-processing queue item. |

## Async import queue

`recipe_import_queue` stores pasted source markdown separately from
`saved_recipes` until the Worker processes it. Queue states are `pending`,
`processing`, `completed`, and `failed`; completed rows link to
`created_recipe_id`. The Worker uses the same new-dish markdown parser as the
interactive import flow, writes Swedish primary recipe fields, preserves EN/VI
source-language bodies in `saved_recipes.i18n`, and stores `source_markdown`
plus `similar_recipe_url` on the created recipe.

Manual testing route:

- `POST /run-recipe-import-queue`
- Header: `Authorization: Bearer <WORKER_ADMIN_TOKEN>`
- Optional JSON: `{ "limit": 1, "queueItemId": "..." }`
- Dashboard button: `/api/recipes/import-queue/run` proxies this call from the
  import queue UI, keeping `WORKER_ADMIN_TOKEN` server-side.

## AI contract

- **Input**: **Swedish `label`** looked up from `food_type_id` + optional ICA focus ingredient strings + `vegetarian` flag + Swedish home-cook context (metric, [`promo-meal-plan.md`](promo-meal-plan.md)-style realism).
- **`excludeMealTitles`**: When non-empty, the prompt must instruct the model to **not** output those dishes or **obvious renames** of the same idea (e.g. same core dish with a minor title tweak). Prefer **new** concepts while still using the chosen ingredients and food type. If the exclusion list is long, the model may need to stretch creativity within constraints—still return up to the meal cap.
- If **vegetarian** is true: explicitly forbid meat, fish, shellfish, gelatin, animal rennet in instructions; keep tone practical for Swedish supermarkets.
- **Output**: capped list of meal ideas with `title`, structured `ingredients[]` (`text`, `ingredient_label`, `amount`), empty `steps[]` from the generator, optional `meal_kind`, estimated cook time, and `difficulty`. Cooking instructions come from source import or manual editing.
- Implement with structured JSON in `@agent/shared`, same family as `generatePromoMealPlanForWeek`.

**Max meals**: **8** (align with Phase 9 TASKS).

**Limits (server)**: Cap `excludeMealTitles` length (e.g. max **40** entries, each trimmed, max **120** characters per title, case-fold dedupe) before calling Gemini to avoid oversized prompts.

## Acceptance criteria

1. Recipe library is the default surface and supports search by name/summary.
2. Food type is one preset; **Vegetarian** is a separate checkbox and is respected in prompts.
3. Ingredients are optional focus ingredients chosen from the **ICA catalog** (same JSON + validation approach as promo picker); user can generate style-only without ingredients or free-text ingredients unless optional “custom phrase” is added later.
4. User can add recipes to the library; **Tested** toggles independently.
5. Saved recipes store and show **Difficulty** (`easy`, `medium`, `hard`), and edit/import can adjust it.
6. Library shows whether the recipe was saved from a **vegetarian** generation run.
7. User can supply **`excludeMealTitles`** (including reusing last batch titles and recipes already saved in a selected style) and get **new** suggestions without changing food type; server enforces caps on the list.
8. User can add source markdown to the import queue and see status/error/created recipe link after the Worker runs.
9. User can open `/recipes/[id]/cook` from recipe search, library detail, or plan-to-cook and get a focused ingredients/steps view with local step progress.

## Out of scope (v1)

- RAG / external recipe corpus.
- Vegan-only mode (can be a follow-up checkbox).
- Promo / weekly-offer integration.

## Related

- [`shared-shopping-list.md`](shared-shopping-list.md) — **plan to cook**, prepare, shared buy list (recipe-first flow).
- [`ica-maxi-picker-catalog-source.md`](ica-maxi-picker-catalog-source.md) — category tree source.
- [`promo-watchlist.md`](promo-watchlist.md) — picker UX reference.
- [`promo-meal-plan.md`](promo-meal-plan.md) — Gemini JSON patterns.
- [`dashboard.md`](dashboard.md) — nav when shipped.
