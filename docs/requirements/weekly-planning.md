# Weekly Planning

## Purpose

Routine planning belongs in a predictable weekly reset rather than the exception-only morning digest. The Worker sends a separate planning email each Sunday at 19:30 Stockholm for the following Monday–Sunday.

## Content

- Rolling meal queue from `cook_plans` / `cook_plan_items`, with a link to plan and prepare.
- Latest shopping list and remaining `need` / `want` item count.
- Pending Today and This Week tasks, plus Later tasks due during the coming week.
- School, closure, family, and other planning dates occurring during the week.
- Birthdays within seven days and trips starting within fourteen days.
- Favorite activity options, respecting the post-school Summer Activities taper.

The weekly email is a planning ritual and therefore sends even when little is already configured; empty sections point to the appropriate planning action. Daily delivery remains governed by the exception send gate.

## Delivery

Cloudflare schedules both possible UTC offsets and the Worker gates on 19:30 in `Europe/Stockholm`, keeping delivery stable across daylight-saving changes. `POST /run-weekly-planning` supports an authenticated manual run using `WORKER_ADMIN_TOKEN`.
