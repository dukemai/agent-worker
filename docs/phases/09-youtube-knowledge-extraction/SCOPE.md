# Phase 09: YouTube Knowledge Extraction — Scope

**Status**: planned

## Goal

Improve **knowledge ingestion from YouTube** so transcripts (or captions) become durable, searchable **growing knowledge** with good titles, tags, and verification workflow—reducing manual cleanup in the Knowledge Library.

## Planned Deliverables (initial)

- **Robust extraction**: Reliable transcript fetch (or caption fallback), chunking, and dedupe against existing `growing_knowledge` / sources.
- **Enrichment**: Auto-suggest tags, title normalization, and links to `growing_windows` or profiles where it helps.
- **Operator UX**: Clear status on the Sources tab (processing, failed, needs review); optional “re-extract” that replaces stale text safely.
- **Quality guardrails**: Length limits, language handling, and failure modes that do not silently empty content.

## Out of scope (v1)

- Downloading or storing full video files (focus on text/metadata).
- Non-YouTube video providers (unless trivial extension of the same pipeline).

## Open Questions

- **Worker vs dashboard**: Where does long-running fetch/transcribe run (Worker cron, queue, edge limits)?
- **Cost**: YouTube Data API / third-party transcript API quotas vs manual upload of transcripts.
- **Privacy**: Only process URLs the user explicitly added as sources.

## Prerequisites

- Existing growing sources + knowledge tables and UI (Phase 5–7 baseline).

## Related later phase

**Phase 10** ([Learning Agent Specialization](../10-learning-agents/SCOPE.md)) builds per-topic agents on top of a stronger knowledge base; Phase 09 does not include agent behavior—only ingestion and UX for YouTube → knowledge.
