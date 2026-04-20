# Phase 08.1: Improving Tasks and Growing — Scope

**Status**: In Progress (Refined)

## Goal

Refine the **task management** experience with deep details and enhance the **seasonal gardening (Growing)** catalog with merging capabilities. This "mini-phase" ensures that converted tasks are useful and the suggestion catalog remains clean as more sources are added.

## Development Plan

### Slice A — Task Detail & Integration
1. **Single Task View**: Dedicated page at `/tasks/[id]` showing full body, due dates, and related knowledge for Growing tasks.
2. **Dashboard Integration**: Clickable task titles leading to the detail view.
3. **Email Deep Linking**: Update the daily digest to link Growing tasks directly to their detail pages in the dashboard.

### Slice B — Growing Catalog Management
1. **Merge Growing Windows**: Functional UI and API to combine multiple similar windows (e.g., from different YouTube sources) into one primary window, merging tags and reassining tasks.
2. **Top-up Logic**: Refactor suggestion generation to "fill up" the weekly list if suggestions are dismissed.

## Planned Deliverables
- **Task Detail Page**: `/tasks/[id]` with full context and related knowledge.
- **Merge Window Tool**: Selection UI and backend logic for catalog maintenance.
- **Smarter Weekly Suggestions**: Top-up logic to keep the "This Week" view full.

## Out of Scope
- Editing Growing knowledge nuggets (planned for later).
- Collaborative merging (single-user model for now).

## Task List
See [TASKS.md](./TASKS.md) for detailed implementation status.
