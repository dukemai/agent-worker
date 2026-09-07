# Learning programs

Upload a complete, externally authored curriculum on `/learning`. Use the AI prompt dialog to copy a ready-made prompt with editable preference placeholders, format requirements, and the full JSON template. Paste it into another AI, fill in your preferences, and upload the resulting complete JSON file. The template is also available as a separate download. Every upload creates a separate program; multiple programs can be active concurrently.

## Format

Envelope: `schema: "dad-ops.learning-program"`, `version: 1`, `title`, `topic`, `total_days`, and `days`. There must be exactly 1–365 days, numbered uniquely from 1 to total_days. Titles and topic are limited to 200 characters, daily content to 20,000 characters, and optional resources to 20 non-empty strings of up to 500 characters. Oversized fields are rejected rather than silently truncated. HTTP(S) resources render as links; other references remain text.

## Progress and delivery

Each program starts active at `current_day = 1`. The daily digest includes the current day of every active program, even when unchanged since yesterday. Preview and sending never advance progress. Only **Mark day done** advances the pointer. Completing the last day sets status to completed without moving beyond total_days. No calendar start date is used.

Browse all programs, expand their full day list, and select any day to read its content and resources. The completion action appears only on an active program’s current day. Pause/resume and archive control digest inclusion. Completed, paused, and archived programs remain browsable and do not contribute digest items.

## API and persistence

Authenticated endpoints: GET `/api/learning/programs`; POST `/import`; GET/PATCH/DELETE `/{id}`; POST `/{id}/advance`. PATCH accepts active, paused, or archived; completed is assigned by advancing the final day. Advance accepts an optional `current_day` guard and uses a conditional update to reject concurrent changes with HTTP 409. Import stages the program paused, inserts all days in bulk, then activates it, cleaning up on failure.

`learning_programs` stores title, topic, total_days, current_day, status and timestamps. `learning_program_days` stores each numbered day’s title, content and resources with a cascading program foreign key. Both tables use authenticated RLS, matching this single-household app.

Apply migration `062_learning_programs.sql` before deploying the dashboard and Worker. The optional destructive script `supabase/manual/063_drop_legacy_learning.sql` is deliberately outside automatic migrations; apply only after production verification. Legacy generation, feedback, and profile endpoints are removed.

## Verification

Run `node --test apps/dashboard/src/lib/learning-programs.test.mjs`, shared tests, dashboard build, and Worker typecheck. With a migrated authenticated environment, upload the template, verify Day 1 in digest preview, advance to Day 2, complete Day 3, and confirm the program disappears from the digest. Also verify multiple active programs and pause/archive behavior.
