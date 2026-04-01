# Growing Season Tracker

## Overview

Stockholm-specific seasonal gardening. Seed, transplant, prune, harvest, protect. Sources: YouTube videos and blog articles.

## Profile

Editable context persisted in `growing_profiles`: city, country code, space type, experience level, interests. Dashboard exposes a form; weekly suggestions and knowledge scoring use saved values.

## Sources

- **YouTube** — Add URL, paste or fetch transcript, extract tips → `growing_knowledge`, `growing_windows`
- **Blog** — Add URL, fetch or paste content, same extraction pipeline

## Weekly Suggestions ("This Week" Tab)

The "This Week" system provides personalized, seasonal gardening tasks based on the user's profile and the current date in Stockholm.

### Selection & Filtering Logic
Suggestions are pulled from the `growing_windows` catalog using the following constraints:
- **Seasonal Relevance**: The current month must fall within the window's `start_month` and `end_month` (supports wrap-around windows).
- **Verification**: Only windows marked as `verified = true` are eligible.
- **Task Filtering**: Windows already connected to an active or completed task (via `tasks.window_id`) are excluded to prevent redundant suggestions.
- **Weekly Deduplication**: Windows already present in the `growing_suggestions_log` for the current week number (stored in `week_number`) are skipped during generation to maintain a stable list.

### Scoring & Ranking
Eligible windows are scored to prioritize the most relevant content:
- **Base Score**: The `priority` value from the `growing_windows` table.
- **Interest Bonus**: A **+3 point bonus** is added if any of the window's `tags` match the user's defined `interests` in their `growing_profiles`.
- **Tie-breaking**: If scores are equal, windows are sorted alphabetically by `item_name`.

### Limits & Groups
The system organizes weekly content into two distinct columns in the dashboard:

#### 1. This Week in Stockholm (Actions)
- **Logics**: High-priority, seasonally-dependent activities that are critical for gardening success in the current window.
- **Criteria**: Selected where `suggestion_kind = 'action'`.
- **Limit**: The top **10** highest-scored actions (sorted by priority + interest match).
- **Focus**: Time-sensitive tasks like sowing, transplanting, harvesting, or winter protection.

#### 2. Knowledge for your actions
- **Logics**: Supportive guidance pulled from `growing_knowledge` to help execute selected actions.
- **Criteria**: Knowledge rows are ranked by overlap with selected action tags, action names, and profile interests.
- **Limit**: Up to **10** top matches.
- **Focus**: Practical context and tips directly related to this week’s action plan.

### Lifecycle & Conversion
- **Storage**: Suggestions are persisted in `growing_suggestions_log` with `week_number` set to the current ISO week and `status = "pending"`.
- **Planner Integration**: Clicking "Add to Planner" creates a new `tasks` entry. The task inherits the `window_id`, and the suggestion log is updated to `status = "converted"` with a link to the `converted_task_id`.
- **Supporting Knowledge**: Supporting knowledge is not stored in `growing_suggestions_log`; it is computed on read from verified `growing_knowledge`.

### Generation Schedule
Suggestions are automatically synchronized by a background worker on **Sundays** and **Wednesdays** at 05:30 UTC. The "This Week" tab in the dashboard also triggers generation on-demand if the current week's log is empty.

## Data

| Table | Purpose |
|-------|---------|
| `growing_profiles` | City, space_type, experience_level, interests[] |
| `growing_sources` | YouTube/blog URLs, transcript, status |
| `growing_windows` | Seasonal activity catalog (item_name, start_month, end_month, stockholm_note) |
| `growing_knowledge` | Reference nuggets from sources |
| `growing_suggestions_log` | Weekly suggestions + conversion lifecycle |

## Related

- [Dashboard](dashboard.md) — Growing section
- [Daily Digest](daily-digest.md) — Garden This Week, New Growing Knowledge
- [Weekly Suggestion Generation Logic](../../packages/shared/docs/generate-weekly-suggestions.md) — Detailed `generateWeeklySuggestions` flow
