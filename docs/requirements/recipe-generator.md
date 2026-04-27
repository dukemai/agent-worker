# Recipe generator & saved library (Sweden-oriented)

## Status

Planned — [Phase 9](../phases/09-recipe-sources-sweden/SCOPE.md).

## Purpose

Let the user pick **ingredients from the ICA Maxi Handla interest catalog** (same source as the promo watchlist picker), choose a **type of food** suited to cooking in Sweden, optionally require **vegetarian** meals, optionally pass **meal titles to exclude** so repeated generations can return **fresh** ideas, call **Gemini** for **meal ideas with recipes**, **add** chosen recipes to a **saved library**, and mark each as **tested** or not.

This is **assistive cooking**, not medical or nutrition advice.

## User flow

1. Open **Recipe generator** (dedicated dashboard route).
2. **Ingredients** — pick one or more items from the **ICA Maxi promo picker catalog** (`apps/dashboard/public/data/ica-maxi-promo-picker-catalog.json`), reusing the same category/search UX patterns as [`promo-watchlist.md`](promo-watchlist.md) (department filter + search + chip list). The recipe UI lists **food departments only** (see [`recipe-picker-food-departments.ts`](../../apps/dashboard/src/lib/recipe-picker-food-departments.ts)); the promo watchlist still uses the full catalog. Each selection stores the catalog **`watchlistText`** string (or equivalent) so labels match what Swedes see in stores.
3. **Type of food** — single choice from the preset list below (loaded from [`recipe-food-types.json`](../../apps/dashboard/public/data/recipe-food-types.json)).
4. **Vegetarian** — **checkbox** (off by default). When checked, the AI must suggest **only vegetarian** meals (no meat, fish, or shellfish); eggs and dairy are allowed unless you later add a separate vegan option.
5. **Exclude meals (optional)** — list of **meal titles** the model must **not** reproduce or closely imitate. Used to get **fresh suggestions** on a second (or third) generation with the same ingredients and food type: e.g. titles from the **previous batch** the user did not want, dishes they dislike, or meals already in the **saved library** they do not want repeated. Implementation can offer **“Exclude results from last generation”** (one click) and/or manual add/remove rows.
6. **Generate** → structured **meals** (title, ingredients, steps, optional tags).
7. User **adds** selected recipes to the library (not auto-save all).
8. **Library** table: title, type of food, **Vegetarian** (whether the request was vegetarian—see data model), **Tested**, actions.
9. **Plan to cook → prepare → shopping list** (Phase A — [shared-shopping-list.md](shared-shopping-list.md)): from the library, user adds **several saved recipes** to a **plan to cook**; opens **prepare** to mark ingredients **at home** vs **need**; generates a **shared shopping list** with a link for someone else to shop. Implementation order may start with **one recipe** before multi-recipe plans.

## Family collaboration

Recipe sourcing can be shared through a focused family recipe workspace rather
than the full personal dashboard. The owner creates a household invite link;
the collaborator signs in or creates an account, accepts the invite, and joins
as `collaborator`.

Initial scope:

- Route: `/family/recipes`.
- Owner can create a collaborator invite link.
- Household members can add recipe candidates with title, source URL, notes,
  and optional pasted recipe text/markdown.
- Household members can review candidates by status:
  `new`, `want_to_try`, `looks_good`, `needs_changes`, `accepted`, `rejected`.
- Canonical saved recipes remain separate from recipe candidates; accepting a
  candidate is the handoff point for later conversion into `saved_recipes`.

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
- Allowed starting surfaces: family recipes, recipe generator, plan to cook,
  and birthdays.
- Owner-only operational areas such as tasks, renewals, learning, growing,
  context, digest preview, and promo watchlist remain hidden/blocked for
  collaborators.

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
| `quick-weekday` | Snabb vardagsmiddag |
| `fest-weekend` | Fest / helg |
| `grill-summer` | Grill / sommar |

**Rationale (Sweden):** Covers **husman** and **fisk/skaldjur** (very common home and store focus), **major restaurant cuisines** available in most Swedish cities (Italian, various Asian, Indian, Middle Eastern, American, Mexican), **Mediterranean** cluster, **everyday vs fest**, **soup/stew**, **quick weekday**, and **grill** (strong seasonal pattern).

