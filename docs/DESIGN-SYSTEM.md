## Design system

This document captures the current design system conventions for the dashboard and worker UIs. It is intentionally lightweight and focuses on the building blocks we actually use in the codebase today.

### Color system

- **Semantic, not brand-first**
  - We primarily use Tailwind’s semantic tokens (`bg-card`, `text-muted-foreground`, `border-input`, etc.) plus a small set of accent hues (`emerald`, `amber`, `indigo`, `blue`, `teal`, `red`) for status and emphasis.
  - All colors must work in both light and dark mode; when we introduce a tinted background, we add an explicit dark-mode counterpart.

- **Status colors**
  - **Success / “done” state**
    - Accent hue: **emerald**.
    - Examples:
      - Task cards in `done` state use:
        - Light: `border-emerald-200/80 bg-emerald-50/70`.
        - Dark: `dark:border-emerald-900/45 dark:bg-emerald-950/30`.
      - Weekly growing “recommended actions” containers use `border-emerald-100/50 bg-emerald-50/20`.
    - Usage rules:
      - Use emerald when a user has **completed** or **planned** something (e.g. `Planned` chip in growing weekly tab).
      - Avoid using emerald for neutral informational blocks.
  - **Attention / “pending” state**
    - Accent hue: **amber**.
    - Examples:
      - Pending task cards use:
        - Light: `border-amber-200/70 bg-amber-50/90`.
        - Dark: `dark:border-amber-900/35 dark:bg-amber-950/20`.
      - Growing knowledge tags use `bg-amber-100 text-amber-800 border-amber-200`.
    - Usage rules:
      - Use amber to indicate **queued / upcoming work** or **supporting tips**, not errors.
      - Do not combine with red in the same component; pick one semantic.
  - **Error / destructive**
    - Accent hue: **red** (via `destructive` semantic).
    - Examples:
      - Error text: `text-red-600`.
      - Destructive buttons: `variant="destructive"` (maps to red background in the button component).
    - Usage rules:
      - Only use red for **failure**, **irreversible actions** (delete), or strong warnings.
      - Pair with concise copy; never use red for neutral state tags.

- **Neutrals and surfaces**
  - **Cards and panels**
    - Default card container: `bg-card text-card-foreground rounded-xl border py-6 shadow-sm`.
    - For “section containers” where nested cards exist (e.g. task buckets), we often drop the border and shadow:
      - `border-0 bg-transparent shadow-none` and move emphasis to the inner items.
  - **Muted text**
    - Use `text-muted-foreground` for helper text, counts, and empty states.
    - Use `italic text-muted-foreground` for “no data” messages.

- **Interactive elements**
  - **Buttons**
    - Base button uses semantic variants:
      - `default`: primary actions.
      - `secondary`: secondary but still positive actions (e.g. “Create profile”).
      - `outline`: neutral actions or toggles (e.g. “Growing context” trigger, move actions).
      - `ghost`: lightweight icon-only actions (e.g. open link, delete, mark done).
      - `destructive`: destructive actions (delete task).
    - Sizing:
      - `default` for primary CTAs.
      - `sm` for inline actions in cards.
      - `xs` or `icon-xs` for compact controls to avoid visual noise in dense lists.
  - **Badges and chips**
    - Use `Badge` for small categorical labels (e.g. `renewal`, action state chips).
    - Prefer `variant="outline"` for neutral labels; use semantic backgrounds (emerald/amber) only when the badge itself conveys status.

### Layout conventions

- **Page containers**
  - All dashboards use `max-w-7xl px-4 py-6 mx-auto` as the primary content width.
  - The top area above tabs is reserved for small contextual actions (e.g. `Growing context`, “Add task” button).

- **Columns and lists**
  - Multi-column boards (tasks) are implemented as:
    - A neutral parent grid (`md:grid md:grid-cols-3 gap-4`).
    - Each column is a `BucketCard` with a light or transparent surface and an inner list of task cards.
  - Loading states and counts are **per column**, not global:
    - When a bucket is loading, show `Loading tasks…` inside that column.
    - When a bucket is empty (and not loading), show `No tasks`.
    - If a bucket has items, show a count in the header, e.g. `Today (3)`.

### When adding new UI

- Prefer **semantic tokens** (`bg-card`, `text-muted-foreground`, button `variant` props) before hard-coding Tailwind color utilities.
- When you do introduce a new tinted background:
  - Provide both light and dark equivalents.
  - Reuse one of the existing accent hues (emerald, amber, indigo, blue, teal, red) with the same semantics described above.
- For dense surfaces (boards, lists), avoid stacking too many bordered cards:
  - Use a light section container + stronger treatment on the primary items.

