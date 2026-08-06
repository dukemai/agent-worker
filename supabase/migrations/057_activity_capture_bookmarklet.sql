CREATE TABLE IF NOT EXISTS public.activity_capture_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_domain TEXT NOT NULL,
  path_pattern TEXT NOT NULL DEFAULT '/',
  name TEXT NOT NULL,
  capture_mode TEXT NOT NULL DEFAULT 'generic',
  content_selector TEXT,
  remove_selectors TEXT[] NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT activity_capture_templates_mode_check CHECK (
    capture_mode IN ('single_activity', 'activity_list', 'season_overview', 'article', 'generic')
  ),
  CONSTRAINT activity_capture_templates_domain_path_unique UNIQUE (source_domain, path_pattern)
);

CREATE INDEX IF NOT EXISTS activity_capture_templates_match_idx
ON public.activity_capture_templates(source_domain, enabled, path_pattern);

DROP TRIGGER IF EXISTS trigger_activity_capture_templates_updated_at ON public.activity_capture_templates;
CREATE TRIGGER trigger_activity_capture_templates_updated_at
  BEFORE UPDATE ON public.activity_capture_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_trip_ops_updated_at();

ALTER TABLE public.activity_capture_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated full access" ON public.activity_capture_templates;
CREATE POLICY "Authenticated full access"
ON public.activity_capture_templates
FOR ALL TO authenticated
USING (true) WITH CHECK (true);

ALTER TABLE public.activity_sources
ADD COLUMN IF NOT EXISTS capture_html TEXT,
ADD COLUMN IF NOT EXISTS capture_metadata JSONB,
ADD COLUMN IF NOT EXISTS capture_template_id UUID REFERENCES public.activity_capture_templates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS capture_template_version INT;

INSERT INTO public.activity_capture_templates (
  source_domain, path_pattern, name, capture_mode, content_selector, remove_selectors
)
VALUES
  ('sundbyberg.se', '/arkiv/evenemang-och-aktiviteter', 'Sundbyberg event archive', 'activity_list', 'main', ARRAY['nav', 'aside', 'footer']),
  ('sundbyberg.se', '/uppleva-och-gora/ung-i-sundbyberg/lovaktiviteter', 'Sundbyberg holiday activities', 'season_overview', 'main', ARRAY['nav', 'aside', 'footer'])
ON CONFLICT (source_domain, path_pattern) DO NOTHING;
