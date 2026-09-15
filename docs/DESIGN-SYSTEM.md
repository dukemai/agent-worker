## Design system

This document captures the design system conventions for the dashboard and worker UIs. It is intentionally lightweight and focuses on the building blocks we actually use in the codebase today.

### Visual direction (2026 refresh)

Approved direction for a warmer, more editorial look, replacing the stock shadcn neutral-gray theme. **Not yet implemented in `globals.css`** — the tokens below are the target; today's code still uses the pure-grayscale values noted in "Neutrals and surfaces". Treat this section as the spec to implement against, not a description of current code.

- **Why**: the current theme is literally chroma-0 shadcn defaults (no brand color anywhere but status accents). This app is a personal family-ops tool, not a generic admin panel — the refresh gives it a warm, calm, lived-in feel instead of a generic dashboard look.
- **Surface tone**: base surfaces move from neutral gray to a warm, low-chroma neutral (hue ~60-75°, chroma ~0.01-0.02 — a warm parchment/cream, not a saturated color). Cards stay near-white but sit on a visibly warmer page background, so the page reads as one warm surface with slightly-lighter card "islands" rather than flat white-on-white.
  - Light: `--background: oklch(0.97 0.012 75)` (~`#faf6f0`), `--card: oklch(0.995 0.003 75)` (~`#ffffff`–`#fffdfa`), `--muted: oklch(0.94 0.02 70)` (~`#f4ede3`), `--muted-foreground: oklch(0.47 0.02 55)` (~`#6b6259`), `--border`/`--input: oklch(0.90 0.02 70)` (~`#e8ded0`), `--foreground: oklch(0.22 0.02 55)` (~`#241f19`).
  - Dark: `--background: oklch(0.16 0.012 55)`, `--card: oklch(0.21 0.014 55)`, `--muted: oklch(0.27 0.016 55)`, `--muted-foreground: oklch(0.68 0.015 60)`, `--border`/`--input: oklch(1 0.01 60 / 12%)`, `--foreground: oklch(0.95 0.01 70)`.
  - These are approximate oklch conversions of the mocked hex values — refine with an exact converter when wiring `globals.css`, but keep the hue/chroma family (warm, low-chroma) rather than snapping back to chroma 0.
- **Brand accent — amber**: amber is promoted from a status-only hue to the app's primary brand accent (nav wordmark, primary buttons, links, active-nav state, "today" markers) in addition to its existing "attention / pending" status meaning below — the two are compatible (amber already meant "pay attention"), but this is a deliberate widening of amber's role, not just a status color anymore.
  - Light: `--primary: oklch(0.62 0.14 45)` (~`#c96f34`), soft background `oklch(0.92 0.045 65)` (~`#f4e1cf`).
  - Dark: `--primary: oklch(0.72 0.13 50)`, soft background `oklch(0.30 0.05 50 / 40%)`.
- **Secondary accent — teal**: teal (previously unassigned in the hue list) becomes the general secondary/informational accent — active-status badges, secondary category tags, day-browser "in progress" indicators. Distinct from emerald (still reserved for "done/completed") and amber (attention/brand).
  - Light: `oklch(0.46 0.045 190)` (~`#3d6e68`), soft background `oklch(0.92 0.02 190)` (~`#dfe9e6`).
  - Dark: `oklch(0.72 0.06 190)`, soft background `oklch(0.30 0.03 190 / 40%)`.
- **Typography**: pair a serif display face with the existing sans body face, rather than an all-sans hierarchy.
  - Headings (`h1`–`h3`, page titles, card titles): **Newsreader** (Google Fonts, variable, optical size 6..72), falling back to `Georgia, serif`. Weight 500 for most headings, 600 for emphasis.
  - Body and UI copy: keep the existing **Geist Sans** (`--font-geist-sans`) — no change here, it's already warm/neutral enough and switching it would be a bigger, separate cost (icon/number alignment, existing component metrics).
  - Avoid Inter, Roboto, Arial, or Fraunces for the display face — already-overused choices that would undercut the "distinctive, not generic" goal of the refresh.
- **Cards and shadows**: move from a flat `border` + `shadow-sm` treatment to a softer, larger radius with a layered shadow doing more of the separation work.
  - Radius: ~16px (`rounded-2xl`-equivalent) instead of the current `rounded-xl` (~14.5px) default for primary content cards (task cards, program cards). Inputs/buttons/badges keep a tighter ~10px radius.
  - Shadow: a two-layer soft shadow — a 1px hairline (`0 1px 2px rgba(ink, 0.04)`) plus a diffuse ambient layer (`0 8px 24px -12px rgba(ink, 0.14)`) — instead of relying mainly on `border` for definition. Borders stay, but thinner/lighter (`--border` above), doing less of the visual work.
- **Chips/tags**: avoid the "rounded card + colored left-border accent bar" pattern for category tags — prefer a small pill `Badge`-style chip (soft background + accent-colored text, fully rounded) placed inline in the card header, not a border stripe down the side.

Reference mockup: [`docs/design/mockups/dad-ops-refresh/`](design/mockups/dad-ops-refresh/) (Home board, Learning programs, Growing season tracker, Recipes, Trip Ops, and Trip Detail screens), approved 2026-09-07. Live version: https://claude.ai/artifact/ECkmK1W5aihGJY5KQ5uAy1

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
  - **Current base tokens** (`apps/dashboard/src/app/globals.css`): `--background`/`--card`/`--muted`/`--border` etc. are today pure neutral gray (chroma 0 oklch, e.g. `--background: oklch(1 0 0)`, `--border: oklch(0.922 0 0)`). The "Visual direction" section above replaces these with warm, low-chroma equivalents — not yet applied to `globals.css`.
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

