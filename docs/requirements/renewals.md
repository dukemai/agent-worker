# Renewal Reminders

## Overview

Track passport, subscription, membership, permit, insurance expiration. Stored as `tasks` with `metadata.item_type = "renewal"`.

## Model

- **Dual-date**: `expires_on` and `renew_by` (computed from lead days)
- **Escalation**: T-30 plan, T-14 prepare, T-7 urgent, T-1 critical
- **Recurrence**: Auto-create next reminder on completion (yearly/monthly)

## Data

No separate table. Renewals are `tasks` with `metadata.item_type = "renewal"`.

## Related

- [Dashboard](dashboard.md) — renewal section
- [Daily Digest](daily-digest.md) — upcoming renewals section
