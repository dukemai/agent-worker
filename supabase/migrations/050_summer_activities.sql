CREATE TABLE IF NOT EXISTS public.activity_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  source_url TEXT,
  raw_markdown TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'queued',
  error_message TEXT,
  activities_extracted INT NOT NULL DEFAULT 0,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT activity_sources_status_check CHECK (status IN ('queued', 'processing', 'processed', 'failed'))
);

CREATE TABLE IF NOT EXISTS public.local_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES public.activity_sources(id) ON DELETE SET NULL,
  activity_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  activity_type TEXT NOT NULL DEFAULT 'other',
  age_min INT,
  age_max INT,
  age_notes TEXT,
  address TEXT,
  area TEXT,
  location_url TEXT,
  cost_level TEXT NOT NULL DEFAULT 'unknown',
  cost_notes TEXT,
  booking_required BOOLEAN NOT NULL DEFAULT false,
  booking_notes TEXT,
  weather_fit TEXT NOT NULL DEFAULT 'mixed',
  energy_level TEXT NOT NULL DEFAULT 'medium',
  usual_duration_minutes INT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  is_evergreen BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT local_activities_type_check CHECK (
    activity_type IN ('museum', 'library', 'playground', 'sport', 'nature', 'swimming', 'workshop', 'event', 'food', 'other')
  ),
  CONSTRAINT local_activities_cost_check CHECK (cost_level IN ('free', 'low', 'medium', 'high', 'unknown')),
  CONSTRAINT local_activities_weather_check CHECK (weather_fit IN ('indoor', 'outdoor', 'mixed')),
  CONSTRAINT local_activities_energy_check CHECK (energy_level IN ('low', 'medium', 'high')),
  CONSTRAINT local_activities_status_check CHECK (status IN ('active', 'dismissed', 'archived'))
);

CREATE TABLE IF NOT EXISTS public.seasonal_activity_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES public.activity_sources(id) ON DELETE SET NULL,
  activity_id UUID REFERENCES public.local_activities(id) ON DELETE SET NULL,
  instance_key TEXT NOT NULL,
  season TEXT NOT NULL DEFAULT 'summer_2026',
  title TEXT NOT NULL,
  description TEXT,
  valid_from DATE,
  valid_until DATE,
  occurrence_dates DATE[] NOT NULL DEFAULT '{}',
  time_text TEXT,
  address TEXT,
  area TEXT,
  cost_level TEXT NOT NULL DEFAULT 'unknown',
  cost_notes TEXT,
  booking_required BOOLEAN NOT NULL DEFAULT false,
  booking_deadline DATE,
  booking_url TEXT,
  weather_fit TEXT NOT NULL DEFAULT 'mixed',
  energy_level TEXT NOT NULL DEFAULT 'medium',
  age_min INT,
  age_max INT,
  age_notes TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  extraction_confidence TEXT NOT NULL DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT seasonal_activity_instances_unique_source_key UNIQUE (source_id, instance_key),
  CONSTRAINT seasonal_activity_instances_cost_check CHECK (cost_level IN ('free', 'low', 'medium', 'high', 'unknown')),
  CONSTRAINT seasonal_activity_instances_weather_check CHECK (weather_fit IN ('indoor', 'outdoor', 'mixed')),
  CONSTRAINT seasonal_activity_instances_energy_check CHECK (energy_level IN ('low', 'medium', 'high')),
  CONSTRAINT seasonal_activity_instances_status_check CHECK (status IN ('active', 'dismissed', 'expired', 'archived')),
  CONSTRAINT seasonal_activity_instances_confidence_check CHECK (extraction_confidence IN ('low', 'medium', 'high'))
);

CREATE INDEX IF NOT EXISTS activity_sources_status_created_idx
ON public.activity_sources(status, created_at DESC);

CREATE INDEX IF NOT EXISTS local_activities_status_type_idx
ON public.local_activities(status, activity_type, area);

CREATE INDEX IF NOT EXISTS seasonal_activity_instances_status_valid_idx
ON public.seasonal_activity_instances(status, valid_from, valid_until);

CREATE INDEX IF NOT EXISTS seasonal_activity_instances_booking_idx
ON public.seasonal_activity_instances(status, booking_required, booking_deadline);

DROP TRIGGER IF EXISTS trigger_activity_sources_updated_at ON public.activity_sources;
CREATE TRIGGER trigger_activity_sources_updated_at
  BEFORE UPDATE ON public.activity_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_trip_ops_updated_at();

DROP TRIGGER IF EXISTS trigger_local_activities_updated_at ON public.local_activities;
CREATE TRIGGER trigger_local_activities_updated_at
  BEFORE UPDATE ON public.local_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_trip_ops_updated_at();

DROP TRIGGER IF EXISTS trigger_seasonal_activity_instances_updated_at ON public.seasonal_activity_instances;
CREATE TRIGGER trigger_seasonal_activity_instances_updated_at
  BEFORE UPDATE ON public.seasonal_activity_instances
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_trip_ops_updated_at();

ALTER TABLE public.activity_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasonal_activity_instances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated full access" ON public.activity_sources;
CREATE POLICY "Authenticated full access"
ON public.activity_sources
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access" ON public.local_activities;
CREATE POLICY "Authenticated full access"
ON public.local_activities
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access" ON public.seasonal_activity_instances;
CREATE POLICY "Authenticated full access"
ON public.seasonal_activity_instances
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
