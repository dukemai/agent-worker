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

### Known Issue: High-Season Timing Drift

Current recommendations can be technically seasonal but practically late during fast-moving growing-season weeks. For example, in early/mid June in Stockholm the system may still recommend `Avhärda försådda grönsaker` or `Blanda in jordförbättring före sådd/plantering`, even though optimal weather and rapid plant growth mean most vegetables should already be planted out and the useful action has shifted toward watering, feeding, tying/supporting, pest checks, thinning, succession sowing, and harvest readiness.

The root cause is that eligibility is mostly month-range based (`start_month` / `end_month`) plus priority. A broad month window treats all days in the range as equally good, and it has no model for:

- early / peak / late phase inside a month window
- time-sensitive prep work that should decay quickly once planting season is underway
- warm, dry, or unusually optimal weather that accelerates planting and maintenance urgency
- catch-up tasks that should be labelled as late recovery rather than normal recommended actions

### Strategy: Phase-Aware Recommendations

Improve weekly selection so each catalog window can express a practical phase, not only a month span:

- Add optional week-level timing fields such as `start_week`, `peak_start_week`, `peak_end_week`, and `end_week`, keeping month fields as a broad fallback.
- Add an `action_phase` or `timing_role` classification: `prep`, `planting`, `maintenance`, `harvest`, `protect`, `catch_up`.
- Apply recency decay after the peak window. Prep actions should lose score sharply after planting momentum has passed; maintenance and harvest actions should gain weight in high season.
- Use Stockholm weather context as an urgency modifier: warm sunny periods boost watering, feeding, support, thinning, pest checks, and planting-out only if still within the viable peak; rain/cold shifts toward protection, greenhouse checks, and indoor prep.
- Preserve late-but-useful actions as `catch_up` with honest copy, for example "Late catch-up: only do this if seedlings are still indoors", instead of presenting them as default best actions.
- Include a digest-level freshness check that suppresses or demotes actions whose title/details contain prep cues (`före sådd`, `avhärda`, `försådda`) once the current ISO week is past the configured peak/end week.

Success criteria:

- In early/mid June, recommended actions should prioritize what a Stockholm balcony/garden actually needs now: planting only remaining warm-season starts, watering, feeding, support, pest checks, thinning, succession sowing, and first harvests.
- Early-season prep can still appear as catch-up guidance when relevant, but should not crowd out high-season care.
- Digest copy should explain timing confidence: `do now`, `watch this week`, or `late catch-up`.

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
