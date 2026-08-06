-- Phase 13.2: configurable planning days and growing-season digest behavior.

CREATE TABLE IF NOT EXISTS public.digest_preferences (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  red_day_lead_days INT NOT NULL DEFAULT 21 CHECK (red_day_lead_days BETWEEN 1 AND 90),
  high_growth_start TEXT NOT NULL DEFAULT '04-01' CHECK (high_growth_start ~ '^\d{2}-\d{2}$'),
  high_growth_end TEXT NOT NULL DEFAULT '07-31' CHECK (high_growth_end ~ '^\d{2}-\d{2}$'),
  harvest_start TEXT NOT NULL DEFAULT '08-01' CHECK (harvest_start ~ '^\d{2}-\d{2}$'),
  harvest_end TEXT NOT NULL DEFAULT '10-15' CHECK (harvest_end ~ '^\d{2}-\d{2}$'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.digest_preferences (singleton)
VALUES (TRUE)
ON CONFLICT (singleton) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.planning_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'family' CHECK (category IN ('red_day', 'school', 'family', 'closure', 'other')),
  starts_on DATE NOT NULL,
  ends_on DATE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_on IS NULL OR ends_on >= starts_on),
  CHECK (category <> 'red_day' OR ends_on IS NULL),
  UNIQUE (title, category, starts_on)
);

CREATE INDEX IF NOT EXISTS planning_days_enabled_start_idx
ON public.planning_days(enabled, starts_on);

DROP TRIGGER IF EXISTS trigger_digest_preferences_updated_at ON public.digest_preferences;
CREATE TRIGGER trigger_digest_preferences_updated_at
  BEFORE UPDATE ON public.digest_preferences
  FOR EACH ROW EXECUTE FUNCTION public.handle_trip_ops_updated_at();

DROP TRIGGER IF EXISTS trigger_planning_days_updated_at ON public.planning_days;
CREATE TRIGGER trigger_planning_days_updated_at
  BEFORE UPDATE ON public.planning_days
  FOR EACH ROW EXECUTE FUNCTION public.handle_trip_ops_updated_at();

ALTER TABLE public.digest_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated full access" ON public.digest_preferences;
CREATE POLICY "Authenticated full access" ON public.digest_preferences
FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Authenticated full access" ON public.planning_days;
CREATE POLICY "Authenticated full access" ON public.planning_days
FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

INSERT INTO public.planning_days (title, category, starts_on)
VALUES
  ('Allhelgonadagen', 'red_day', '2026-10-31'),
  ('Julafton', 'red_day', '2026-12-24'),
  ('Juldagen', 'red_day', '2026-12-25'),
  ('Annandag jul', 'red_day', '2026-12-26'),
  ('Nyårsafton', 'red_day', '2026-12-31'),
  ('Nyårsdagen', 'red_day', '2027-01-01')
ON CONFLICT DO NOTHING;
