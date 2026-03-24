# Phase 07: Stability & Polish

## Goal
Stabilize the growing suggestions logic and resolve UI inconsistencies in the dashboard.

## Scope
- **API Corrections**: Fix `GET /api/growing/weekly` to correctly separate and return actions and inspirations.
- **Deterministic Sorting**: Ensure suggestions are sorted consistently across API and Worker.
- **Duplicate Prevention**: Enhance Worker and Refresh logic to handle existing suggestions (converted/dismissed) gracefully.
- **UI Improvements**: Update dashboard components to handle inspiration states correctly.
- **Email Preview Improvements**: Include task bodies in growing tasks and modernize the email template using React Email Tailwind.

## Success Criteria
- [ ] `actions` includes all suggestions with `suggestion_kind = 'action'`.
- [ ] `inspirations` includes all suggestions with `suggestion_kind = 'inspiration'`.
- [ ] Refreshing inspirations doesn't re-suggest items already converted to tasks this week.
- [ ] Sorting is consistent and doesn't "jump around" on refresh.
