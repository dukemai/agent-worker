---
name: project-requirements
description: Defines baseline non-technical and technical requirements that apply to every project. Use when gathering requirements, writing specs, reviewing acceptance criteria, or creating a new project. Works alongside the project-plan skill.
---

# Project Requirements

Every project inherits a set of baseline requirements before any feature-specific requirements are added. These baselines reflect how the user builds and uses software — they are not optional.

## Baseline Non-Technical Requirements

These apply to **all projects** regardless of feature scope. When writing a spec or reviewing a plan, verify each one is addressed.

### NR1: Mobile-first design

- Design for phone screens first, then scale up to tablet/desktop.
- All primary flows must be usable on a 375px-wide viewport without horizontal scrolling.
- Touch targets must be at least 44x44px (11 Tailwind units / `min-h-11`).
- Forms must work well with mobile keyboards (correct input types, no tiny selects).

### NR2: Simplicity

- Minimize screens, taps, and decisions required to complete any action.
- Prefer single-screen flows over multi-step wizards.
- Default to sensible values so the user can skip optional fields.
- If a feature needs explanation, it is too complex — simplify first, document second.

### NR3: Reliability

- The app should work predictably. No silent failures.
- All mutations must show clear success or error feedback.
- Optimistic UI is acceptable only when paired with rollback on failure.
- External service failures (weather API, AI generation) must degrade gracefully — never block the core flow.

### NR4: Accessibility

- Color contrast must meet WCAG AA (4.5:1 for text, 3:1 for large text).
- Interactive elements must be keyboard-navigable.
- Use semantic HTML elements (`button`, `nav`, `main`, `article`) over generic `div` wrappers.
- Avoid relying on color alone to convey meaning — pair with text or icons.

### NR5: Performance

- Pages must be interactive within 3 seconds on a mobile connection.
- Avoid loading unnecessary data — fetch only what the current view needs.
- Prefer server-side rendering or static generation for initial page loads.
- Keep JavaScript bundle size conscious — avoid adding heavy dependencies for minor features.

### NR6: Privacy

- Collect only data that is directly needed for the feature to work.
- Never log or store sensitive information (passwords, tokens, full email bodies) beyond what is required.
- Use row-level security (RLS) or equivalent for multi-user data isolation.
- Be transparent about what data flows where (client, server, third-party API).

## Baseline Technical Requirements

These are the technical standards every project follows.

### TR1: Error handling

- API endpoints return structured error responses (`{ error: string }`), never raw stack traces.
- Client-side errors are caught and displayed to the user, not swallowed silently.
- Network errors are retried or shown as recoverable ("Retry" button), not permanent failures.

### TR2: Type safety

- TypeScript strict mode. No `any` types unless explicitly justified.
- API request/response shapes are typed and validated at boundaries.
- Database types are defined centrally (e.g., `types/database.ts`) and shared across components.

### TR3: Consistent patterns

- Follow existing codebase conventions before introducing new patterns.
- Use the same data fetching pattern across all dashboard pages (currently TanStack Query).
- Use the same component library (currently shadcn/ui) — do not mix UI frameworks.

### TR4: Testability

- Each implementation phase must be independently verifiable (see `project-plan` skill).
- API endpoints should be testable via curl or similar without needing the full UI.
- Database changes must include a migration file, never ad-hoc SQL.

## How to Use These Baselines

### When gathering requirements (Phase 1 of project-plan)

After collecting feature-specific requirements, cross-check against the baselines:

```
### Feature requirements
- FR1: [feature-specific requirement]
- FR2: [feature-specific requirement]

### Baseline compliance
- [x] NR1: Mobile-first — [how this feature addresses it]
- [x] NR2: Simplicity — [confirmation or note]
- [x] NR3: Reliability — [error/fallback handling plan]
- [x] NR4: Accessibility — [touch targets, semantic HTML noted]
- [x] NR5: Performance — [data loading strategy]
- [x] NR6: Privacy — [data scope noted]
- [x] TR1-TR4: [covered by standard patterns]
```

### When reviewing a plan or implementation

Use the baselines as a review checklist. If a plan violates a baseline, flag it before implementation starts. Common catches:

- Desktop-only layout with no mobile consideration (NR1)
- Multi-step flow that could be a single form (NR2)
- API call with no error handling in the UI (NR3, TR1)
- New dependency added for a feature that could use existing tools (NR5, TR3)

### When to make exceptions

Baselines can be overridden, but only explicitly:
- State the baseline being overridden.
- State the reason.
- Log it in `docs/DECISIONS.md` so it is traceable.
