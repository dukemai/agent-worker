-- Add description for video metadata (e.g. from Fetch video info).
ALTER TABLE growing_sources
ADD COLUMN IF NOT EXISTS description TEXT;
