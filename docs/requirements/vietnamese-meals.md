# Vietnamese meals catalog

## Purpose

Build a recipe-first Vietnamese meal catalog for the dashboard. The catalog stores
canonical Vietnamese dishes as reusable inspiration, then lets the user generate
recipe-library suggestions from selected published meals.

This is a curated food knowledge base, not nutrition or medical advice.

## User flow

1. Open `/vietnamese-meals`.
2. Paste one Vietnamese meal name per line.
3. AI enriches unsaved draft rows with canonical names, English summaries, tags,
   typical ingredients, and lightweight tourist notes.
4. User reviews and saves drafts.
5. User publishes reviewed meals.
6. User selects one or more published meals and generates recipe suggestions.
7. User saves selected suggestions into `saved_recipes` with
   `food_type_id = "vietnamese"`.
8. The app links saved recipes back to the source Vietnamese meal rows.

## Data

- `vietnamese_meals`: owner-scoped meal catalog rows with Vietnamese/English
  names, slug, status, tag arrays, typical ingredients, tourist notes,
  confidence, and timestamps.
- `vietnamese_meal_recipe_links`: owner-scoped links from catalog meals to
  `saved_recipes` with `canonical`, `variant`, or `inspired_by` relation.

Tags are text arrays in v1 so the ontology can evolve before normalizing into a
dedicated tag table.

## API

| Method | Path | Role |
|---|---|---|
| GET | `/api/vietnamese-meals` | List meals with optional status/search/tag filters. |
| POST | `/api/vietnamese-meals/enrich` | AI-enrich `{ names: string[] }` into unsaved drafts. |
| POST | `/api/vietnamese-meals` | Save one or many reviewed meal drafts. |
| PATCH | `/api/vietnamese-meals/[id]` | Edit fields and publish/archive rows. |
| DELETE | `/api/vietnamese-meals/[id]` | Permanently delete a row and its recipe links. |
| POST | `/api/vietnamese-meals/recipe-suggestions` | Generate recipe suggestions from published meal ids. |
| POST | `/api/vietnamese-meals/[id]/recipe-links` | Link an existing saved recipe to a meal. |

## Out of scope

- Tourist-facing app UI.
- Fully normalized tag taxonomy.
- Automatic publishing without human review.
