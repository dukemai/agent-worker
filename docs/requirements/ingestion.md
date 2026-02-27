# Ingestion Pipeline

## Overview

Email is the primary input. Tasks are extracted and bucketed for the dashboard and daily digest.

## Workflow

1. Email is forwarded or a Gmail label is applied.
2. Cloudflare Worker receives the SMTP stream or POST request.
3. `postal-mime` cleans the payload.
4. Gemini 2.5 Flash analyzes the text against dad-specific rules (e.g., school clothes = high priority).
5. Tasks are inserted into the appropriate Supabase bucket (`today`, `this_week`, or `later`).

## Data

| Table | Purpose |
|-------|---------|
| `tasks` | All tasks (id, title, original_body, due_date, status, metadata, source) |
| `today_tasks` / `this_week_tasks` / `later_tasks` | Bucket membership (task_id FK) |

## Related

- [Dashboard](dashboard.md) — displays bucketed tasks
- [Daily Digest](daily-digest.md) — includes tasks in morning email
