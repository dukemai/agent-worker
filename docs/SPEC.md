# Dad-Ops Agent — Product Specification

## Executive Summary

The **Dad-Ops Agent** is a personal executive assistant designed to offload the "mental load" of a busy senior developer and father in Stockholm. It consolidates fragmented information (school emails, BRF updates, seasonal gardening, and shopping deals) into a structured dashboard and a daily email digest.

Current direction is **Ops-first**:
- Prioritize what to do **today**, **tomorrow**, and **this week**.
- Support resumable state for interrupted work from mobile.
- Keep morning email digest as the primary decision surface.

## User

One user: a busy dad in Stockholm who checks email every morning and has fragmented mobile access throughout the day while looking after kids.

## Feature Specs

| Area | Spec | Summary |
|------|------|---------|
| Ingestion | [requirements/ingestion.md](requirements/ingestion.md) | Email → Worker → Gemini → Supabase buckets |
| Daily Digest | [requirements/daily-digest.md](requirements/daily-digest.md) | Morning email at 06:30 Stockholm |
| Dashboard | [requirements/dashboard.md](requirements/dashboard.md) | Tasks, Renewals, Learning, Context, Growing |
| Renewals | [requirements/renewals.md](requirements/renewals.md) | Expiration reminders, escalation, recurrence |
| Growing | [requirements/growing.md](requirements/growing.md) | Seasonal tracker, sources, suggestions |
| Promotions | [requirements/promotions.md](requirements/promotions.md) | Deal extraction and matching |
| Learning | [requirements/learning.md](requirements/learning.md) | Topic/category lessons (deferred: agents) |

## Data Schema (Supabase)

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `tasks` | id, title, original_body, due_date, status, metadata(jsonb), source | All tasks and reminders |
| `today_tasks` / `this_week_tasks` / `later_tasks` | task_id (FK) | Bucket membership |
| `learning_profile` | id, topic, profile_type, current_level, daily_goal, status | Learning curriculum settings |
| `learning_log` | id, profile_id (FK), content, feedback | AI-generated lessons + feedback |
| `family_context` | key, value, last_updated | User preferences (shopping list, plant list, interests) |
| `growing_profiles` | id, city, space_type, experience_level, interests[] | Gardening preferences |
| `growing_sources` | id, url, transcript, status | YouTube/blog sources |
| `growing_windows` | id, item_name, suggestion_kind, start_month, end_month, stockholm_note | Seasonal activity catalog |
| `growing_knowledge` | id, source_id, title, content, category | Reference nuggets from sources |
| `growing_suggestions_log` | id, window_id, title, details, status, converted_task_id | Weekly suggestion lifecycle |

Renewals: `tasks` with `metadata.item_type = "renewal"`. Promotions: `tasks` with `metadata.email_type = "promotion"`.

## Environment

- **City**: Stockholm, Sweden
- **Timezone**: Europe/Stockholm (CET/CEST)
- **Languages**: Swedish and English (mixed in school emails)
- **Weather**: OpenWeather API for Stockholm coordinates
