# `generateWeeklySuggestions` Logic

This document explains how `generateWeeklySuggestions` in `packages/shared/src/growing/weekly.ts` builds the weekly suggestion set.

## Goal

For the current ISO week number, generate a fresh weekly set with:

- up to 10 `action` suggestions

Suggestions are selected from verified catalog windows and inserted into `growing_suggestions_log` while avoiding windows already converted into tasks.

## Inputs and Output

- **Inputs**
  - `supabase: SupabaseClient`
  - `profile: GrowingProfile`
- **Output**
  - `Promise<GrowingSuggestion[]>` for the week

## Helper Functions Used

- `getISOWeekNumber(now?)`
  - Returns ISO week number in UTC (`1-53`).
- `isMonthInRange(month, startMonth, endMonth)`
  - Handles normal and wrap-around month ranges (for example, Nov to Feb).
- `scoreWindow(window, interests)`
  - Base score is `window.priority`.
  - Adds `+3` if any normalized profile interest matches any catalog tag (substring check).

## Step-by-Step Flow

1. Compute current ISO week number.
2. Clean up existing rows in `growing_suggestions_log` for the current `week_number`.
3. Fetch verified rows from `growing_windows` and keep only rows where the current week maps to a month that is inside each row's `start_month` / `end_month` range.
   - Month is derived from the current week number before applying `isMonthInRange`.
4. Fetch all `tasks` where `window_id` is not null and build a restricted `window_id` set from that list.
5. Filter catalog windows to those whose `id` is not in `restrictedWindowIds`.
6. Score and sort candidates:
   - Higher score first (`priority + optional tag bonus`).
   - Tiebreak by `item_name` alphabetically.
7. Keep only `action` windows and take the top 10.
8. Upsert selected rows into `growing_suggestions_log` with conflict key `week_number,window_id`.
   - The same `window_id` can appear again in other weeks because `week_number` is part of the key.
9. Return the rows for the current week after insert/upsert.

## Supporting Knowledge Flow

After weekly actions are selected, supporting knowledge is fetched separately:

1. Take the selected action `window_id`s.
2. Load corresponding `growing_windows` rows to collect tags and action names.
3. Build a keyword set from action tags, tokenized action names, and profile interests.
4. Load recent verified `growing_knowledge` rows.
5. Score knowledge rows by overlap with action keywords (tags and text).
6. Return top matches grouped per catalog window as `supporting_knowledge` in the weekly API response:
   - each group contains `window_id` and `knowledge[]` (from `generateWeeklySupportingKnowledge` over `growing_windows` rows).

## Persistence Shape

Each inserted row is mapped from a `growing_windows` record:

- `profile_id` <- `profile.id`
- `window_id` <- `window.id`
- `title` <- `window.item_name`
- `details` <- `window.stockholm_note`
- `suggestion_kind` <- `window.suggestion_kind`
- `suggested_bucket` <- `window.suggested_bucket`
- `week_number` <- current ISO week number (for example, `14`)
- `status` <- `"pending"`

## Error Behavior

The function throws explicit errors when any major data operation fails:

- Cleanup of current-week suggestions
- Read catalog windows
- Read tasks for restricted window IDs
- Upsert new action suggestions
- Final fetch after upsert

## Practical Notes

- The function is idempotent for a given week because of `upsert` with `week_number,window_id`.
- The same `window_id` can exist in multiple weeks by design.
- If there are not enough available catalog windows, fewer than 10 per kind may be returned.
- Matching interests to tags is substring-based and case-insensitive.

