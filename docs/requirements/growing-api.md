# Growing API Specification

This document defines the current dashboard API contract for Growing features under `apps/dashboard/src/app/api/growing`.

## Conventions

- **Auth**: all endpoints require authenticated user context via `getAuthedSupabase()`.
- **Content type**: JSON request/response unless noted.
- **Error shape**: `{ "error": "<message>" }` with relevant HTTP status.
- **Main statuses**:
  - `200` success
  - `201` created
  - `400` invalid input/business rule
  - `401` unauthenticated
  - `404` resource missing
  - `500` server/db error
  - `502` upstream worker failure
  - `503` worker integration not configured

## Weekly

### `GET /api/growing/weekly`
- Returns weekly suggestions and active profile.
- Requires an existing profile; returns `404` if no profile exists.
- Auto-seeds weekly suggestions from `growing_windows` when no pending suggestions exist.

Response:
- `week_start_date: string` (YYYY-MM-DD, Monday/UTC)
- `profile: GrowingProfile`
- `actions: GrowingSuggestion[]`
- `inspirations: GrowingSuggestion[]`

## Profile

### `GET /api/growing/profile`
- Returns latest profile.
- Returns `404` if no profile exists.

Response:
- `profile: GrowingProfile`

### `PATCH /api/growing/profile`
- Updates latest profile.

Request body (partial):
- `city?: string`
- `country_code?: string` (uppercased, max 10)
- `space_type?: "balcony" | "indoor" | "yard" | "mixed"`
- `experience_level?: "beginner" | "intermediate" | "advanced"`
- `interests?: string[] | string` (CSV string also accepted)

Response:
- `profile: GrowingProfile`

### `POST /api/growing/profile`
- Creates a new growing profile explicitly.
- Returns `409` if a profile already exists.

Request body (all optional, defaults applied when missing):
- `city?: string`
- `country_code?: string`
- `space_type?: "balcony" | "indoor" | "yard" | "mixed"`
- `experience_level?: "beginner" | "intermediate" | "advanced"`
- `interests?: string[] | string` (CSV accepted)

Response (`201`):
- `profile: GrowingProfile`

## Suggestions

### `PATCH /api/growing/suggestions/:id`
- Updates suggestion status.

Request body:
- `status: "pending" | "dismissed" | "done"`

Response:
- `suggestion: { id, status, updated_at }`

### `POST /api/growing/convert`
- Converts a pending suggestion into a task and places it in bucket.
- Marks suggestion as `converted` and stores `converted_task_id`.

Request body:
- `suggestion_id: string` (required)
- `bucket: "today" | "this_week" | "later"` (required)
- `due_date?: ISO8601 string | null`

Response (`201`):
- `success: true`
- `task: object`
- `bucket: "today" | "this_week" | "later"`

## Sources

### `GET /api/growing/sources`
- Returns sources list ordered by newest first.
- `transcript` is truncated to preview length (300 chars) for list payload.

Response:
- `sources: GrowingSource[]`

### `POST /api/growing/sources`
- Adds a source URL (YouTube or blog) in `queued` state.

Request body:
- `url: string` (required)
- `transcript?: string | null`

Response (`201`):
- `source: GrowingSource`

### `GET /api/growing/sources/:id`
- Returns full source object (includes full transcript).

### `PATCH /api/growing/sources/:id`
- Updates one or more source fields.

Request body (at least one required):
- `transcript?: string | null`
- `title?: string | null`
- `channel?: string | null`
- `description?: string | null`

Response:
- `{ "success": true }`

### `DELETE /api/growing/sources/:id`
- Deletes source.

Response:
- `{ "success": true }`

### `POST /api/growing/sources/:id`
- Triggers manual extraction through worker endpoint (`GROWING_WORKER_URL/process-growing`).

Response:
- Worker passthrough shape: `{ success, tips_extracted?, error? }`

### `POST /api/growing/sources/:id/clean`
- Deletes extracted knowledge/windows for source and resets source to `queued`.

Response:
- `{ "success": true }`

### `POST /api/growing/sources/:id/fetch-info`
- Fetches YouTube metadata (title/channel/description) and updates source.
- Only valid for YouTube URLs.

Response:
- `{ success: true, title, channel, description }`

## Knowledge

### `GET /api/growing/knowledge`
- Returns knowledge list with optional filters.
- Includes joined source info as `source`.

Query params (optional):
- `category` (enum)
- `tags` (CSV)
- `season_relevance` (`spring|summer|autumn|winter`, CSV allowed)
- `location` (substring match)

Response:
- `knowledge: GrowingKnowledgeItem[]`
- `filters: { category, tags, season_relevance, location }`

### `DELETE /api/growing/knowledge/:id`
- Deletes knowledge item.

Response:
- `{ "success": true }`

## Windows

### `GET /api/growing/windows`
- Returns windows with joined source metadata.

Response:
- `windows: GrowingWindowItem[]`

### `PATCH /api/growing/windows/:id`
- Updates verification and/or month range.

Request body (at least one required):
- `verified?: boolean`
- `start_month?: number` (1-12)
- `end_month?: number` (1-12)

Response:
- `{ "success": true }`

### `DELETE /api/growing/windows/:id`
- Deletes window.

Response:
- `{ "success": true }`
