-- Mark whether a source is YouTube video or blog/article.
ALTER TABLE growing_sources
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'youtube';

COMMENT ON COLUMN growing_sources.source_type IS 'Type of source (e.g. youtube, blog).';

