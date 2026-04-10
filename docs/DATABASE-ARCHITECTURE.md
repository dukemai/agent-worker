# Database Architecture

This document describes the Supabase/PostgreSQL data model for Dad-Ops, focusing on how core domains like Tasks, Learning, and Growing are structured and interconnected.

## Entity Relationship Diagram

```mermaid
erDiagram
    tasks ||--o| today_tasks : "is in"
    tasks ||--o| this_week_tasks : "is in"
    tasks ||--o| later_tasks : "is in"
    
    growing_profiles ||--o{ growing_suggestions_log : "receives"
    growing_windows ||--o{ growing_suggestions_log : "is suggested via"
    growing_windows ||--o{ tasks : "is directly linked to"
    tasks ||--o| growing_suggestions_log : "resolves"
    
    growing_sources ||--o{ growing_knowledge : "provides"
    growing_sources ||--o{ growing_windows : "defines"
    
    learning_profile ||--o{ learning_log : "tracks"
```

---

## Core Tables

### 1. Tasks & Buckets
The task system separates core data from view-specific membership.

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `tasks` | Central repository for all task data (title, body, due date, metadata). | Parental to all bucket tables. Linked to `growing_windows.id`. |
| `today_tasks` | Specific list for tasks to be done today. | `task_id` -> `tasks.id` |
| `this_week_tasks` | Specific list for tasks planned for this week. | `task_id` -> `tasks.id` |
| `later_tasks` | Specific list for tasks deferred for later. | `task_id` -> `tasks.id` |

### 2. Growing (Garden Tracker)
The gardening domain manages seasonal windows, extraction from sources, and personalized suggestions.

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `growing_profiles` | User preferences (city, interests, space type). | - |
| `growing_sources` | Scraped content from YouTube or Blogs. | - |
| `growing_windows` | Seasonal catalog (e.g., "Start tomatoes" Feb-Apr). | `source_id` -> `growing_sources.id`. Referenced by `tasks.window_id`. |
| `growing_knowledge` | Extracted atomic tips and reference material. | `source_id` -> `growing_sources.id` |
| `growing_suggestions_log` | Weekly instances of windows suggested to the user. | `profile_id`, `window_id`, `converted_task_id` |

### 3. Learning
A curriculum-based system for daily micro-learning.

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `learning_profile` | Defines topics and current learning progress. | - |
| `learning_log` | History of daily lessons and user feedback. | `profile_id` -> `learning_profile.id` |

---

## Key Connections & Data Flow

### The "Growing" Lifecycle
1. **Sources → Windows/Knowledge**: The extraction worker processes `growing_sources` and populates `growing_windows` (seasonal actions) and `growing_knowledge` (general tips).
2. **Profile + Windows → Suggestions**: A weekly cruncher matches user `interests` in `growing_profiles` against `growing_windows` to create records in `growing_suggestions_log`.
3. **Suggestions → Tasks**: When a user clicks "Add to Planner", a new entry in `tasks` is created. `growing_suggestions_log.converted_task_id` is updated, and `tasks.window_id` is populated directly.

### Task Conversion & Metadata
Tasks generated from other domains (like Renewals or Growing) store their origin in both direct columns and the `metadata` JSONB column:
- `item_type`: "growing", "renewal", "promotion"
- `window_id` (UUID): Direct reference to `growing_windows.id` (for growing tasks).
- `suggestion_id`: The specific log entry from the weekly run.

---

## Constraints & Security
- **RLS (Row Level Security)**: Enabled on all tables. Currently defaults to `authenticated` full access for the single-user model.
- **Cascading Deletes**: `ON DELETE CASCADE` is used for bucket memberships and extracted knowledge. `ON DELETE SET NULL` is used for suggestions and task-window links to preserve history.

---

## Detailed Schema Reference

### 1. Tasks Domain

