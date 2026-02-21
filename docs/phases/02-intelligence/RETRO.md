# Phase 2: Intelligence & Persistence — Retrospective

## What went well

- Gemini's JSON mode eliminates parsing issues — structured output is directly insertable.
- System prompt with Stockholm-context and dad-specific rules catches edge cases well (school clothes, BRF meetings).
- Graceful fallback: without `GEMINI_API_KEY`, tasks default to `later_tasks` (Phase 1 behavior preserved).

## What could be better

- Prompt engineering is iterative — hard to unit test. Currently relying on fixture replay to verify extraction quality.
- Mixed Swedish/English emails occasionally produce inconsistent date parsing.

## Lessons for future phases

- Keep prompts in separate files (`src/prompts/`) for version control and review.
- Add more fixture variety (Swedish-only, English-only, multi-language) to catch prompt regressions.
