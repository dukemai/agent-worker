-- ISO week number (1–53, UTC) per matched promo row; aligns with growing_suggestions_log.week_number semantics.

ALTER TABLE promo_match_items
  ADD COLUMN IF NOT EXISTS week_number INT;

UPDATE promo_match_items AS i
SET week_number = EXTRACT(WEEK FROM r.created_at)::INT
FROM promo_match_runs AS r
WHERE i.run_id = r.id
  AND i.week_number IS NULL;

ALTER TABLE promo_match_items
  ALTER COLUMN week_number SET NOT NULL;

CREATE INDEX IF NOT EXISTS promo_match_items_week_number_idx ON promo_match_items (week_number);
