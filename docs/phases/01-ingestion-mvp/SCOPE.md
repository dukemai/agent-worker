# Phase 1: Ingestion MVP — Scope

**Status**: done

## Goal

Receive emails via Cloudflare Email Routing, parse MIME content, and store raw tasks in Supabase.

## Deliverables

- Cloudflare Worker with `email` and `fetch` handlers
- Email routing from Gmail → Cloudflare verified
- MIME parsing via `postal-mime`
- Local debugging workflow (`wrangler tail`, `curl`, fixture files)

## Out of Scope

- AI classification (Phase 2)
- Dashboard (Phase 3)
- Bucket assignment logic (defaults all to `later_tasks`)
