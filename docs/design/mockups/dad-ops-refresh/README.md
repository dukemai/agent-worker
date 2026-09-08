# Dad-Ops style refresh — mockup source

Source files for the visual-direction mockup referenced in [`docs/DESIGN-SYSTEM.md`](../../DESIGN-SYSTEM.md#visual-direction-2026-refresh). Approved 2026-09-07.

- `Main.dc.html` — Dashboard Home (task board, renewals, birthdays).
- `Learning.dc.html` — Learning Programs screen (upload, program list, day browser).
- `Growing.dc.html` — Growing Season Tracker, "This Week" tab (recommended actions + supporting knowledge).
- `Cooking.dc.html` — Family recipe collaboration, "Collect ideas" tab (style overview + review queue).
- `Trips.dc.html` — Trip Ops board (Ideas/Planning/Upcoming/Archived Kanban, new-trip form, countdowns and readiness warnings).
- `canvas.json` — layout manifest for the artboards.

These are static, view-only mockups (no wired-up interactions) authored as Claude Design Components. Live, interactive version: https://claude.ai/code/artifact/6aeaf45d-db3d-46e1-9534-9aae65c45834

To re-render these files locally, they need Claude Code's `design` skill (`seed-canvas.mjs` + `payload.template.html`) — they are not standalone HTML pages on their own.
