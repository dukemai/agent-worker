-- Add direct link from tasks to growing_windows for better filtering and integrity.
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS window_id UUID REFERENCES growing_windows(id) ON DELETE SET NULL;

-- Backfill existing tasks that have window_id in metadata
UPDATE tasks
SET window_id = (metadata->>'window_id')::UUID
WHERE metadata->>'window_id' IS NOT NULL;

COMMENT ON COLUMN tasks.window_id IS 'Reference to the growing window that triggered this task.';
