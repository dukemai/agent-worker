# Phase 2: Intelligence & Persistence — Scope

**Status**: done

## Goal

Add AI-powered task extraction using Gemini 2.5 Flash and persist classified tasks to Supabase bucket tables.

## Deliverables

- `@google/generative-ai` SDK integration in Worker
- Master system prompt for task extraction with dad-specific rules
- JSON mode enforcement (`response_mime_type: "application/json"`)
- Temporal resolution (relative dates → absolute using injected current date)
- Supabase client wired into Worker for task insertion
- Bucket assignment: AI classifies tasks into today/this_week/later

## Out of Scope

- Dashboard UI (Phase 3)
- Daily digest (Phase 4)
