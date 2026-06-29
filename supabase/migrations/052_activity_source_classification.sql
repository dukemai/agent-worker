ALTER TABLE public.activity_sources
ADD COLUMN IF NOT EXISTS source_domain TEXT,
ADD COLUMN IF NOT EXISTS source_name TEXT,
ADD COLUMN IF NOT EXISTS source_category TEXT NOT NULL DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS source_scope TEXT NOT NULL DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS source_trust TEXT NOT NULL DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS source_language TEXT NOT NULL DEFAULT 'unknown';

ALTER TABLE public.activity_sources
DROP CONSTRAINT IF EXISTS activity_sources_category_check;
ALTER TABLE public.activity_sources
ADD CONSTRAINT activity_sources_category_check
CHECK (source_category IN ('official_city', 'municipality', 'museum', 'library', 'event_platform', 'venue', 'blog', 'community', 'unknown'));

ALTER TABLE public.activity_sources
DROP CONSTRAINT IF EXISTS activity_sources_trust_check;
ALTER TABLE public.activity_sources
ADD CONSTRAINT activity_sources_trust_check
CHECK (source_trust IN ('official', 'partner', 'community', 'unknown'));

CREATE INDEX IF NOT EXISTS activity_sources_classification_idx
ON public.activity_sources(source_trust, source_category, source_scope);

UPDATE public.activity_sources
SET
  source_domain = 'visitstockholm.se',
  source_name = 'Visit Stockholm',
  source_category = 'official_city',
  source_scope = 'stockholm_city',
  source_trust = 'official',
  source_language = 'mixed'
WHERE source_url ILIKE '%visitstockholm.se%';

UPDATE public.activity_sources
SET
  source_domain = 'upplevjarfalla.se',
  source_name = 'Upplev Järfälla',
  source_category = 'municipality',
  source_scope = 'jarfalla',
  source_trust = 'official',
  source_language = 'sv'
WHERE source_url ILIKE '%upplevjarfalla.se%';

