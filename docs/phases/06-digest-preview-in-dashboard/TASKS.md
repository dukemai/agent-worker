# Phase 6: Digest Preview in Dashboard — Implementation Tasks

**Total estimate**: ~3.5–4 hours

## Prerequisites

- Phase 7 review completed for Phase 6 (SCOPE.md + Phase 5 RETRO.md)
- Daily digest email generation path understood (shared digest utilities and worker cron)

## Tasks

### Task 1: Locate and document current digest generation path — 30 min

**Goal**: Identify exactly where and how the daily digest email content is built today (requirements, architecture docs, shared package, worker cron, email template).

**Steps**:

1. Review `docs/requirements/daily-digest.md` to understand the intended sections, data sources, and rules for the digest.
2. Review `docs/ARCHITECTURE.md` for the high-level flow (worker cron → shared digest utilities → email provider).
3. Find the digest builder utilities in the shared package (digest functions, HTML builder, narrative generator).
4. Trace the worker cron job that invokes these utilities and hands off to Resend.
5. Capture a short summary of input/output shape for the digest payload (what the UI will need).

**Files**:

- `docs/requirements/daily-digest.md`
- `docs/ARCHITECTURE.md`
- `packages/shared/src/digest.ts`
- `apps/worker/src/crons/daily-digest.ts`

**Done when**:

- A short summary is added as comments or notes in `TASKS.md` under this task, and we know what data a preview endpoint should return.

### Task 2: Add backend digest-preview endpoint — 1–1.5 h

**Goal**: Expose an authenticated dashboard API endpoint that returns the next digest payload without sending email.

**Steps**:

1. Design the JSON shape for a digest preview (tasks summary, renewals, growing, learning) based on Task 1, and write down the TypeScript interfaces / JSON types for both **input** (query params/body, if any) and **output**.
2. Add a new Next.js API route under `apps/dashboard/src/app/api/digest/preview/route.ts` that:
  - Authenticates the user via existing dashboard auth helpers.
  - Calls into shared digest utilities (or factors out common logic from the worker) to compute the digest sections.
  - Returns a JSON payload suitable for the dashboard UI.
3. Ensure the endpoint is idempotent and has no side effects (no emails sent, no logging of “sent” state).

**Files**:

- `apps/dashboard/src/app/api/digest/preview/route.ts`
- `apps/dashboard/src/lib/digest-api.ts` (if a dedicated client helper is created)
- `packages/shared/src/digest.ts` (if small refactors are needed to reuse logic)
- `docs/phases/06-digest-preview-in-dashboard/digest-preview.types.ts` (sample TypeScript types for input/output shape)

**Done when**:

- Hitting `GET /api/digest/preview` in dev returns a JSON payload with all digest sections populated and matching the documented TypeScript/JSON types, and no emails are sent.

### Task 3: Build digest preview UI panel in dashboard — 1–1.5 h

**Goal**: Render a readable preview of the digest email in the dashboard, using the preview endpoint.

**Steps**:

1. Create a new dashboard component (e.g. `DigestPreviewCard`) that:
  - Uses TanStack Query to call `fetchDigestPreview`.
  - Renders sections for tasks, renewals, growing, and learning in a layout similar to the email.
  - Clearly indicates that it is showing **tomorrow’s daily digest** (next day in digest logic), and displays the preview date.
2. Add a dedicated menu / navigation entry (e.g. “Preview email” or “Digest preview”) that routes to or focuses the preview UI.
3. Decide where this preview lives (e.g. home page tab, dedicated “Digest” tab, or within an existing page) and wire it into the dashboard navigation.
4. Add loading and error states consistent with other dashboard components.

**Files**:

- `apps/dashboard/src/components/dashboard/digest-preview-card.tsx`
- `apps/dashboard/src/app/page.tsx` or another appropriate page component
- `apps/dashboard/src/lib/digest-api.ts`

**Done when**:

- The dashboard shows a digest preview that matches the structure and key content of the sent email for the same day.

### Task 4: Polish, docs, and verification — 30–45 min

**Goal**: Ensure the digest preview is reliable, documented, and easy to maintain.

**Steps**:

1. Manually compare the dashboard preview with an actual sent digest email for a test day and align any mismatches.
2. Add or update documentation:
  - Brief note in `docs/DASHBOARD-ARCHITECTURE.md` explaining the digest preview flow.
  - If needed, an entry in `docs/DECISIONS.md` for any design choices (e.g., how much of the email we mirror exactly).
3. Run linting and basic checks on updated files.

**Files**:

- `docs/DASHBOARD-ARCHITECTURE.md`
- `docs/DECISIONS.md`
- Any files touched in Tasks 1–3

**Done when**:

- Preview vs. real email are aligned for a test run, docs mention the new preview, and linters pass.

## Order

Tasks are ordered by dependency and should generally be executed in sequence:

- Task 1 → Task 2 → Task 3 → Task 4.

