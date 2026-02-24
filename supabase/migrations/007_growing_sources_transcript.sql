-- Add transcript column for manually pasted captions (e.g. from notegpt.io).
-- Extraction uses only this; no server-side YouTube transcript fetch.
ALTER TABLE growing_sources
ADD COLUMN IF NOT EXISTS transcript TEXT;

COMMENT ON COLUMN growing_sources.transcript IS 'Manually pasted transcript; required before extract. Get from e.g. https://notegpt.io/';
