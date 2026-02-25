-- Add verified flag to growing_windows (source_id already exists from 006)
ALTER TABLE growing_windows
ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN growing_windows.verified IS 'Whether this window has been verified by the user.';
COMMENT ON COLUMN growing_windows.source_id IS 'Source video this actionable tip was extracted from.';
