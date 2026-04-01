-- Ensure one suggestion per (week_number, window_id)
-- 1) Remove historical duplicates before adding uniqueness
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY week_number, window_id
      ORDER BY updated_at DESC, created_at DESC, id DESC
    ) AS rn
  FROM growing_suggestions_log
  WHERE week_number IS NOT NULL
    AND window_id IS NOT NULL
)
DELETE FROM growing_suggestions_log
WHERE id IN (
  SELECT id
  FROM ranked
  WHERE rn > 1
);

-- 2) Enforce composite uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS growing_suggestions_unique_week_number_window
ON growing_suggestions_log (week_number, window_id);
