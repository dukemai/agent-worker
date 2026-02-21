# Phase 1: Ingestion MVP — Retrospective

## What went well

- Cloudflare Workers email handling worked out of the box after DNS setup.
- `postal-mime` handles messy school emails (mixed Swedish/English, HTML-heavy) reliably.
- Fixture-based testing (`fixtures/emails/*.json`) made local iteration fast without needing live email traffic.

## What could be better

- Worker type definitions required manual regeneration with `wrangler types`.
- No automated tests yet — relying on manual fixture replay.

## Lessons for future phases

- Always create test fixtures alongside new email source integrations.
- Keep the worker stateless — all persistence via Supabase.