#### `tasks`
Core task entity. Stores the unified payload for all task types.
- `id` (UUID, PK): Unique identifier.
- `created_at` (TIMESTAMPTZ): When the task was created.
- `title` (TEXT): The task headline.
- `original_body` (TEXT): The full description or extracted email body.
- `due_date` (TIMESTAMPTZ): Optional deadline.
- `status` (TEXT): Task state (`pending`, `done`).
- `window_id` (UUID, FK): Direct link to `growing_windows(id)`.
- `metadata` (JSONB): Specialized data (e.g., `item_type`, `suggestion_id`).
- `source` (TEXT): Origin of the task (default: `email`).

#### `today_tasks`, `this_week_tasks`, `later_tasks`
Membership tables for task buckets.
- `task_id` (UUID, PK, FK): Reference to `tasks(id)`. Uses `ON DELETE CASCADE`.

### 2. Growing Domain

#### `growing_profiles`
User gardening preferences and environment.
- `city` / `country_code`: Location for weather/growing season matching.
- `space_type`: `balcony`, `indoor`, `yard`, `mixed`.
- `experience_level`: `beginner`, `intermediate`, `advanced`.
- `interests`: Array of strings (e.g., `['tomato', 'herbs']`) used for suggestion scoring.

#### `growing_windows`
The static catalog of seasonal gardening opportunities.
- `item_key` (TEXT, Unique): Stable identifier for the window.
- `suggestion_kind`: `action` (must do) vs `inspiration` (nice to do).
- `start_month` / `end_month` (INT): The peak window for this activity (1-12).
- `priority` (INT): Default score for sorting.
- `verified` (BOOLEAN): Whether the window data has been human-reviewed.

#### `growing_suggestions_log`
The join table representing a specific window suggested to a specific profile for a specific week.
- `id` (UUID, PK): Unique identifier.
- `profile_id` (UUID, FK): Link to `growing_profiles(id)`.
- `window_id` (UUID, FK): Link to `growing_windows(id)`.
- `week_number` (INT): ISO week number associated with this suggestion row.
- `status`: `pending`, `dismissed`, `converted`, `done`.
- `converted_task_id` (UUID, FK): Links to the resulting task if "Add to Planner" was clicked.
- `title` (TEXT): Copied from window for historical record.
- `details` (TEXT): Copied from window for historical record.
- `suggestion_kind`: `action` vs `inspiration`.
- `suggested_bucket`: `today`, `this_week`, `later`.

#### `growing_sources` & `growing_knowledge`
Data from the ingestion pipeline (YouTube/Blogs).
- `growing_sources`: Tracks URLs, processing `status` (`queued`, `processing`, `done`), and full `transcript`.
- `growing_knowledge`: Individual tips extracted from sources. Includes `category` and `verified` status.

### 3. Learning Domain

#### `learning_profile`
- `topic`: The subject being learned.
- `curriculum_outline` (JSONB): The AI-generated path for this topic.

#### `learning_log`
- `content` (TEXT): The generated lesson text.
- `feedback` (TEXT): User rating/comments on the lesson quality.

### 4. Utilities

#### `family_context`
A simple key-value store for cross-cutting user preferences.
- `key` (TEXT, Unique): e.g., `shopping_list`, `seasonal_interests`.
- `value` (TEXT): The value associated with the key.

#### `promo_match_runs` & `promo_match_items`
Normalized storage for **manual imports** of Playwright output `watchlist-matches-only.json` (weekly promo tiles scored against `promo_watchlist`).
- **`promo_match_runs`**: One row per upload — `store_key`, `interests` (JSONB), `raw_json` (full payload), `created_at`, **`week_number`** (ISO week 1–53 at import, UTC; mirrors items for quick filtering without scanning children).
- **`promo_match_items`**: Child rows — `run_id`, `sort_order`, `week_number` (ISO week 1–53, UTC; same semantics as `growing_suggestions_log.week_number`), `interest`, `score`, `promotion_index`, `title`, `card_text`, `price_hint`, `image_url`, `source_url`, `store_key`. `ON DELETE CASCADE` from run.
- **RLS**: Same pattern as other single-user tables — `authenticated` full access.
