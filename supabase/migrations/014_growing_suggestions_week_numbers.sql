ALTER TABLE growing_suggestions_log
ADD COLUMN IF NOT EXISTS week_number INT;

UPDATE growing_suggestions_log
SET week_number = EXTRACT(WEEK FROM week_start_date)::INT
WHERE week_start_date IS NOT NULL
  AND week_number IS NULL;

DROP INDEX IF EXISTS growing_suggestions_unique_week_window;
DROP INDEX IF EXISTS growing_suggestions_unique_week_numbers_window;

ALTER TABLE growing_suggestions_log
DROP COLUMN IF EXISTS week_numbers;

ALTER TABLE growing_suggestions_log
ALTER COLUMN week_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS growing_suggestions_unique_week_number_window
ON growing_suggestions_log (week_number, window_id);

ALTER TABLE growing_suggestions_log
DROP COLUMN IF EXISTS week_start_date;
