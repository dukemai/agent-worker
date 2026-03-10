# Phase 6: Digest Preview in Dashboard — Scope

**Status**: planned

## Goal

Let the user preview the full daily digest email directly inside the dashboard, so they can see what will be sent without checking their inbox.

## Planned Deliverables

- Digest preview panel in the dashboard showing:
  - Tasks section (today / this_week / later summary)
  - Renewals section (grouped by urgency)
  - Growing section (this week in Stockholm + inspirations)
  - Learning section (if applicable)
- Backend endpoint to generate the next digest payload without sending email.
- UI integration that shares as much rendering logic as possible with the existing email template.
- Clear indication of when the preview was generated and for which date.

