-- Store ISO week on each import run (same semantics as promo_match_items.week_number; easier for UI/API without scanning items).

ALTER TABLE promo_match_runs
  ADD COLUMN IF NOT EXISTS week_number INT;

-- Backfill from child items where present (same value per row for a given import).
UPDATE promo_match_runs r
SET week_number = sub.w
FROM (
  SELECT run_id, MIN(week_number) AS w
  FROM promo_match_items
  GROUP BY run_id
) sub
WHERE r.id = sub.run_id;

-- Runs with no items: derive ISO week from created_at (UTC).
UPDATE promo_match_runs r
SET week_number = (to_char(r.created_at AT TIME ZONE 'UTC', 'IW'))::int
WHERE r.week_number IS NULL;

CREATE INDEX IF NOT EXISTS promo_match_runs_week_number_idx ON promo_match_runs (week_number);
