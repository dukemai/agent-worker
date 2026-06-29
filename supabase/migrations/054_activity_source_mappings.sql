CREATE TABLE IF NOT EXISTS public.activity_source_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_domain TEXT NOT NULL UNIQUE,
  source_name TEXT,
  source_category TEXT NOT NULL DEFAULT 'unknown',
  source_scope TEXT NOT NULL DEFAULT 'unknown',
  source_trust TEXT NOT NULL DEFAULT 'unknown',
  source_language TEXT NOT NULL DEFAULT 'unknown',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT activity_source_mappings_category_check CHECK (
    source_category IN ('official_city', 'municipality', 'museum', 'library', 'event_platform', 'venue', 'blog', 'community', 'unknown')
  ),
  CONSTRAINT activity_source_mappings_trust_check CHECK (source_trust IN ('official', 'partner', 'community', 'unknown')),
  CONSTRAINT activity_source_mappings_language_check CHECK (source_language IN ('sv', 'en', 'mixed', 'unknown')),
  CONSTRAINT activity_source_mappings_domain_check CHECK (source_domain = lower(source_domain) AND source_domain NOT LIKE 'www.%')
);

CREATE INDEX IF NOT EXISTS activity_source_mappings_trust_category_idx
ON public.activity_source_mappings(source_trust, source_category, source_scope);

DROP TRIGGER IF EXISTS trigger_activity_source_mappings_updated_at ON public.activity_source_mappings;
CREATE TRIGGER trigger_activity_source_mappings_updated_at
  BEFORE UPDATE ON public.activity_source_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_trip_ops_updated_at();

ALTER TABLE public.activity_source_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated full access" ON public.activity_source_mappings;
CREATE POLICY "Authenticated full access"
ON public.activity_source_mappings
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

INSERT INTO public.activity_source_mappings (
  source_domain,
  source_name,
  source_category,
  source_scope,
  source_trust,
  source_language
)
VALUES
  ('visitstockholm.se', 'Visit Stockholm', 'official_city', 'stockholm_city', 'official', 'mixed'),
  ('upplevjarfalla.se', 'Upplev Järfälla', 'municipality', 'jarfalla', 'official', 'sv')
ON CONFLICT (source_domain) DO UPDATE
SET
  source_name = EXCLUDED.source_name,
  source_category = EXCLUDED.source_category,
  source_scope = EXCLUDED.source_scope,
  source_trust = EXCLUDED.source_trust,
  source_language = EXCLUDED.source_language;
