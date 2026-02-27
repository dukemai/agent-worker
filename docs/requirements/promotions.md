# Promotion Filtering

## Overview

Emails from retailers (XXL, Clas Ohlson, Rusta, ICA) are analyzed for deals. Matched against `family_context` interests.

## Flow

1. Ingestion detects promotion-type emails
2. Extracted deal summary and link stored in task metadata
3. Daily digest includes matched promotions with link

## Data

Promotions are `tasks` with `metadata.email_type = "promotion"`, `metadata.store`, `metadata.deal_summary`, `metadata.store_link`.

## Related

- [Ingestion](ingestion.md) — extraction
- [Daily Digest](daily-digest.md) — Deals for You section