**Vegetarian** is **not** a row in this list — it is only the **checkbox** so it can combine with any food type (e.g. `italian` + vegetarian).

## Data

| Concern | Mechanism (v1) |
|--------|------------------|
| Ingredient picks | Array of strings from ICA catalog (`watchlistText`), min 1, max reasonable cap (e.g. 15) to match promo watchlist spirit. |
| Food type | Single English `food_type_id` from `recipe-food-types.json` (e.g. `thai`, `swedish-nordic`). |
| Vegetarian request | Boolean `vegetarian` on the generate request and stored on saved recipes for display. |
| Excluded meal titles | Optional `excludeMealTitles: string[]` on **generate** only (not stored as a column unless you want audit); trim, dedupe, cap count/length server-side so prompts stay bounded. |
| Recipe ingredient item | Structured object: `{ text, ingredient_label, amount }` for each ingredient in a generated/saved recipe. |
| Saved recipes | Supabase `saved_recipes` (or equivalent), RLS per user. |
| **Tested** | Boolean `tested`, default `false`. |

**Suggested columns** (implementation detail):

- `title`, `food_type_id` (text), `vegetarian` (boolean — *generation was vegetarian*), `ingredient_picks` (JSONB array of strings — ICA labels), `ingredients` (JSONB array of `{ text, ingredient_label, amount }`), `steps`, `tested`, `source`, timestamps.

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
| `ingredientTexts` | `string[]` | ICA `watchlistText` values; min 1, max ~15. |
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
| POST | `/api/recipes/generate` | Body: `{ "ingredientTexts": string[], "foodTypeId": string, "vegetarian": boolean, "excludeMealTitles"?: string[] }` → AI list, not persisted. Empty or omitted `excludeMealTitles` means no exclusions. |
| GET | `/api/recipes` | List saved recipes. |
| POST | `/api/recipes` | Save one recipe (+ metadata above). |
| PATCH | `/api/recipes/[id]` | Includes `{ "tested": boolean }`. |
| DELETE | `/api/recipes/[id]` | Remove. |

## AI contract

- **Input**: ICA ingredient strings + **Swedish `label`** looked up from `food_type_id` + `vegetarian` flag + Swedish home-cook context (metric, [`promo-meal-plan.md`](promo-meal-plan.md)-style realism).
- **`excludeMealTitles`**: When non-empty, the prompt must instruct the model to **not** output those dishes or **obvious renames** of the same idea (e.g. same core dish with a minor title tweak). Prefer **new** concepts while still using the chosen ingredients and food type. If the exclusion list is long, the model may need to stretch creativity within constraints—still return up to the meal cap.
- If **vegetarian** is true: explicitly forbid meat, fish, shellfish, gelatin, animal rennet in instructions; keep tone practical for Swedish supermarkets.
- **Output**: capped list of meals with `title`, structured `ingredients[]` (`text`, `ingredient_label`, `amount`), `steps[]` / `cooking_note`, optional `meal_kind`.
- Implement with structured JSON in `@agent/shared`, same family as `generatePromoMealPlanForWeek`.

**Max meals**: **8** (align with Phase 9 TASKS).

**Limits (server)**: Cap `excludeMealTitles` length (e.g. max **40** entries, each trimmed, max **120** characters per title, case-fold dedupe) before calling Gemini to avoid oversized prompts.

## Acceptance criteria

1. Ingredients are chosen from the **ICA catalog** (same JSON + validation approach as promo picker); user can generate without free-text ingredients unless optional “custom phrase” is added later.
2. Food type is one preset; **Vegetarian** is a separate checkbox and is respected in prompts.
3. User can add recipes to the library; **Tested** toggles independently.
4. Library shows whether the recipe was saved from a **vegetarian** generation run.
5. User can supply **`excludeMealTitles`** (including reusing last batch titles) and get **new** suggestions without changing ingredients or food type; server enforces caps on the list.

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
